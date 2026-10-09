export type ComplaintCategory =
  | 'road_damage'
  | 'waste_management'
  | 'drainage'
  | 'streetlights'
  | 'water_supply'
  | 'public_safety';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface PriorityCalculationInput {
  category: ComplaintCategory;
  safetyRisk: boolean;
  votesCount: number;
  createdAt: string; // ISO date
  status: string;
}

export interface PriorityRecommendation {
  recommendedPriority: PriorityLevel;
  slaHours: number;
  rationale: string[];
  score: number;
}

/**
 * Transparent, rule-based priority recommendation engine.
 * Considers category baseline hazard, citizen safety indication,
 * community upvotes, age/staleness, and municipal SLA thresholds.
 */
export function calculateSmartPriority(input: PriorityCalculationInput): PriorityRecommendation {
  let score = 0;
  const rationale: string[] = [];

  // 1. Category baseline hazard weight
  switch (input.category) {
    case 'public_safety':
      score += 40;
      rationale.push('Category Baseline: Public safety infrastructure carries direct bodily hazard potential (+40 pts)');
      break;
    case 'water_supply':
      score += 30;
      rationale.push('Category Baseline: Clean water supply disruption affects public health & sanitation (+30 pts)');
      break;
    case 'drainage':
      score += 25;
      rationale.push('Category Baseline: Drainage blockage poses flooding and contamination risks (+25 pts)');
      break;
    case 'road_damage':
      score += 25;
      rationale.push('Category Baseline: Roadway damage poses vehicular collision and transit hazard (+25 pts)');
      break;
    case 'streetlights':
      score += 15;
      rationale.push('Category Baseline: Lighting failures impact nocturnal commuter visibility (+15 pts)');
      break;
    case 'waste_management':
      score += 20;
      rationale.push('Category Baseline: Uncollected waste presents vector-borne environmental health hazard (+20 pts)');
      break;
    default:
      score += 10;
  }

  // 2. Explicit Citizen Safety Risk Flag
  if (input.safetyRisk) {
    score += 35;
    rationale.push('Safety Flag: Reporter flagged immediate risk of injury or public danger (+35 pts)');
  }

  // 3. Community Endorsements / Upvotes
  if (input.votesCount >= 20) {
    score += 25;
    rationale.push(`Community Impact: Exceptional community support (${input.votesCount} citizen endorsements, +25 pts)`);
  } else if (input.votesCount >= 10) {
    score += 18;
    rationale.push(`Community Impact: High citizen validation (${input.votesCount} endorsements, +18 pts)`);
  } else if (input.votesCount >= 4) {
    score += 10;
    rationale.push(`Community Impact: Multiple citizens affected (${input.votesCount} endorsements, +10 pts)`);
  }

  // 4. Aging & SLA Staleness
  const createdDate = new Date(input.createdAt);
  const now = new Date();
  const hoursElapsed = Math.max(0, (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));

  if (input.status === 'Submitted' && hoursElapsed > 48) {
    score += 15;
    rationale.push(`Staleness Alert: Awaiting municipal acknowledgement for >48 hours (${Math.round(hoursElapsed)}h, +15 pts)`);
  } else if (input.status === 'Acknowledged' && hoursElapsed > 72) {
    score += 10;
    rationale.push(`Staleness Alert: Acknowledged but unresolved for >72 hours (+10 pts)`);
  }

  // 5. Final Priority Level Determination & SLA Assignment
  let recommendedPriority: PriorityLevel;
  let slaHours: number;

  if (score >= 70 || (input.safetyRisk && (input.category === 'public_safety' || input.category === 'road_damage'))) {
    recommendedPriority = 'Critical';
    slaHours = 24; // 24-hour SLA
  } else if (score >= 48) {
    recommendedPriority = 'High';
    slaHours = 48; // 48-hour SLA
  } else if (score >= 28) {
    recommendedPriority = 'Medium';
    slaHours = 72; // 72-hour SLA
  } else {
    recommendedPriority = 'Low';
    slaHours = 120; // 5 days SLA
  }

  return {
    recommendedPriority,
    slaHours,
    rationale,
    score,
  };
}
