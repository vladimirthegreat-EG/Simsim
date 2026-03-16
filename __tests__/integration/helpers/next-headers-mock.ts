/**
 * Mock for `next/headers` — required because tRPC routers import
 * `cookies()` from "next/headers" for session management.
 * This module only works inside a Next.js request context,
 * so we mock it for server-side integration tests.
 *
 * Import this file at the TOP of every integration test file
 * BEFORE importing any tRPC routers.
 */

import { vi } from "vitest";

vi.mock("next/headers", () => {
  const cookieStore = {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    has: vi.fn().mockReturnValue(false),
  };

  return {
    cookies: vi.fn().mockResolvedValue(cookieStore),
    headers: vi.fn().mockResolvedValue(new Map()),
  };
});
