import express, { Request, Response, Router } from 'express';
import { db, User } from './db.ts';
import { calculateSmartPriority, ComplaintCategory, PriorityLevel } from './priorityEngine.ts';

export const apiRouter = Router();

// Middleware to resolve active session user from header or default demo user
function getActiveUser(req: Request): User {
  const userId = req.headers['x-demo-user-id'] as string;
  if (userId) {
    const found = db.getUserById(userId);
    if (found) return found;
  }
  // Fallback to Citizen Aisha Chen
  const defaultCitizen = db.getUserById('user-citizen-1');
  return (
    defaultCitizen || {
      id: 'user-citizen-1',
      name: 'Aisha Chen',
      email: 'aisha.chen@citizen.demo',
      role: 'citizen',
      createdAt: new Date().toISOString(),
    }
  );
}

// Health check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'CivicPulse Municipal Platform',
    version: '1.0.0-hackathon',
  });
});

// Auth & Demo user switcher
apiRouter.get('/auth/users', (_req: Request, res: Response) => {
  const users = db.getUsers();
  res.json({ users });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getActiveUser(req);
  res.json({ user });
});

// Complaints list with search & filters
apiRouter.get('/complaints', (req: Request, res: Response) => {
  try {
    const { category, status, priority, department, locality, search, reporterId } = req.query;
    const complaints = db.getComplaints({
      category: category as string,
      status: status as string,
      priority: priority as string,
      department: department as string,
      locality: locality as string,
      search: search as string,
      reporterId: reporterId as string,
    });

    const activeUser = getActiveUser(req);
    // Enrich with whether active user voted
    const enriched = complaints.map((c) => ({
      ...c,
      hasUserVoted: db.hasUserVoted(c.id, activeUser.id),
    }));

    res.json({ complaints: enriched, count: enriched.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve complaints', details: err.message });
  }
});

// Track complaint by reference ID (e.g. CP-2026-001)
apiRouter.get('/complaints/track/:reference', (req: Request, res: Response) => {
  const { reference } = req.params;
  const complaint = db.getComplaintById(reference);

  if (!complaint) {
    return res.status(404).json({
      error: 'Complaint not found',
      message: `No civic complaint found with reference or ID "${reference}". Please verify the code (e.g., CP-2026-001).`,
    });
  }

  const history = db.getComplaintHistory(complaint.id);
  const activeUser = getActiveUser(req);
  const isOfficial = activeUser.role === 'official' || activeUser.role === 'admin';
  const notes = db.getComplaintNotes(complaint.id, isOfficial);

  res.json({
    complaint: {
      ...complaint,
      hasUserVoted: db.hasUserVoted(complaint.id, activeUser.id),
    },
    history,
    notes,
  });
});

// Get complaint by ID
apiRouter.get('/complaints/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const complaint = db.getComplaintById(id);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const history = db.getComplaintHistory(complaint.id);
  const activeUser = getActiveUser(req);
  const isOfficial = activeUser.role === 'official' || activeUser.role === 'admin';
  const notes = db.getComplaintNotes(complaint.id, isOfficial);

  res.json({
    complaint: {
      ...complaint,
      hasUserVoted: db.hasUserVoted(complaint.id, activeUser.id),
    },
    history,
    notes,
  });
});

// Create new civic complaint
apiRouter.post('/complaints', (req: Request, res: Response) => {
  try {
    const { title, description, category, address, locality, latitude, longitude, imageUrl, safetyRisk } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      return res.status(400).json({ error: 'Title is required and must be at least 5 characters.' });
    }
    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ error: 'Detailed description is required (at least 10 characters).' });
    }
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Valid complaint category must be selected.' });
    }
    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      return res.status(400).json({ error: 'Location address or landmark is required.' });
    }

    const activeUser = getActiveUser(req);

    const created = db.createComplaint({
      title,
      description,
      category: category as ComplaintCategory,
      address,
      locality: locality || 'Metro District',
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      imageUrl: imageUrl || undefined,
      safetyRisk: Boolean(safetyRisk),
      reporterId: activeUser.id,
      reporterName: activeUser.name,
    });

    res.status(201).json({
      success: true,
      complaint: created,
      message: `Civic complaint successfully registered with Reference ID ${created.reference}.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record complaint', details: err.message });
  }
});

// Update complaint status (Official only)
apiRouter.patch('/complaints/:id/status', (req: Request, res: Response) => {
  const activeUser = getActiveUser(req);
  if (activeUser.role !== 'official' && activeUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Permission Denied',
      message: 'Only authorized municipal officials can update complaint resolution status.',
    });
  }

  const { id } = req.params;
  const { status, publicUpdate, resolutionSummary, afterImageUrl } = req.body;

  const validStatuses = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved', 'Rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const result = db.updateStatus({
    complaintId: id,
    newStatus: status,
    actor: activeUser,
    publicUpdate,
    resolutionSummary,
    afterImageUrl,
  });

  if (!result) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  res.json({
    success: true,
    complaint: result.complaint,
    historyEntry: result.historyEntry,
    message: `Status updated to "${status}".`,
  });
});

// Update priority override (Official only)
apiRouter.patch('/complaints/:id/priority', (req: Request, res: Response) => {
  const activeUser = getActiveUser(req);
  if (activeUser.role !== 'official' && activeUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Permission Denied',
      message: 'Only authorized municipal officials can override complaint priority.',
    });
  }

  const { id } = req.params;
  const { priority, overrideReason } = req.body;

  const validPriorities: PriorityLevel[] = ['Low', 'Medium', 'High', 'Critical'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority level.` });
  }
  if (!overrideReason || typeof overrideReason !== 'string' || overrideReason.trim().length < 5) {
    return res.status(400).json({ error: 'An official justification note is required to override priority.' });
  }

  const updated = db.updatePriority({
    complaintId: id,
    priority,
    overrideReason,
    actor: activeUser,
  });

  if (!updated) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  res.json({
    success: true,
    complaint: updated,
    message: `Priority updated to "${priority}" with official rationale logged.`,
  });
});

