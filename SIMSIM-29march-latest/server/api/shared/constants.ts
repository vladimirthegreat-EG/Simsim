/**
 * Shared constants for API routers
 */

/**
 * Game status enum values (SQLite uses strings)
 */
export const GameStatus = {
  LOBBY: "LOBBY",
  IN_PROGRESS: "IN_PROGRESS",
  ROUND_PROCESSING: "ROUND_PROCESSING",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
} as const;

export type GameStatusType = (typeof GameStatus)[keyof typeof GameStatus];

/**
 * Round status enum values
 */
export const RoundStatus = {
  PENDING: "PENDING",
  ACCEPTING_DECISIONS: "ACCEPTING_DECISIONS",
  LOCKED: "LOCKED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
} as const;

export type RoundStatusType = (typeof RoundStatus)[keyof typeof RoundStatus];

/**
 * Game module enum values
 */
export const GameModule = {
  FACTORY: "FACTORY",
  FINANCE: "FINANCE",
  HR: "HR",
  MARKETING: "MARKETING",
  RD: "RD",
} as const;

export type GameModuleType = (typeof GameModule)[keyof typeof GameModule];
