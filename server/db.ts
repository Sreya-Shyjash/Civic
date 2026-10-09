import fs from 'fs';
import path from 'path';
import { calculateSmartPriority, ComplaintCategory, PriorityLevel } from './priorityEngine.ts';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'official' | 'admin';
  department?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface ComplaintHistoryEntry {
  id: string;
  complaintId: string;
  previousStatus: string;
  newStatus: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  publicUpdate: string;
  timestamp: string;
}

export interface Vote {
  id: string;
  complaintId: string;
  userId: string;
  timestamp: string;
}

export interface OfficialNote {
  id: string;
  complaintId: string;
  authorId: string;
  authorName: string;
  department: string;
  note: string;
  visibility: 'internal' | 'public';
  timestamp: string;
}

export interface Complaint {
  id: string;
  reference: string; // e.g. CP-2026-001
  title: string;
  description: string;
  category: ComplaintCategory;
  address: string;
  locality: string;
  latitude: number | null;
  longitude: number | null;
  imageUrl?: string;
  afterImageUrl?: string;
  status: 'Submitted' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Rejected';
  priority: PriorityLevel;
  systemRecommendedPriority: PriorityLevel;
  priorityRationale: string[];
  safetyRisk: boolean;
  assignedDepartment: string;
  reporterId: string;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolutionSummary?: string | null;
  votesCount: number;
  slaHours: number;
}

export interface DatabaseSchema {
  users: User[];
  complaints: Complaint[];
  complaint_history: ComplaintHistoryEntry[];
  votes: Vote[];
  official_notes: OfficialNote[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'civicpulse_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DEPARTMENTS = [
  'Public Works & Roads',
  'Sanitation & Waste Management',
  'Drainage & Flood Control',
  'Electrical & Street Lighting',
  'Water Supply & Sanitation Board',
  'Public Safety & Urban Infrastructure',
];

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  road_damage: 'Road & Pavement Damage',
  waste_management: 'Waste Management & Sanitation',
  drainage: 'Drainage & Stormwater',
  streetlights: 'Streetlights & Electrical',
  water_supply: 'Water Supply & Pipelines',
  public_safety: 'Public Safety Infrastructure',
};

export const INITIAL_USERS: User[] = [
  {
    id: 'user-citizen-1',
    name: 'Aisha Chen',
    email: 'aisha.chen@citizen.demo',
    role: 'citizen',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'user-citizen-2',
    name: 'David Patel',
    email: 'david.patel@citizen.demo',
    role: 'citizen',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-09-05T10:30:00Z',
  },
  {
    id: 'user-official-1',
    name: 'Director Marcus Vance',
    email: 'marcus.vance@gov.demo',
    role: 'official',
    department: 'Public Works & Roads',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-08-15T09:00:00Z',
  },
  {
    id: 'user-official-2',
    name: 'Inspector Sarah Jenkins',
    email: 'sarah.jenkins@gov.demo',
    role: 'official',
    department: 'Sanitation & Waste Management',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-08-15T09:00:00Z',
  },
  {
    id: 'user-official-3',
    name: 'Eng. Roberto Silva',
    email: 'roberto.silva@gov.demo',
    role: 'official',
    department: 'Water Supply & Sanitation Board',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    createdAt: '2026-08-20T09:00:00Z',
  },
];