// Re-assign department (Official only)
apiRouter.patch('/complaints/:id/assignment', (req: Request, res: Response) => {
  const activeUser = getActiveUser(req);
  if (activeUser.role !== 'official' && activeUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Permission Denied',
      message: 'Only authorized municipal officials can route complaints between departments.',
    });
  }

  const { id } = req.params;
  const { department, note } = req.body;

  if (!department || typeof department !== 'string') {
    return res.status(400).json({ error: 'Target department is required.' });
  }

  const updated = db.updateAssignment({
    complaintId: id,
    department,
    actor: activeUser,
    note,
  });

  if (!updated) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  res.json({
    success: true,
    complaint: updated,
    message: `Assigned department routed to "${department}".`,
  });
});

// Community upvote
apiRouter.post('/complaints/:id/votes', (req: Request, res: Response) => {
  const { id } = req.params;
  const activeUser = getActiveUser(req);

  const result = db.voteComplaint({
    complaintId: id,
    userId: activeUser.id,
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// Get complaint audit history
apiRouter.get('/complaints/:id/history', (req: Request, res: Response) => {
  const { id } = req.params;
  const history = db.getComplaintHistory(id);
  res.json({ history });
});

// Add official note (internal or public)
apiRouter.post('/complaints/:id/notes', (req: Request, res: Response) => {
  const activeUser = getActiveUser(req);
  if (activeUser.role !== 'official' && activeUser.role !== 'admin') {
    return res.status(403).json({
      error: 'Permission Denied',
      message: 'Only authorized municipal officials can post administrative notes.',
    });
  }

  const { id } = req.params;
  const { note, visibility } = req.body;

  if (!note || typeof note !== 'string' || note.trim().length < 3) {
    return res.status(400).json({ error: 'Note text cannot be empty.' });
  }

  const createdNote = db.addOfficialNote({
    complaintId: id,
    author: activeUser,
    note,
    visibility: visibility === 'public' ? 'public' : 'internal',
  });

  res.status(201).json({ success: true, note: createdNote });
});

// Real analytics calculated from persisted database
apiRouter.get('/analytics', (_req: Request, res: Response) => {
  const analytics = db.getAnalytics();
  res.json(analytics);
});

// Reset demo database for live hackathon presentations
apiRouter.post('/reset-demo-data', (_req: Request, res: Response) => {
  const fresh = db.resetToSeed();
  res.json({
    success: true,
    message: 'Demo dataset reset to initial 16 verified complaints, audit history, and demo accounts.',
    complaintsCount: fresh.complaints.length,
  });
});
