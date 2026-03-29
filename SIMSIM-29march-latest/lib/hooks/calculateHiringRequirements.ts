import type { TeamState } from "@/engine/types";
import {
  getWorkersRequired,
  getEngineersRequired,
  getSupervisorsRequired,
  getEmployeeCounts,
} from "@/lib/utils/stateHelpers";

export interface HiringRequirement {
  role: "worker" | "engineer" | "supervisor";
  currentCount: number;
  requiredCount: number;
  shortfall: number;
  reason: string[];
  urgency: "critical" | "recommended" | "optional";
}

export function calculateHiringRequirements(state: TeamState): HiringRequirement[] {
  const counts = getEmployeeCounts(state);
  const requirements: HiringRequirement[] = [];

  // Workers
  const workersRequired = getWorkersRequired(state);
  const workerShortfall = Math.max(0, workersRequired - counts.workers);
  requirements.push({
    role: "worker",
    currentCount: counts.workers,
    requiredCount: workersRequired,
    shortfall: workerShortfall,
    reason: workerShortfall > 0 ? [`Need ${workersRequired} workers for operational machines`] : [],
    urgency: counts.workers < workersRequired * 0.7 ? "critical" : workerShortfall > 0 ? "recommended" : "optional",
  });

  // Engineers
  const engineersRequired = getEngineersRequired(state);
  const engineerShortfall = Math.max(0, engineersRequired - counts.engineers);
  requirements.push({
    role: "engineer",
    currentCount: counts.engineers,
    requiredCount: engineersRequired,
    shortfall: engineerShortfall,
    reason: engineerShortfall > 0 ? [`Need ${engineersRequired} engineers for ${state.factories?.length ?? 0} factories`] : [],
    urgency: engineerShortfall > 0 ? "critical" : "optional",
  });

  // Supervisors
  const supervisorsRequired = getSupervisorsRequired(state);
  const supervisorShortfall = Math.max(0, supervisorsRequired - counts.supervisors);
  requirements.push({
    role: "supervisor",
    currentCount: counts.supervisors,
    requiredCount: supervisorsRequired,
    shortfall: supervisorShortfall,
    reason: supervisorShortfall > 0 ? [`Need 1 supervisor per ${15} staff`] : [],
    urgency: supervisorShortfall > 0 ? "recommended" : "optional",
  });

  return requirements;
}
