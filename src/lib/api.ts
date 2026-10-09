import {
  AnalyticsData,
  Complaint,
  ComplaintCategory,
  ComplaintHistoryEntry,
  OfficialNote,
  PriorityLevel,
  User,
} from '../types';

let currentUserId = localStorage.getItem('civicpulse_user_id') || 'user-citizen-1';

export function setApiUserId(userId: string) {
  currentUserId = userId;
  localStorage.setItem('civicpulse_user_id', userId);
}

export function getApiUserId(): string {
  return currentUserId;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-demo-user-id': currentUserId,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  async getHealth(): Promise<{ status: string }> {
    return request('/health');
  },

  async getUsers(): Promise<{ users: User[] }> {
    return request('/auth/users');
  },

  async getMe(): Promise<{ user: User }> {
    return request('/auth/me');
  },

  async getComplaints(filters?: {
    category?: string;
    status?: string;
    priority?: string;
    department?: string;
    locality?: string;
    search?: string;
    reporterId?: string;
  }): Promise<{ complaints: Complaint[]; count: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val && val !== 'all') params.append(key, val);
      });
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return request(`/complaints${queryString}`);
  },

  async getComplaint(id: string): Promise<{
    complaint: Complaint;
    history: ComplaintHistoryEntry[];
    notes: OfficialNote[];
  }> {
    return request(`/complaints/${id}`);
  },

  async trackComplaint(reference: string): Promise<{
    complaint: Complaint;
    history: ComplaintHistoryEntry[];
    notes: OfficialNote[];
  }> {
    return request(`/complaints/track/${encodeURIComponent(reference.trim())}`);
  },

  async createComplaint(payload: {
    title: string;
    description: string;
    category: ComplaintCategory;
    address: string;
    locality?: string;
    latitude?: number | null;
    longitude?: number | null;
    imageUrl?: string;
    safetyRisk: boolean;
  }): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(
    id: string,
    payload: {
      status: string;
      publicUpdate?: string;
      resolutionSummary?: string;
      afterImageUrl?: string;
    }
  ): Promise<{ success: boolean; complaint: Complaint; historyEntry: ComplaintHistoryEntry; message: string }> {
    return request(`/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updatePriority(
    id: string,
    payload: {
      priority: PriorityLevel;
      overrideReason: string;
    }
  ): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request(`/complaints/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async updateAssignment(
    id: string,
    payload: {
      department: string;
      note?: string;
    }
  ): Promise<{ success: boolean; complaint: Complaint; message: string }> {
    return request(`/complaints/${id}/assignment`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async voteComplaint(id: string): Promise<{ success: boolean; votesCount: number; message: string }> {
    return request(`/complaints/${id}/votes`, {
      method: 'POST',
    });
  },

  async addNote(
    id: string,
    payload: {
      note: string;
      visibility: 'internal' | 'public';
    }
  ): Promise<{ success: boolean; note: OfficialNote }> {
    return request(`/complaints/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAnalytics(): Promise<AnalyticsData> {
    return request('/analytics');
  },

  async resetDemoData(): Promise<{ success: boolean; message: string; complaintsCount: number }> {
    return request('/reset-demo-data', {
      method: 'POST',
    });
  },
};