// Seed realistic complaints across metropolitan Metro District
function generateSeedComplaints(): { complaints: Complaint[]; history: ComplaintHistoryEntry[]; notes: OfficialNote[]; votes: Vote[] } {
  const seedComplaints: Complaint[] = [
    {
      id: 'cmp-001',
      reference: 'CP-2026-001',
      title: 'Deep Hazardous Pothole on 4th Avenue Near Middle School',
      description: 'A 2-foot wide, 6-inch deep pothole in the northbound lane right outside Oakwood Middle School. School buses and cyclists swerve into oncoming traffic to avoid it.',
      category: 'road_damage',
      address: '742 4th Avenue, near Oakwood Middle School',
      locality: 'Oakwood North',
      latitude: 37.7749,
      longitude: -122.4194,
      imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'In Progress',
      priority: 'Critical',
      systemRecommendedPriority: 'Critical',
      priorityRationale: [
        'Category Baseline: Roadway damage poses vehicular collision and transit hazard (+25 pts)',
        'Safety Flag: Reporter flagged immediate risk of injury or public danger (+35 pts)',
        'Community Impact: High citizen validation (14 endorsements, +18 pts)',
      ],
      safetyRisk: true,
      assignedDepartment: 'Public Works & Roads',
      reporterId: 'user-citizen-1',
      reporterName: 'Aisha Chen',
      createdAt: '2026-10-04T09:15:00Z',
      updatedAt: '2026-10-05T11:30:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 14,
      slaHours: 24,
    },
    {
      id: 'cmp-002',
      reference: 'CP-2026-002',
      title: 'Overflowing Commercial Dumpsters Spilling into Market Walkway',
      description: 'Municipal waste containers at Central Produce Market have not been cleared for four days. Rotten produce and litter are attracting rodents and blocking the pedestrian thoroughfare.',
      category: 'waste_management',
      address: '118 Mercado Plaza, Central Market District',
      locality: 'Downtown Commercial',
      latitude: 37.7833,
      longitude: -122.4167,
      imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
      status: 'Resolved',
      priority: 'High',
      systemRecommendedPriority: 'High',
      priorityRationale: [
        'Category Baseline: Uncollected waste presents vector-borne environmental health hazard (+20 pts)',
        'Community Impact: High citizen validation (19 endorsements, +18 pts)',
        'Staleness Alert: Acknowledged but unresolved for >72 hours (+10 pts)',
      ],
      safetyRisk: false,
      assignedDepartment: 'Sanitation & Waste Management',
      reporterId: 'user-citizen-2',
      reporterName: 'David Patel',
      createdAt: '2026-09-28T14:20:00Z',
      updatedAt: '2026-09-30T16:45:00Z',
      resolvedAt: '2026-09-30T16:45:00Z',
      resolutionSummary: 'Sanitation crew dispatched with high-capacity compactor truck. Commercial dumpster bank cleared and area power-washed with bio-sanitizer.',
      votesCount: 19,
      slaHours: 48,
    },
    {
      id: 'cmp-003',
      reference: 'CP-2026-003',
      title: 'Main Pipeline Rupture Causing Street Flooding & Low Pressure',
      description: 'A pressurized 6-inch municipal water pipe burst under the pavement. Potable water is geysering onto Pine Crest Blvd, reducing water pressure to nearby multi-story residential apartments.',
      category: 'water_supply',
      address: '405 Pine Crest Boulevard at Elm Street',
      locality: 'Highland Park',
      latitude: 37.7650,
      longitude: -122.4350,
      imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'In Progress',
      priority: 'Critical',
      systemRecommendedPriority: 'Critical',
      priorityRationale: [
        'Category Baseline: Clean water supply disruption affects public health & sanitation (+30 pts)',
        'Safety Flag: Reporter flagged immediate risk of injury or public danger (+35 pts)',
        'Community Impact: Exceptional community support (27 citizen endorsements, +25 pts)',
      ],
      safetyRisk: true,
      assignedDepartment: 'Water Supply & Sanitation Board',
      reporterId: 'user-citizen-1',
      reporterName: 'Aisha Chen',
      createdAt: '2026-10-06T07:45:00Z',
      updatedAt: '2026-10-06T09:10:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 27,
      slaHours: 24,
    },
    {
      id: 'cmp-004',
      reference: 'CP-2026-004',
      title: 'Series of 5 Burned-Out Streetlights Along Pedestrian Greenway',
      description: 'Five consecutive light poles along the Maple Grove riverfront walking and cycling path are completely dark. Multiple night commuters and joggers have reported feeling unsafe.',
      category: 'streetlights',
      address: 'Riverfront Greenway between Mile Marker 3 and 4',
      locality: 'Riverfront Corridor',
      latitude: 37.7699,
      longitude: -122.4080,
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'Acknowledged',
      priority: 'Medium',
      systemRecommendedPriority: 'Medium',
      priorityRationale: [
        'Category Baseline: Lighting failures impact nocturnal commuter visibility (+15 pts)',
        'Community Impact: Multiple citizens affected (8 endorsements, +10 pts)',
      ],
      safetyRisk: false,
      assignedDepartment: 'Electrical & Street Lighting',
      reporterId: 'user-citizen-2',
      reporterName: 'David Patel',
      createdAt: '2026-10-05T18:10:00Z',
      updatedAt: '2026-10-06T08:00:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 8,
      slaHours: 72,
    },
    {
      id: 'cmp-005',
      reference: 'CP-2026-005',
      title: 'Blocked Storm Drain Causing Street Inundation During Rain',
      description: 'Stormwater grate is completely choked with tree debris, mud, and street plastic. Even modest rainfall leads to 8 inches of stagnant water backing up across the crosswalk.',
      category: 'drainage',
      address: 'Intersection of Bayview Way & Harbor Lane',
      locality: 'Harbor District',
      latitude: 37.7580,
      longitude: -122.3920,
      imageUrl: 'https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'Submitted',
      priority: 'Medium',
      systemRecommendedPriority: 'Medium',
      priorityRationale: [
        'Category Baseline: Drainage blockage poses flooding and contamination risks (+25 pts)',
        'Community Impact: Multiple citizens affected (5 endorsements, +10 pts)',
      ],
      safetyRisk: false,
      assignedDepartment: 'Drainage & Flood Control',
      reporterId: 'user-citizen-1',
      reporterName: 'Aisha Chen',
      createdAt: '2026-10-07T11:00:00Z',
      updatedAt: '2026-10-07T11:00:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 5,
      slaHours: 72,
    },
    {
      id: 'cmp-006',
      reference: 'CP-2026-006',
      title: 'Damaged Guardrail Along Sharp Curve on Skyline Drive',
      description: 'Vehicle impact from last week fractured the structural steel guardrail overlooking a steep embankment. The barrier is detached and exposes motorists to drop-off hazard.',
      category: 'public_safety',
      address: 'Skyline Drive Curve 14, Westridge Summit',
      locality: 'Westridge',
      latitude: 37.7420,
      longitude: -122.4510,
      imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'Acknowledged',
      priority: 'Critical',
      systemRecommendedPriority: 'Critical',
      priorityRationale: [
        'Category Baseline: Public safety infrastructure carries direct bodily hazard potential (+40 pts)',
        'Safety Flag: Reporter flagged immediate risk of injury or public danger (+35 pts)',
      ],
      safetyRisk: true,
      assignedDepartment: 'Public Safety & Urban Infrastructure',
      reporterId: 'user-citizen-2',
      reporterName: 'David Patel',
      createdAt: '2026-10-06T15:20:00Z',
      updatedAt: '2026-10-07T08:30:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 11,
      slaHours: 24,
    },
    {
      id: 'cmp-007',
      reference: 'CP-2026-007',
      title: 'Broken Traffic Signal Flashing Yellow at Busy Transit Crossroad',
      description: 'The traffic signal controller is stuck in flash mode at the 8th & Grand four-way intersection. High pedestrian traffic and bus routes are experiencing severe bottleneck confusion.',
      category: 'public_safety',
      address: 'Intersection of 8th Street & Grand Avenue',
      locality: 'Downtown Commercial',
      latitude: 37.7810,
      longitude: -122.4090,
      imageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=800&q=80',
      status: 'Resolved',
      priority: 'High',
      systemRecommendedPriority: 'High',
      priorityRationale: [
        'Category Baseline: Public safety infrastructure carries direct bodily hazard potential (+40 pts)',
        'Community Impact: High citizen validation (16 endorsements, +18 pts)',
      ],
      safetyRisk: false,
      assignedDepartment: 'Electrical & Street Lighting',
      reporterId: 'user-citizen-1',
      reporterName: 'Aisha Chen',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-26T14:15:00Z',
      resolvedAt: '2026-09-26T14:15:00Z',
      resolutionSummary: 'Municipal traffic engineering technician replaced faulty relay module and re-synced automated phase timing schedule.',
      votesCount: 16,
      slaHours: 48,
    },
    {
      id: 'cmp-008',
      reference: 'CP-2026-008',
      title: 'Illegal Dumping of Construction Concrete & Debris in Public Alley',
      description: 'Unpermitted contractor dumped two tons of broken masonry, drywall, and nails behind residential properties on 12th St, blocking emergency garage access.',
      category: 'waste_management',
      address: 'Rear alleyway behind 520 12th Street',
      locality: 'Mission Vista',
      latitude: 37.7610,
      longitude: -122.4210,
      imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'Submitted',
      priority: 'Medium',
      systemRecommendedPriority: 'Medium',
      priorityRationale: [
        'Category Baseline: Uncollected waste presents vector-borne environmental health hazard (+20 pts)',
        'Community Impact: Multiple citizens affected (4 endorsements, +10 pts)',
      ],
      safetyRisk: false,
      assignedDepartment: 'Sanitation & Waste Management',
      reporterId: 'user-citizen-2',
      reporterName: 'David Patel',
      createdAt: '2026-10-08T08:15:00Z',
      updatedAt: '2026-10-08T08:15:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 4,
      slaHours: 72,
    },
    {
      id: 'cmp-009',
      reference: 'CP-2026-009',
      title: 'Damaged Sidewalk Slabs Causing Tripping Hazard for Seniors',
      description: 'Tree roots have heaved two large concrete sidewalk slabs up by 4 inches directly outside Sunset Senior Living center.',
      category: 'road_damage',
      address: '1430 Sunset Boulevard, Sunset District',
      locality: 'Sunset Heights',
      latitude: 37.7540,
      longitude: -122.4780,
      imageUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'In Progress',
      priority: 'High',
      systemRecommendedPriority: 'High',
      priorityRationale: [
        'Category Baseline: Roadway damage poses vehicular collision and transit hazard (+25 pts)',
        'Safety Flag: Reporter flagged immediate risk of injury or public danger (+35 pts)',
      ],
      safetyRisk: true,
      assignedDepartment: 'Public Works & Roads',
      reporterId: 'user-citizen-1',
      reporterName: 'Aisha Chen',
      createdAt: '2026-10-02T13:40:00Z',
      updatedAt: '2026-10-04T10:00:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 12,
      slaHours: 48,
    },
    {
      id: 'cmp-010',
      reference: 'CP-2026-010',
      title: 'Faded Pedestrian Zebra Crosswalk at High-Volume School Crossing',
      description: 'Zebra stripes at Fremont & Elm are 90% worn off due to winter traffic. Drivers do not yield to crossing children.',
      category: 'road_damage',
      address: 'Intersection of Fremont Avenue & Elm Street',
      locality: 'Oakwood North',
      latitude: 37.7710,
      longitude: -122.4280,
      imageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
      status: 'Resolved',
      priority: 'Medium',
      systemRecommendedPriority: 'Medium',
      priorityRationale: [
        'Category Baseline: Roadway damage poses vehicular collision and transit hazard (+25 pts)',
        'Community Impact: Multiple citizens affected (7 endorsements, +10 pts)',
      ],
      safetyRisk: false,
      assignedDepartment: 'Public Works & Roads',
      reporterId: 'user-citizen-2',
      reporterName: 'David Patel',
      createdAt: '2026-09-18T11:20:00Z',
      updatedAt: '2026-09-21T15:00:00Z',
      resolvedAt: '2026-09-21T15:00:00Z',
      resolutionSummary: 'Road markings crew applied reflective thermoplastic high-durability crosswalk paint and upgraded crossing signage.',
      votesCount: 7,
      slaHours: 72,
    },
    {
      id: 'cmp-011',
      reference: 'CP-2026-011',
      title: 'Public Park Drinking Fountain Contaminated & Backflowing',
      description: 'The community park fountain near the playground is emitting brown turbid water and failing to drain.',
      category: 'water_supply',
      address: 'Civic Central Park, Playground Sector B',
      locality: 'Downtown Commercial',
      latitude: 37.7790,
      longitude: -122.4140,
      imageUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'Acknowledged',
      priority: 'High',
      systemRecommendedPriority: 'High',
      priorityRationale: [
        'Category Baseline: Clean water supply disruption affects public health & sanitation (+30 pts)',
        'Safety Flag: Reporter flagged immediate risk of injury or public danger (+35 pts)',
      ],
      safetyRisk: true,
      assignedDepartment: 'Water Supply & Sanitation Board',
      reporterId: 'user-citizen-1',
      reporterName: 'Aisha Chen',
      createdAt: '2026-10-06T12:00:00Z',
      updatedAt: '2026-10-07T09:00:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 6,
      slaHours: 48,
    },
    {
      id: 'cmp-012',
      reference: 'CP-2026-012',
      title: 'Fallen Tree Branch Entangled with Overhead Power & Cable Lines',
      description: 'Heavy eucalyptus branch snapped during high winds and is resting on live electrical service lines along 18th Street.',
      category: 'public_safety',
      address: '224 18th Street at Dolores Avenue',
      locality: 'Mission Vista',
      latitude: 37.7600,
      longitude: -122.4270,
      imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'In Progress',
      priority: 'Critical',
      systemRecommendedPriority: 'Critical',
      priorityRationale: [
        'Category Baseline: Public safety infrastructure carries direct bodily hazard potential (+40 pts)',
        'Safety Flag: Reporter flagged immediate risk of injury or public danger (+35 pts)',
        'Community Impact: High citizen validation (15 endorsements, +18 pts)',
      ],
      safetyRisk: true,
      assignedDepartment: 'Public Safety & Urban Infrastructure',
      reporterId: 'user-citizen-2',
      reporterName: 'David Patel',
      createdAt: '2026-10-07T06:30:00Z',
      updatedAt: '2026-10-07T08:00:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 15,
      slaHours: 24,
    },
    {
      id: 'cmp-013',
      reference: 'CP-2026-013',
      title: 'Overdue Residential Recyclables Collection in North Hills',
      description: 'Blue recycle bins on Hilltop Crest were missed during scheduled Monday pickup for two consecutive cycles.',
      category: 'waste_management',
      address: 'Hilltop Crest Blocks 100-300',
      locality: 'Westridge',
      latitude: 37.7470,
      longitude: -122.4490,
      imageUrl: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
      status: 'Resolved',
      priority: 'Low',
      systemRecommendedPriority: 'Low',
      priorityRationale: [
        'Category Baseline: Uncollected waste presents vector-borne environmental health hazard (+20 pts)',
      ],
      safetyRisk: false,
      assignedDepartment: 'Sanitation & Waste Management',
      reporterId: 'user-citizen-1',
      reporterName: 'Aisha Chen',
      createdAt: '2026-09-22T08:00:00Z',
      updatedAt: '2026-09-24T12:00:00Z',
      resolvedAt: '2026-09-24T12:00:00Z',
      resolutionSummary: 'Special collection route completed by sanitation team. Route driver re-briefed on street layout.',
      votesCount: 3,
      slaHours: 120,
    },
    {
      id: 'cmp-014',
      reference: 'CP-2026-014',
      title: 'Damaged Catch Basin Grate Trapping Bicycle Wheels',
      description: 'Cast iron stormwater drainage grate is cracked with one vane missing, creating a tire-trap hazard on the designated bike lane.',
      category: 'drainage',
      address: 'Market Street at 7th Street Bicycle Lane',
      locality: 'Downtown Commercial',
      latitude: 37.7805,
      longitude: -122.4120,
      imageUrl: 'https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=800&q=80',
      afterImageUrl: undefined,
      status: 'Acknowledged',
      priority: 'High',
      systemRecommendedPriority: 'High',
      priorityRationale: [
        'Category Baseline: Drainage blockage poses flooding and contamination risks (+25 pts)',
        'Safety Flag: Reporter flagged immediate risk of injury or public danger (+35 pts)',
      ],
      safetyRisk: true,
      assignedDepartment: 'Drainage & Flood Control',
      reporterId: 'user-citizen-2',
      reporterName: 'David Patel',
      createdAt: '2026-10-06T14:10:00Z',
      updatedAt: '2026-10-07T09:15:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 9,
      slaHours: 48,
    },
    {
      id: 'cmp-015',
      reference: 'CP-2026-015',
      title: 'Request to Paint Private Driveway Curb Red for Access',
      description: 'Resident requesting municipal department paint curb red on both sides of private driveway to prevent illegal parking.',
      category: 'road_damage',
      address: '89 Willowood Court',
      locality: 'Highland Park',
      latitude: 37.7630,
      longitude: -122.4380,
      imageUrl: undefined,
      afterImageUrl: undefined,
      status: 'Rejected',
      priority: 'Low',
      systemRecommendedPriority: 'Low',
      priorityRationale: [
        'Category Baseline: Roadway damage poses vehicular collision and transit hazard (+25 pts)',
      ],
      safetyRisk: false,
      assignedDepartment: 'Public Works & Roads',
      reporterId: 'user-citizen-1',
      reporterName: 'Aisha Chen',
      createdAt: '2026-09-15T10:00:00Z',
      updatedAt: '2026-09-17T11:00:00Z',
      resolvedAt: '2026-09-17T11:00:00Z',
      resolutionSummary: 'Declined: Private driveway curb painting requires formal driveway sight-distance permit application through Department of Transportation portal, not civic maintenance complaint.',
      votesCount: 1,
      slaHours: 120,
    },
    {
      id: 'cmp-016',
      reference: 'CP-2026-016',
      title: 'Solar Speed Feedback Sign Out of Order on School Zone Boulevard',
      description: 'Radar digital speed feedback sign is dark and not displaying vehicle speeds on approach to Lincoln High.',
      category: 'streetlights',
      address: '2200 Sunset Blvd at 24th Ave',
      locality: 'Sunset Heights',
      latitude: 37.7510,
      longitude: -122.4820,
      imageUrl: undefined,
      afterImageUrl: undefined,
      status: 'Submitted',
      priority: 'Low',
      systemRecommendedPriority: 'Low',
      priorityRationale: [
        'Category Baseline: Lighting failures impact nocturnal commuter visibility (+15 pts)',
      ],
      safetyRisk: false,
      assignedDepartment: 'Electrical & Street Lighting',
      reporterId: 'user-citizen-2',
      reporterName: 'David Patel',
      createdAt: '2026-10-08T10:20:00Z',
      updatedAt: '2026-10-08T10:20:00Z',
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 2,
      slaHours: 120,
    },
  ];

  // History timeline entries for audit trails
  const history: ComplaintHistoryEntry[] = [
    // CMP-001
    {
      id: 'hist-001-1',
      complaintId: 'cmp-001',
      previousStatus: 'None',
      newStatus: 'Submitted',
      actorId: 'user-citizen-1',
      actorName: 'Aisha Chen',
      actorRole: 'Citizen',
      publicUpdate: 'Complaint submitted with geolocation and photo verification.',
      timestamp: '2026-10-04T09:15:00Z',
    },
    {
      id: 'hist-001-2',
      complaintId: 'cmp-001',
      previousStatus: 'Submitted',
      newStatus: 'Acknowledged',
      actorId: 'user-official-1',
      actorName: 'Director Marcus Vance',
      actorRole: 'Municipal Official',
      publicUpdate: 'Complaint reviewed and assigned to Asphalt Maintenance Rapid Unit #3.',
      timestamp: '2026-10-04T11:20:00Z',
    },
    {
      id: 'hist-001-3',
      complaintId: 'cmp-001',
      previousStatus: 'Acknowledged',
      newStatus: 'In Progress',
      actorId: 'user-official-1',
      actorName: 'Director Marcus Vance',
      actorRole: 'Municipal Official',
      publicUpdate: 'Work order #RD-884 issued. Traffic control cones staged; cold mix and steamroller crew scheduled for patch work.',
      timestamp: '2026-10-05T11:30:00Z',
    },
    // CMP-002
    {
      id: 'hist-002-1',
      complaintId: 'cmp-002',
      previousStatus: 'None',
      newStatus: 'Submitted',
      actorId: 'user-citizen-2',
      actorName: 'David Patel',
      actorRole: 'Citizen',
      publicUpdate: 'Report filed regarding waste overflow at Mercado Plaza.',
      timestamp: '2026-09-28T14:20:00Z',
    },
    {
      id: 'hist-002-2',
      complaintId: 'cmp-002',
      previousStatus: 'Submitted',
      newStatus: 'Acknowledged',
      actorId: 'user-official-2',
      actorName: 'Inspector Sarah Jenkins',
      actorRole: 'Municipal Official',
      publicUpdate: 'Sanitation inspection confirmed overflow condition.',
      timestamp: '2026-09-29T09:00:00Z',
    },
    {
      id: 'hist-002-3',
      complaintId: 'cmp-002',
      previousStatus: 'Acknowledged',
      newStatus: 'In Progress',
      actorId: 'user-official-2',
      actorName: 'Inspector Sarah Jenkins',
      actorRole: 'Municipal Official',
      publicUpdate: 'Heavy commercial compactor truck deployed.',
      timestamp: '2026-09-29T13:30:00Z',
    },
    {
      id: 'hist-002-4',
      complaintId: 'cmp-002',
      previousStatus: 'In Progress',
      newStatus: 'Resolved',
      actorId: 'user-official-2',
      actorName: 'Inspector Sarah Jenkins',
      actorRole: 'Municipal Official',
      publicUpdate: 'Site cleared completely, dumpsters emptied, and surface sanitized. Photo proof verified.',
      timestamp: '2026-09-30T16:45:00Z',
    },
    // CMP-003
    {
      id: 'hist-003-1',
      complaintId: 'cmp-003',
      previousStatus: 'None',
      newStatus: 'Submitted',
      actorId: 'user-citizen-1',
      actorName: 'Aisha Chen',
      actorRole: 'Citizen',
      publicUpdate: 'Urgent main pipe rupture reported.',
      timestamp: '2026-10-06T07:45:00Z',
    },
    {
      id: 'hist-003-2',
      complaintId: 'cmp-003',
      previousStatus: 'Submitted',
      newStatus: 'In Progress',
      actorId: 'user-official-3',
      actorName: 'Eng. Roberto Silva',
      actorRole: 'Municipal Official',
      publicUpdate: 'Emergency shut-off valve isolated. Excavation team is exposing the damaged segment.',
      timestamp: '2026-10-06T09:10:00Z',
    },
    // CMP-004
    {
      id: 'hist-004-1',
      complaintId: 'cmp-004',
      previousStatus: 'None',
      newStatus: 'Submitted',
      actorId: 'user-citizen-2',
      actorName: 'David Patel',
      actorRole: 'Citizen',
      publicUpdate: 'Streetlight outage reported along Greenway.',
      timestamp: '2026-10-05T18:10:00Z',
    },
    {
      id: 'hist-004-2',
      complaintId: 'cmp-004',
      previousStatus: 'Submitted',
      newStatus: 'Acknowledged',
      actorId: 'user-official-1',
      actorName: 'Director Marcus Vance',
      actorRole: 'Municipal Official',
      publicUpdate: 'Assigned to Municipal Electrical Division for ballast testing.',
      timestamp: '2026-10-06T08:00:00Z',
    },
    // CMP-007
    {
      id: 'hist-007-1',
      complaintId: 'cmp-007',
      previousStatus: 'None',
      newStatus: 'Submitted',
      actorId: 'user-citizen-1',
      actorName: 'Aisha Chen',
      actorRole: 'Citizen',
      publicUpdate: 'Flashing yellow signal failure submitted.',
      timestamp: '2026-09-25T10:00:00Z',
    },
    {
      id: 'hist-007-2',
      complaintId: 'cmp-007',
      previousStatus: 'Submitted',
      newStatus: 'Resolved',
      actorId: 'user-official-1',
      actorName: 'Director Marcus Vance',
      actorRole: 'Municipal Official',
      publicUpdate: 'Traffic signal relay replaced and full operational testing completed.',
      timestamp: '2026-09-26T14:15:00Z',
    },
  ];

  // Official notes (both internal and public)
  const notes: OfficialNote[] = [
    {
      id: 'note-001-1',
      complaintId: 'cmp-001',
      authorId: 'user-official-1',
      authorName: 'Director Marcus Vance',
      department: 'Public Works & Roads',
      note: 'INTERNAL NOTE: Subsurface soil erosion suspected due to adjacent storm drain leakage. Advise road crew to inspect aggregate subbase before final asphalt rolling.',
      visibility: 'internal',
      timestamp: '2026-10-05T11:45:00Z',
    },
    {
      id: 'note-001-2',
      complaintId: 'cmp-001',
      authorId: 'user-official-1',
      authorName: 'Director Marcus Vance',
      department: 'Public Works & Roads',
      note: 'PUBLIC UPDATE: Road crew has placed safety barriers and will complete permanent hot-mix patch by end of week.',
      visibility: 'public',
      timestamp: '2026-10-05T12:00:00Z',
    },
    {
      id: 'note-002-1',
      complaintId: 'cmp-002',
      authorId: 'user-official-2',
      authorName: 'Inspector Sarah Jenkins',
      department: 'Sanitation & Waste Management',
      note: 'INTERNAL NOTE: Issued warning citation #SC-441 to Mercado commercial management for improper recycling compaction.',
      visibility: 'internal',
      timestamp: '2026-09-29T10:00:00Z',
    },
    {
      id: 'note-003-1',
      complaintId: 'cmp-003',
      authorId: 'user-official-3',
      authorName: 'Eng. Roberto Silva',
      department: 'Water Supply & Sanitation Board',
      note: 'INTERNAL NOTE: Replacement 6-inch ductile iron pipe sleeve requisitioned from Central Depot. Expected delivery within 2 hours.',
      visibility: 'internal',
      timestamp: '2026-10-06T09:25:00Z',
    },
  ];

  // Upvotes
  const votes: Vote[] = [
    { id: 'v-1', complaintId: 'cmp-001', userId: 'user-citizen-1', timestamp: '2026-10-04T09:15:00Z' },
    { id: 'v-2', complaintId: 'cmp-001', userId: 'user-citizen-2', timestamp: '2026-10-04T10:00:00Z' },
    { id: 'v-3', complaintId: 'cmp-003', userId: 'user-citizen-1', timestamp: '2026-10-06T07:45:00Z' },
    { id: 'v-4', complaintId: 'cmp-003', userId: 'user-citizen-2', timestamp: '2026-10-06T08:10:00Z' },
    { id: 'v-5', complaintId: 'cmp-004', userId: 'user-citizen-2', timestamp: '2026-10-05T18:10:00Z' },
  ];

  return { complaints: seedComplaints, history, notes, votes };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.complaints && parsed.users) {
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse database file, re-initializing seed data', err);
      }
    }

    const { complaints, history, notes, votes } = generateSeedComplaints();
    const initialData: DatabaseSchema = {
      users: INITIAL_USERS,
      complaints,
      complaint_history: history,
      votes,
      official_notes: notes,
    };
    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: DatabaseSchema) {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
      this.data = data;
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

  public resetToSeed(): DatabaseSchema {
    const { complaints, history, notes, votes } = generateSeedComplaints();
    const freshData: DatabaseSchema = {
      users: INITIAL_USERS,
      complaints,
      complaint_history: history,
      votes,
      official_notes: notes,
    };
    this.saveData(freshData);
    return freshData;
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  // --- Complaints ---
  public getComplaints(filter?: {
    category?: string;
    status?: string;
    priority?: string;
    department?: string;
    locality?: string;
    search?: string;
    reporterId?: string;
  }): Complaint[] {
    let list = [...this.data.complaints];

    if (filter) {
      if (filter.category && filter.category !== 'all') {
        list = list.filter((c) => c.category === filter.category);
      }
      if (filter.status && filter.status !== 'all') {
        list = list.filter((c) => c.status === filter.status);
      }
      if (filter.priority && filter.priority !== 'all') {
        list = list.filter((c) => c.priority === filter.priority);
      }
      if (filter.department && filter.department !== 'all') {
        list = list.filter((c) => c.assignedDepartment === filter.department);
      }
      if (filter.locality && filter.locality !== 'all') {
        list = list.filter((c) => c.locality.toLowerCase().includes(filter.locality!.toLowerCase()));
      }
      if (filter.reporterId) {
        list = list.filter((c) => c.reporterId === filter.reporterId);
      }
      if (filter.search && filter.search.trim()) {
        const query = filter.search.toLowerCase().trim();
        list = list.filter(
          (c) =>
            c.reference.toLowerCase().includes(query) ||
            c.title.toLowerCase().includes(query) ||
            c.description.toLowerCase().includes(query) ||
            c.address.toLowerCase().includes(query) ||
            c.locality.toLowerCase().includes(query)
        );
      }
    }

    // Sort by created date desc
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getComplaintById(id: string): Complaint | undefined {
    return this.data.complaints.find((c) => c.id === id || c.reference.toUpperCase() === id.toUpperCase());
  }

  public createComplaint(params: {
    title: string;
    description: string;
    category: ComplaintCategory;
    address: string;
    locality?: string;
    latitude?: number | null;
    longitude?: number | null;
    imageUrl?: string;
    safetyRisk: boolean;
    reporterId: string;
    reporterName: string;
  }): Complaint {
    const count = this.data.complaints.length + 1;
    const refNumber = String(count).padStart(3, '0');
    const reference = `CP-2026-${refNumber}`;
    const id = `cmp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Default department routing based on category
    let assignedDepartment = 'Public Works & Roads';
    switch (params.category) {
      case 'waste_management':
        assignedDepartment = 'Sanitation & Waste Management';
        break;
      case 'drainage':
        assignedDepartment = 'Drainage & Flood Control';
        break;
      case 'streetlights':
        assignedDepartment = 'Electrical & Street Lighting';
        break;
      case 'water_supply':
        assignedDepartment = 'Water Supply & Sanitation Board';
        break;
      case 'public_safety':
        assignedDepartment = 'Public Safety & Urban Infrastructure';
        break;
      default:
        assignedDepartment = 'Public Works & Roads';
    }

    // Calculate smart recommendation
    const recommendation = calculateSmartPriority({
      category: params.category,
      safetyRisk: params.safetyRisk,
      votesCount: 1, // author counts
      createdAt: now,
      status: 'Submitted',
    });

    const newComplaint: Complaint = {
      id,
      reference,
      title: params.title.trim(),
      description: params.description.trim(),
      category: params.category,
      address: params.address.trim(),
      locality: params.locality?.trim() || 'Central Metro',
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
      imageUrl: params.imageUrl,
      status: 'Submitted',
      priority: recommendation.recommendedPriority,
      systemRecommendedPriority: recommendation.recommendedPriority,
      priorityRationale: recommendation.rationale,
      safetyRisk: params.safetyRisk,
      assignedDepartment,
      reporterId: params.reporterId,
      reporterName: params.reporterName,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      resolutionSummary: null,
      votesCount: 1,
      slaHours: recommendation.slaHours,
    };

    const historyEntry: ComplaintHistoryEntry = {
      id: `hist-${Date.now().toString(36)}`,
      complaintId: id,
      previousStatus: 'None',
      newStatus: 'Submitted',
      actorId: params.reporterId,
      actorName: params.reporterName,
      actorRole: 'Citizen',
      publicUpdate: 'Complaint registered into CivicPulse municipal queue.',
      timestamp: now,
    };

    const initialVote: Vote = {
      id: `vote-${Date.now().toString(36)}`,
      complaintId: id,
      userId: params.reporterId,
      timestamp: now,
    };

    this.data.complaints.unshift(newComplaint);
    this.data.complaint_history.push(historyEntry);
    this.data.votes.push(initialVote);
    this.saveData(this.data);

    return newComplaint;
  }

  public updateStatus(params: {
    complaintId: string;
    newStatus: 'Submitted' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Rejected';
    actor: User;
    publicUpdate?: string;
    resolutionSummary?: string;
    afterImageUrl?: string;
  }): { complaint: Complaint; historyEntry: ComplaintHistoryEntry } | null {
    const complaint = this.data.complaints.find((c) => c.id === params.complaintId);
    if (!complaint) return null;

    const previousStatus = complaint.status;
    const now = new Date().toISOString();

    complaint.status = params.newStatus;
    complaint.updatedAt = now;

    if (params.newStatus === 'Resolved') {
      complaint.resolvedAt = now;
      if (params.resolutionSummary) {
        complaint.resolutionSummary = params.resolutionSummary;
      }
      if (params.afterImageUrl) {
        complaint.afterImageUrl = params.afterImageUrl;
      }
    } else if (params.newStatus === 'Rejected') {
      complaint.resolvedAt = now;
      if (params.resolutionSummary) {
        complaint.resolutionSummary = params.resolutionSummary;
      }
    }

    const historyEntry: ComplaintHistoryEntry = {
      id: `hist-${Date.now().toString(36)}`,
      complaintId: complaint.id,
      previousStatus,
      newStatus: params.newStatus,
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: params.actor.role === 'official' ? 'Municipal Official' : 'System Admin',
      publicUpdate:
        params.publicUpdate ||
        (params.newStatus === 'Resolved' && params.resolutionSummary
          ? `Issue marked Resolved: ${params.resolutionSummary}`
          : `Status changed from ${previousStatus} to ${params.newStatus}.`),
      timestamp: now,
    };

    this.data.complaint_history.push(historyEntry);
    this.saveData(this.data);

    return { complaint, historyEntry };
  }

  public updatePriority(params: {
    complaintId: string;
    priority: PriorityLevel;
    overrideReason: string;
    actor: User;
  }): Complaint | null {
    const complaint = this.data.complaints.find((c) => c.id === params.complaintId);
    if (!complaint) return null;

    const prevPriority = complaint.priority;
    complaint.priority = params.priority;
    complaint.updatedAt = new Date().toISOString();

    // Adjust SLA based on new priority
    if (params.priority === 'Critical') complaint.slaHours = 24;
    else if (params.priority === 'High') complaint.slaHours = 48;
    else if (params.priority === 'Medium') complaint.slaHours = 72;
    else complaint.slaHours = 120;

    // Add note and history
    const historyEntry: ComplaintHistoryEntry = {
      id: `hist-${Date.now().toString(36)}`,
      complaintId: complaint.id,
      previousStatus: complaint.status,
      newStatus: complaint.status,
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: 'Municipal Official',
      publicUpdate: `Priority level revised from ${prevPriority} to ${params.priority}. Justification: ${params.overrideReason}`,
      timestamp: new Date().toISOString(),
    };

    const note: OfficialNote = {
      id: `note-${Date.now().toString(36)}`,
      complaintId: complaint.id,
      authorId: params.actor.id,
      authorName: params.actor.name,
      department: params.actor.department || complaint.assignedDepartment,
      note: `Official Priority Override: Adjusted priority to ${params.priority}. Reason: ${params.overrideReason}`,
      visibility: 'public',
      timestamp: new Date().toISOString(),
    };

    this.data.complaint_history.push(historyEntry);
    this.data.official_notes.push(note);
    this.saveData(this.data);

    return complaint;
  }

  public updateAssignment(params: {
    complaintId: string;
    department: string;
    actor: User;
    note?: string;
  }): Complaint | null {
    const complaint = this.data.complaints.find((c) => c.id === params.complaintId);
    if (!complaint) return null;

    const prevDept = complaint.assignedDepartment;
    complaint.assignedDepartment = params.department;
    complaint.updatedAt = new Date().toISOString();

    const historyEntry: ComplaintHistoryEntry = {
      id: `hist-${Date.now().toString(36)}`,
      complaintId: complaint.id,
      previousStatus: complaint.status,
      newStatus: complaint.status,
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: 'Municipal Official',
      publicUpdate: `Department routing transferred from "${prevDept}" to "${params.department}".`,
      timestamp: new Date().toISOString(),
    };

    this.data.complaint_history.push(historyEntry);
    this.saveData(this.data);

    return complaint;
  }

  public voteComplaint(params: { complaintId: string; userId: string }): { success: boolean; votesCount: number; message: string } {
    const complaint = this.data.complaints.find((c) => c.id === params.complaintId);
    if (!complaint) return { success: false, votesCount: 0, message: 'Complaint not found' };

    const existing = this.data.votes.find((v) => v.complaintId === params.complaintId && v.userId === params.userId);
    if (existing) {
      return { success: false, votesCount: complaint.votesCount, message: 'You have already endorsed this civic complaint.' };
    }

    const vote: Vote = {
      id: `vote-${Date.now().toString(36)}`,
      complaintId: params.complaintId,
      userId: params.userId,
      timestamp: new Date().toISOString(),
    };

    this.data.votes.push(vote);
    complaint.votesCount = (complaint.votesCount || 0) + 1;
    complaint.updatedAt = new Date().toISOString();

    // Re-check smart prioritization recommendation with new vote count
    const rec = calculateSmartPriority({
      category: complaint.category,
      safetyRisk: complaint.safetyRisk,
      votesCount: complaint.votesCount,
      createdAt: complaint.createdAt,
      status: complaint.status,
    });
    complaint.systemRecommendedPriority = rec.recommendedPriority;
    complaint.priorityRationale = rec.rationale;

    this.saveData(this.data);
    return { success: true, votesCount: complaint.votesCount, message: 'Your endorsement was recorded successfully.' };
  }

  public hasUserVoted(complaintId: string, userId: string): boolean {
    return this.data.votes.some((v) => v.complaintId === complaintId && v.userId === userId);
  }

  public getComplaintHistory(complaintId: string): ComplaintHistoryEntry[] {
    return this.data.complaint_history
      .filter((h) => h.complaintId === complaintId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public getComplaintNotes(complaintId: string, isOfficial: boolean): OfficialNote[] {
    return this.data.official_notes
      .filter((n) => n.complaintId === complaintId && (isOfficial || n.visibility === 'public'))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public addOfficialNote(params: {
    complaintId: string;
    author: User;
    note: string;
    visibility: 'internal' | 'public';
  }): OfficialNote {
    const note: OfficialNote = {
      id: `note-${Date.now().toString(36)}`,
      complaintId: params.complaintId,
      authorId: params.author.id,
      authorName: params.author.name,
      department: params.author.department || 'Municipal Administration',
      note: params.note.trim(),
      visibility: params.visibility,
      timestamp: new Date().toISOString(),
    };

    this.data.official_notes.push(note);
    this.saveData(this.data);
    return note;
  }

  // --- Analytics calculated strictly from actual stored data ---
  public getAnalytics() {
    const complaints = this.data.complaints;
    const total = complaints.length;
    const resolved = complaints.filter((c) => c.status === 'Resolved').length;
    const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
    const acknowledged = complaints.filter((c) => c.status === 'Acknowledged').length;
    const submitted = complaints.filter((c) => c.status === 'Submitted').length;
    const rejected = complaints.filter((c) => c.status === 'Rejected').length;

    // Average resolution time in hours from actual resolved records
    const resolvedComplaints = complaints.filter((c) => c.status === 'Resolved' && c.resolvedAt);
    let totalResolutionHours = 0;
    resolvedComplaints.forEach((c) => {
      const start = new Date(c.createdAt).getTime();
      const end = new Date(c.resolvedAt!).getTime();
      totalResolutionHours += Math.max(0, (end - start) / (1000 * 60 * 60));
    });
    const avgResolutionHours = resolvedComplaints.length > 0 ? Math.round((totalResolutionHours / resolvedComplaints.length) * 10) / 10 : 0;

    // SLA overdue check
    const now = Date.now();
    const overdueCount = complaints.filter((c) => {
      if (c.status === 'Resolved' || c.status === 'Rejected') return false;
      const hoursOpen = (now - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
      return hoursOpen > (c.slaHours || 72);
    }).length;

    // Category breakdown
    const categoryCounts: Record<string, { total: number; resolved: number; inProgress: number }> = {};
    Object.keys(CATEGORY_LABELS).forEach((cat) => {
      categoryCounts[cat] = { total: 0, resolved: 0, inProgress: 0 };
    });

    complaints.forEach((c) => {
      if (!categoryCounts[c.category]) {
        categoryCounts[c.category] = { total: 0, resolved: 0, inProgress: 0 };
      }
      categoryCounts[c.category].total += 1;
      if (c.status === 'Resolved') categoryCounts[c.category].resolved += 1;
      if (c.status === 'In Progress') categoryCounts[c.category].inProgress += 1;
    });

    // Locality breakdown
    const localityCounts: Record<string, number> = {};
    complaints.forEach((c) => {
      const loc = c.locality || 'Unknown Area';
      localityCounts[loc] = (localityCounts[loc] || 0) + 1;
    });

    const topAreas = Object.entries(localityCounts)
      .map(([locality, count]) => ({ locality, count }))
      .sort((a, b) => b.count - a.count);

    // Department performance
    const departmentPerformance = DEPARTMENTS.map((dept) => {
      const deptComplaints = complaints.filter((c) => c.assignedDepartment === dept);
      const deptResolved = deptComplaints.filter((c) => c.status === 'Resolved').length;
      const deptActive = deptComplaints.filter((c) => c.status === 'In Progress' || c.status === 'Acknowledged' || c.status === 'Submitted').length;
      const rate = deptComplaints.length > 0 ? Math.round((deptResolved / deptComplaints.length) * 100) : 0;
      return {
        department: dept,
        total: deptComplaints.length,
        resolved: deptResolved,
        active: deptActive,
        resolutionRate: rate,
      };
    });

    return {
      summary: {
        total,
        resolved,
        inProgress,
        acknowledged,
        submitted,
        rejected,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgResolutionHours,
        overdueCount,
      },
      categories: Object.entries(categoryCounts).map(([cat, stats]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat as ComplaintCategory] || cat,
        total: stats.total,
        resolved: stats.resolved,
        inProgress: stats.inProgress,
      })),
      topAreas,
      departmentPerformance,
    };
  }
}

export const db = new Database();
