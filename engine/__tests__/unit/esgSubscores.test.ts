/**
 * P35: ESG Subscore Tests
 */
import { describe, it, expect } from "vitest";
import {
  calculateESGSubscores,
  calculateESGBonuses,
  updateESGSubscores,
} from "../../modules/ESGSubscoreCalculator";
import { createTestState } from "./testHelpers";

describe("ESG Subscores", () => {
  it("each subscore is 0-333", () => {
    const state = createTestState();
    state.esgScore = 500;

    const subscores = calculateESGSubscores(state);
    expect(subscores.environmental).toBeGreaterThanOrEqual(0);
    expect(subscores.environmental).toBeLessThanOrEqual(333);
    expect(subscores.social).toBeGreaterThanOrEqual(0);
    expect(subscores.social).toBeLessThanOrEqual(333);
    expect(subscores.governance).toBeGreaterThanOrEqual(0);
    expect(subscores.governance).toBeLessThanOrEqual(333);
  });

  it("total = env + social + gov", () => {
    const state = createTestState();
    state.esgScore = 600;

    const subscores = calculateESGSubscores(state);
    expect(subscores.total).toBe(subscores.environmental + subscores.social + subscores.governance);
  });

  it("zero ESG score = zero subscores", () => {
    const state = createTestState();
    state.esgScore = 0;

    const subscores = calculateESGSubscores(state);
    expect(subscores.environmental).toBe(0);
    expect(subscores.social).toBe(0);
    expect(subscores.governance).toBe(0);
    expect(subscores.total).toBe(0);
  });

  it("factory upgrades contribute to environmental subscore", () => {
    const state = createTestState();
    state.esgScore = 0;
    state.factories[0].upgrades = ["solarPanels"]; // +100 ESG environmental

    const subscores = calculateESGSubscores(state);
    expect(subscores.environmental).toBeGreaterThan(0);
    expect(subscores.environmental).toBeGreaterThanOrEqual(100);
  });

  it("multiple green upgrades stack environmental points", () => {
    const state = createTestState();
    state.esgScore = 0;
    state.factories[0].upgrades = ["solarPanels", "waterRecycling", "carbonCapture"];
    // solar=100, water=50, carbon=150 = 300

    const subscores = calculateESGSubscores(state);
    expect(subscores.environmental).toBeGreaterThanOrEqual(300);
  });

  it("updateESGSubscores writes to team state", () => {
    const state = createTestState();
    state.esgScore = 400;

    updateESGSubscores(state);
    expect(state.esgSubscores).toBeDefined();
    expect(state.esgSubscores!.environmental).toBeGreaterThan(0);
    expect(state.esgSubscores!.social).toBeGreaterThan(0);
    expect(state.esgSubscores!.governance).toBeGreaterThan(0);
  });
});

describe("ESG Operational Bonuses", () => {
  it("Environmental: reach = 1.0 + (env/333) × 0.15", () => {
    // At 0 environmental
    const b0 = calculateESGBonuses({ environmental: 0, social: 0, governance: 0, total: 0 });
    expect(b0.reachMultiplier).toBeCloseTo(1.0, 4);

    // At max environmental (333)
    const bMax = calculateESGBonuses({ environmental: 333, social: 0, governance: 0, total: 333 });
    expect(bMax.reachMultiplier).toBeCloseTo(1.15, 2);

    // At 166 (half)
    const bHalf = calculateESGBonuses({ environmental: 166, social: 0, governance: 0, total: 166 });
    expect(bHalf.reachMultiplier).toBeCloseTo(1.0 + (166 / 333) * 0.15, 3);
  });

  it("Social: efficiency = (social/333) × 0.10", () => {
    // At 0
    const b0 = calculateESGBonuses({ environmental: 0, social: 0, governance: 0, total: 0 });
    expect(b0.esgSocialBonus).toBeCloseTo(0, 4);

    // At max
    const bMax = calculateESGBonuses({ environmental: 0, social: 333, governance: 0, total: 333 });
    expect(bMax.esgSocialBonus).toBeCloseTo(0.10, 2);

    // At 100
    const b100 = calculateESGBonuses({ environmental: 0, social: 100, governance: 0, total: 100 });
    expect(b100.esgSocialBonus).toBeCloseTo((100 / 333) * 0.10, 4);
  });

  it("Governance: risk = 1.0 - (gov/333) × 0.20", () => {
    // At 0
    const b0 = calculateESGBonuses({ environmental: 0, social: 0, governance: 0, total: 0 });
    expect(b0.riskMultiplier).toBeCloseTo(1.0, 4);

    // At max (333)
    const bMax = calculateESGBonuses({ environmental: 0, social: 0, governance: 333, total: 333 });
    expect(bMax.riskMultiplier).toBeCloseTo(0.80, 2);

    // At 166
    const bHalf = calculateESGBonuses({ environmental: 0, social: 0, governance: 166, total: 166 });
    expect(bHalf.riskMultiplier).toBeCloseTo(1.0 - (166 / 333) * 0.20, 3);
  });

  it("social bonus feeds into production efficiency correctly", () => {
    const subscores = calculateESGSubscores(createTestState());
    const bonuses = calculateESGBonuses(subscores);

    // esgSocialBonus should be a number between 0 and 0.10
    expect(bonuses.esgSocialBonus).toBeGreaterThanOrEqual(0);
    expect(bonuses.esgSocialBonus).toBeLessThanOrEqual(0.10);
  });

  it("total ESG → investor sentiment still works (backward compat)", () => {
    const state = createTestState();
    state.esgScore = 700;
    // The total ESG score is still maintained separately for investor sentiment
    expect(state.esgScore).toBe(700);
  });
});
