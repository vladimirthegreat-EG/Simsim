"use client";

import { useState, useRef, useCallback } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell, BarChart, Bar,
} from "recharts";

// ════════════════════════════════════════════════════════════════════════════
// BIZZSIMSIM V2 — MONTE CARLO STRESS HARNESS v2
// Complete engine coverage: every formula, every dependency, every exploit.
// Source: Complete System Reference 2026-03-11
// ════════════════════════════════════════════════════════════════════════════

// ─── MULBERRY32 PRNG (determinism verification) ─────────────────────────────
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── CONSTANTS (from Complete System Reference §3) ──────────────────────────
const C = {
  STARTING_CASH: 175e6, MARKET_CAP: 500e6, SHARES: 10e6, MIN_SHARES: 1e6,
  BRAND_INIT: 0.5, BRAND_DECAY: 0.005, BRAND_MAX_GROWTH: 0.06,
  BRAND_LOW: 0.15, BRAND_HIGH: 0.55, BRAND_LOW_M: 0.7, BRAND_HIGH_M: 1.1,
  MAX_EFF: 1.0, EFF_PER_M: 0.02, EFF_DIMINISH: 10e6, BASE_DEFECT: 0.06,
  SOFTMAX_T: 2, QUALITY_CAP: 1.1, QUALITY_SHARE_BONUS: 0.0011,
  ESG_HIGH_THRESH: 700, ESG_MID_THRESH: 400, ESG_HIGH_BONUS: 0.05, ESG_MID_BONUS: 0.02,
  ESG_PEN_THRESH: 300, ESG_PEN_MAX: 0.12, ESG_PEN_MIN: 0.0133,
  PE_BASE: 15, PE_MIN: 5, PE_MAX: 30,
  AD_BASE: 0.0011, AD_CHUNK: 1e6, AD_DECAY: 0.2,
  BRAND_BASE: 0.003, BRAND_LIN_THRESH: 2e6, BRAND_LOG_M: 1.5,
  RB_ROUND: 3, RB_COST_MAX: 0.12, RB_COST_SENS: 1.5,
  RB_PERC_MAX: 0.08, RB_PERC_SENS: 1.2, RB_DRAG_MAX: 0.5, RB_DRAG_SENS: 0.8,
  RB_QUAL_BOOST: 5.0,
  LABOR: 20, OVERHEAD: 15, INV_HOLD: 0.02,
  LEARN_RATE: 0.85, LEARN_FLOOR: 0.50,
  WORKER_BASE: 45000, ENG_BASE: 85000, SUP_BASE: 75000,
  HIRE_MULT: 0.15, SAL_MIN: 0.8, SAL_MAX: 2.2, SAL_CAP: 500000,
  TURNOVER_BASE: 0.125, TRAIN_FATIGUE_THRESH: 1, TRAIN_FATIGUE_PEN: 0.3,
  WORKERS_PER_MACHINE: 2.75, WORKERS_PER_SUP: 15, ENG_PER_FACTORY: 8,
  RD_PER_ENG: 15, RD_PER_100K: 1, PATENT_THRESHOLD: 200,
  PATENT_QUAL_MAX: 25, PATENT_COST_MAX: 0.25, PATENT_SHARE_MAX: 0.15,
  TAX_FED: 0.21, TAX_STATE: 0.05,
  CROWDING_THRESH: 3, CROWDING_PEN: 0.05, FIRST_MOVER_MAX: 0.15,
};

const SEGS = ["Budget", "General", "Enthusiast", "Professional", "ActiveLifestyle"] as const;
type Seg = (typeof SEGS)[number];

const SEG_W: Record<Seg, { p: number; q: number; b: number; e: number; f: number }> = {
  Budget: { p: 65, q: 15, b: 5, e: 5, f: 10 },
  General: { p: 28, q: 23, b: 17, e: 10, f: 22 },
  Enthusiast: { p: 12, q: 30, b: 8, e: 5, f: 45 },
  Professional: { p: 8, q: 48, b: 7, e: 20, f: 17 },
  ActiveLifestyle: { p: 20, q: 34, b: 10, e: 10, f: 26 },
};
const SEG_QUAL: Record<Seg, number> = { Budget: 50, General: 65, Enthusiast: 80, Professional: 90, ActiveLifestyle: 70 };
const SEG_MAT: Record<Seg, number> = { Budget: 60, General: 150, Enthusiast: 350, Professional: 600, ActiveLifestyle: 250 };
const SEG_DEMAND: Record<Seg, number> = { Budget: 500000, General: 400000, Enthusiast: 200000, Professional: 100000, ActiveLifestyle: 150000 };
const SEG_PRICE: Record<Seg, [number, number]> = { Budget: [100, 300], General: [300, 600], Enthusiast: [600, 1000], Professional: [1000, 1500], ActiveLifestyle: [400, 800] };
const SAT_WEIGHTS = { quality: 0.30, delivery: 0.25, price: 0.20, service: 0.10, brand: 0.15 };

const ECON_TRANS: Record<string, Record<string, number>> = {
  expansion: { expansion: 0.7, peak: 0.3 },
  peak: { expansion: 0.1, peak: 0.3, contraction: 0.6 },
  contraction: { contraction: 0.5, trough: 0.5 },
  trough: { expansion: 0.6, contraction: 0.2, trough: 0.2 },
};

// ─── UTILITIES ──────────────────────────────────────────────────────────────
const R = (lo: number, hi: number) => Math.random() * (hi - lo) + lo;
const RI = (lo: number, hi: number) => Math.floor(R(lo, hi + 1));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ok = (v: number) => Number.isFinite(v) && !Number.isNaN(v);

// ─── FORMULA IMPLEMENTATIONS ───────────────────────────────────────────────

// §9.1 Softmax
function softmax(scores: number[]) {
  const mx = Math.max(...scores);
  const ex = scores.map((s) => Math.exp((s - mx) / C.SOFTMAX_T));
  const sm = ex.reduce((a, b) => a + b, 0);
  return sm === 0 ? scores.map(() => 1 / scores.length) : ex.map((e) => e / sm);
}

// §9.2 Price Score
function priceScore(price: number, expected: number, weight: number, matCost: number) {
  if (expected === 0) return { s: 0, flag: "div0", clean: false, price, floor: matCost + C.LABOR + C.OVERHEAD, fm: 1 };
  const adv = (expected - price) / expected;
  const sig = Math.tanh(adv * 2) * 0.5 + 0.5;
  const floor = matCost + C.LABOR + C.OVERHEAD;
  let fm = 1;
  if (price < floor) { const b = (floor - price) / floor; fm = Math.max(0.5, 1 - b); }
  const s = sig * weight * fm;
  return { s, clean: ok(s) && s >= 0, price, floor, fm };
}

// §9.2 Quality Score (3-zone) with RB quality expectation boost
function qualScore(quality: number, baseExpect: number, weight: number, rbBoost = 0) {
  const expect = baseExpect + rbBoost;
  if (expect === 0) return { s: 0, ratio: 0, mult: 0, clean: false };
  const ratio = quality / expect;
  let mult;
  if (ratio >= 1.0) mult = 1.0 + Math.sqrt(ratio - 1) * 0.5;
  else if (ratio < 0.7) mult = (ratio * ratio) / 0.49;
  else mult = ratio;
  mult = Math.min(C.QUALITY_CAP, mult);
  const s = mult * weight;
  return { s, ratio, mult, clean: ok(s) && s >= 0 };
}

// §9.2 Brand Score (sqrt version)
function brandScore(bv: number, weight: number) {
  let m = 1;
  if (bv > C.BRAND_HIGH) m = C.BRAND_HIGH_M;
  else if (bv < C.BRAND_LOW) m = C.BRAND_LOW_M;
  const s = Math.sqrt(Math.max(0, bv)) * weight * m;
  return { s, clean: ok(s) && s >= 0 };
}

// §3.8 ESG Revenue Modifier
function esgModifier(score: number) {
  if (score >= C.ESG_HIGH_THRESH) return { mod: 1 + C.ESG_HIGH_BONUS, tier: "high" };
  if (score >= C.ESG_MID_THRESH) return { mod: 1 + C.ESG_MID_BONUS, tier: "mid" };
  if (score >= C.ESG_PEN_THRESH) return { mod: 1.0, tier: "neutral" };
  const rate = C.ESG_PEN_MAX - (score / C.ESG_PEN_THRESH) * (C.ESG_PEN_MAX - C.ESG_PEN_MIN);
  return { mod: 1 - rate, tier: "penalty" };
}

// §6 Market Cap
function marketCap(eps: number, shares: number, rev: number, sent: number, book: number, assets: number, epsGrowth: number, margin: number, de: number) {
  let mc;
  if (eps > 0) {
    let pe = C.PE_BASE + Math.min(10, epsGrowth * 50) + (sent - 50) / 5;
    pe += margin > 0.15 ? 3 : margin > 0.05 ? 1 : -2;
    pe += de > 0.6 ? -5 : de > 0.3 ? -2 : 0;
    pe = clamp(pe, C.PE_MIN, C.PE_MAX);
    mc = eps * shares * pe;
  } else {
    const pts = Math.max(0.5, 2 + (sent - 50) / 25);
    mc = rev * pts;
  }
  return { mc: Math.max(mc, Math.max(book * 0.5, assets * 0.3)), clean: ok(mc) };
}

// §4 Production
function production(workers: number, eff: number, wEff: number, wSpd: number, autoMult: number) {
  const u = Math.floor(workers * 100 * eff * (wEff / 100) * (wSpd / 100) * autoMult);
  return { u, clean: ok(u) && u >= 0 };
}

// §14 Experience Curve (Wright's Law)
function experienceCurve(cumUnits: number, baseLR = C.LEARN_RATE) {
  if (cumUnits <= 10000) return 1.0;
  const mult = Math.pow(baseLR, Math.log2(cumUnits / 10000));
  return Math.max(C.LEARN_FLOOR, mult);
}

// §9.6 Rubber-Banding
function rubberBand(teamAvg: number, numTeams: number) {
  const ga = 1 / numTeams;
  if (ga === 0) return { pos: 0, cr: 0, pb: 0, bdm: 1, qeb: 0 };
  const pos = (teamAvg - ga) / ga;
  let cr = 0, pb = 0, bdm = 1, qeb = 0;
  if (pos < 0) {
    cr = Math.tanh(Math.abs(pos) * C.RB_COST_SENS) * C.RB_COST_MAX;
    pb = Math.tanh(Math.abs(pos) * C.RB_PERC_SENS) * C.RB_PERC_MAX;
  } else {
    const d = Math.tanh(pos * C.RB_DRAG_SENS) * C.RB_DRAG_MAX;
    bdm = 1 + d; qeb = d * C.RB_QUAL_BOOST;
  }
  return { pos, cr, pb, bdm, qeb };
}

// §7 Advertising (diminishing returns)
function adImpact(budget: number, segMult = 1.0) {
  let total = 0, eff = 1.0;
  const chunks = Math.floor(budget / C.AD_CHUNK);
  for (let i = 0; i < chunks; i++) {
    total += C.AD_CHUNK * C.AD_BASE * eff * segMult;
    eff *= (1 - C.AD_DECAY);
  }
  return { impact: total, finalEff: eff };
}

// §7 Branding (linear then log)
function brandingImpact(budget: number) {
  const m = budget / 1e6;
  if (m <= 2) return m * C.BRAND_BASE;
  return 2 * C.BRAND_BASE + C.BRAND_BASE * C.BRAND_LOG_M * Math.log2(1 + (m - 2) / 2);
}

// §5 HR Salary
function salary(base: number, avgStat: number) {
  return Math.min(C.SAL_CAP, Math.round(base * (C.SAL_MIN + (avgStat / 100) * (C.SAL_MAX - C.SAL_MIN))));
}

// §5 Turnover
function turnover(morale: number, loyalty: number, burnout: number) {
  let mr = C.TURNOVER_BASE / 12;
  if (morale < 50) mr += 0.15 / 12;
  mr *= (150 - loyalty) / 100;
  if (burnout > 50) mr += 0.1 / 12;
  return mr;
}

// §5 Burnout
function burnoutCalc(current: number, morale: number) {
  const stress = Math.max(0, (50 - morale) / 100);
  const gain = 3 + stress * 10;
  let b = current + gain;
  if (morale >= 70) b -= (morale - 70) / 10;
  return clamp(b, 0, 100);
}

// §12 Machinery Breakdown
function breakdownProb(backlog: number, age: number, burnoutLvl: number, prevMaint: number, maintEff: number) {
  let p = 0.03 + (backlog / 1000) * 0.05 + (age / 10) * 0.02;
  if (burnoutLvl > 50) p += 0.05;
  p -= (prevMaint / 1e6) * 0.02;
  p *= (2 - maintEff);
  return clamp(p, 0.01, 0.5);
}

// §16.2 Credit Rating
function creditRating(de: number, coverage: number, current: number, profitMargin: number) {
  let s = 100;
  if (de > 1.5) s -= 40; else if (de > 1) s -= 25; else if (de > 0.6) s -= 15; else if (de > 0.3) s -= 5;
  if (coverage < 1.5) s -= 30; else if (coverage < 3) s -= 20; else if (coverage < 5) s -= 10;
  if (current < 1) s -= 15; else if (current < 1.5) s -= 10; else if (current < 2) s -= 5;
  if (profitMargin < 0) s -= 15; else if (profitMargin < 0.05) s -= 10; else if (profitMargin < 0.1) s -= 5;
  const grades: [string, number][] = [["AAA", 90], ["AA", 80], ["A", 70], ["BBB", 60], ["BB", 50], ["B", 40], ["CCC", 20], ["D", 0]];
  const grade = grades.find(([, t]) => s >= t)?.[0] || "D";
  return { score: s, grade };
}

// §10 Economic Demand Multiplier
function econDemandMult(gdp: number, confidence: number, inflation: number, growth: number, rng: number) {
  return (1 + gdp / 100) * (confidence / 75) * (1 - inflation / 100 * 0.5) * (1 + growth) * (0.95 + rng * 0.1);
}

// §10.5 Working Capital
function workingCapital(revenue: number, costs: number) {
  const ar = revenue * (30 / 90);
  const ap = costs * 0.7 * (45 / 90);
  const wc = ar - ap;
  const wcCost = Math.max(0, wc) * (0.08 / 4);
  return { ar, ap, wc, wcCost, clean: ok(wcCost) };
}

// §10.4 Unit Cost (with experience curve)
function unitCost(matCost: number, quality: number, efficiency: number, expMult: number) {
  const qualMult = 1 + (quality - 50) / 100;
  return (matCost * qualMult / Math.max(0.01, efficiency)) * expMult + C.LABOR + C.OVERHEAD;
}

// §8 R&D Patent generation
function patents(rdProgress: number) {
  const p = Math.floor(rdProgress / C.PATENT_THRESHOLD);
  return {
    count: p,
    qualBonus: Math.min(C.PATENT_QUAL_MAX, p * 5),
    costRed: Math.min(C.PATENT_COST_MAX, p * 0.05),
    shareBonus: Math.min(C.PATENT_SHARE_MAX, p * 0.03),
  };
}

// ─── TEST MODULES ───────────────────────────────────────────────────────────

interface Anomaly { t: string; d: string; }

function testSoftmax(n: number) {
  const a: Anomaly[] = [], shareDevs: { spread: number; dev: number; teams: number }[] = [];
  for (let i = 0; i < n; i++) {
    const k = RI(2, 5);
    const scores = Array.from({ length: k }, () => R(-100, 200));
    const sh = softmax(scores);
    const sum = sh.reduce((x, y) => x + y, 0);
    const dev = Math.abs(sum - 1);
    shareDevs.push({ spread: Math.max(...scores) - Math.min(...scores), dev, teams: k });
    if (dev > 1e-6) a.push({ t: "SHARE_SUM", d: `sum=${sum.toFixed(10)}` });
    if (sh.some((s) => !ok(s))) a.push({ t: "NAN", d: `scores=[${scores.map((s) => s.toFixed(0))}]` });
    if (sh.some((s) => s < -1e-10)) a.push({ t: "NEG", d: "negative share" });
  }
  const seed = 42;
  const rng1 = mulberry32(seed), rng2 = mulberry32(seed);
  let deterFail = false;
  for (let i = 0; i < 100; i++) { if (rng1() !== rng2()) { deterFail = true; break; } }
  if (deterFail) a.push({ t: "DETERMINISM", d: "Mulberry32 non-deterministic" });
  return { anomalies: a, shareDevs };
}

function testPricing(n: number) {
  const a: Anomaly[] = [], pts: { price: number; expected: number; score: number; seg: string; belowFloor: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const seg = SEGS[RI(0, 4)];
    const w = SEG_W[seg].p;
    const mat = SEG_MAT[seg];
    const exp = R(-50, 2000);
    const price = R(-200, 3000);
    const r = priceScore(price, exp, w, mat);
    pts.push({ price, expected: exp, score: r.s, seg, belowFloor: price < r.floor });
    if (!r.clean) a.push({ t: "NAN", d: `p=${price.toFixed(0)} exp=${exp.toFixed(0)} seg=${seg}` });
    if (price < 0 && r.s > 0) a.push({ t: "EXPLOIT", d: `Negative price $${price.toFixed(0)} -> score ${r.s.toFixed(2)}` });
    if (exp <= 0 && r.clean === false) a.push({ t: "DIV0", d: `expectedPrice=${exp.toFixed(0)}` });
  }
  return { anomalies: a, pts };
}

function testQuality(n: number) {
  const a: Anomaly[] = [], pts: { quality: number; ratio: number; score: number; seg: string }[] = [];
  const capViol = { count: 0 };
  for (let i = 0; i < n; i++) {
    const seg = SEGS[RI(0, 4)];
    const q = R(0, 200);
    const boost = R(0, 5);
    const r = qualScore(q, SEG_QUAL[seg], SEG_W[seg].q, boost);
    pts.push({ quality: q, ratio: r.ratio, score: r.s, seg });
    if (r.mult > C.QUALITY_CAP + 0.001) { a.push({ t: "CAP", d: `mult=${r.mult.toFixed(4)} > ${C.QUALITY_CAP}` }); capViol.count++; }
    if (!r.clean) a.push({ t: "NAN", d: `q=${q.toFixed(0)} seg=${seg}` });
    if (r.s < -1e-10) a.push({ t: "NEG", d: `score=${r.s.toFixed(4)}` });
  }
  for (const seg of SEGS) {
    const e = SEG_QUAL[seg];
    const q70 = e * 0.7;
    const below = qualScore(q70 - 0.01, e, SEG_W[seg].q);
    const above = qualScore(q70 + 0.01, e, SEG_W[seg].q);
    if (Math.abs(below.s - above.s) > 2) a.push({ t: "DISCONTINUITY", d: `${seg} at 0.7 ratio: ${below.s.toFixed(2)} vs ${above.s.toFixed(2)}` });
  }
  return { anomalies: a, pts, capViol };
}

function testBrand(n: number) {
  const a: Anomaly[] = [], pts: { bv: number; score: number; seg: string }[] = [];
  for (let i = 0; i < n; i++) {
    const bv = R(-0.1, 1.5);
    const seg = SEGS[RI(0, 4)];
    const r = brandScore(bv, SEG_W[seg].b);
    pts.push({ bv, score: r.s, seg });
    if (!r.clean) a.push({ t: "NAN", d: `bv=${bv.toFixed(3)}` });
    if (bv < 0 && r.s > 0) a.push({ t: "BOUNDARY", d: `negative brand ${bv.toFixed(3)} -> positive score` });
  }
  const sqrtData: { bv: number; sqrt: number; linear: number }[] = [];
  for (let bv = 0; bv <= 1; bv += 0.01) {
    sqrtData.push({ bv: +bv.toFixed(2), sqrt: Math.sqrt(bv) * 10, linear: bv * 10 });
  }
  return { anomalies: a, pts, sqrtData };
}

function testESG(n: number) {
  const a: Anomaly[] = [], pts: { esg: number; mod: number; tier: string }[] = [];
  for (let i = 0; i < n; i++) {
    const score = R(-50, 1200);
    const r = esgModifier(Math.max(0, score));
    pts.push({ esg: score, mod: r.mod, tier: r.tier });
    if (!ok(r.mod)) a.push({ t: "NAN", d: `esg=${score.toFixed(0)}` });
    if (r.mod < 0) a.push({ t: "NEG", d: `modifier ${r.mod.toFixed(3)} < 0` });
    if (r.mod > 1.06) a.push({ t: "OVERFLOW", d: `modifier ${r.mod.toFixed(3)} exceeds 1+5%` });
  }
  for (const thresh of [300, 400, 700]) {
    const below = esgModifier(thresh - 1);
    const at = esgModifier(thresh);
    if (Math.abs(below.mod - at.mod) > 0.03) a.push({ t: "DISCONTINUITY", d: `ESG ${thresh - 1}->${thresh}: ${below.mod.toFixed(4)}->${at.mod.toFixed(4)}` });
  }
  return { anomalies: a, pts };
}

function testMarketCap(n: number) {
  const a: Anomaly[] = [], pts: { eps: number; mc: number; shares: number }[] = [];
  let floorHits = 0;
  for (let i = 0; i < n; i++) {
    const eps = R(-50, 150), shares = RI(C.MIN_SHARES, 20e6), rev = R(0, 3e9);
    const sent = R(0, 100), book = R(0, 500e6), assets = R(0, 1e9);
    const growth = R(-2, 5), margin = R(-0.5, 0.4), de = R(0, 3);
    const r = marketCap(eps, shares, rev, sent, book, assets, growth, margin, de);
    pts.push({ eps, mc: r.mc, shares });
    if (!r.clean) a.push({ t: "NAN", d: `eps=${eps.toFixed(2)}` });
    if (r.mc < 0) a.push({ t: "NEG", d: `MC=$${(r.mc / 1e6).toFixed(0)}M` });
    if (r.mc > 5e12) a.push({ t: "OVERFLOW", d: `MC=$${(r.mc / 1e12).toFixed(1)}T` });
    if (r.mc === Math.max(book * 0.5, assets * 0.3)) floorHits++;
    if (Math.abs(eps) < 0.01) {
      const pos = marketCap(0.01, shares, rev, sent, book, assets, growth, margin, de);
      const neg = marketCap(-0.01, shares, rev, sent, book, assets, growth, margin, de);
      if (Math.abs(pos.mc - neg.mc) / Math.max(1, pos.mc) > 0.5) {
        a.push({ t: "DISCONTINUITY", d: `EPS 0+/- jump: ${(pos.mc / 1e6).toFixed(0)}M vs ${(neg.mc / 1e6).toFixed(0)}M` });
      }
    }
  }
  return { anomalies: a, pts, floorHits };
}

function testProduction(n: number) {
  const a: Anomaly[] = [], pts: { workers: number; units: number; overCap: boolean; auto: number }[] = [];
  for (let i = 0; i < n; i++) {
    const w = RI(0, 2000), eff = R(0, 1.5), we = R(0, 200), ws = R(0, 200);
    const auto = Math.random() > 0.7 ? 5 : 1;
    const r = production(w, eff, we, ws, auto);
    const cap = 10 * 50000;
    pts.push({ workers: w, units: r.u, overCap: r.u > cap, auto });
    if (!r.clean) a.push({ t: "NAN", d: `w=${w} eff=${eff.toFixed(2)}` });
    if (r.u > cap) a.push({ t: "OVERFLOW", d: `${r.u.toLocaleString()} > ${cap.toLocaleString()} cap` });
    if (r.u < 0) a.push({ t: "NEG", d: `negative units` });
  }
  return { anomalies: a, pts };
}

function testExperienceCurve(n: number) {
  const a: Anomaly[] = [], pts: { cumUnits: number; mult: number; lr: number }[] = [];
  for (let i = 0; i < n; i++) {
    const cum = Math.pow(10, R(3, 9));
    const lr = R(0.7, 0.95);
    const mult = experienceCurve(cum, lr);
    pts.push({ cumUnits: cum, mult, lr });
    if (!ok(mult)) a.push({ t: "NAN", d: `cum=${cum.toFixed(0)}` });
    if (mult < C.LEARN_FLOOR - 0.001) a.push({ t: "UNDERFLOW", d: `mult=${mult.toFixed(4)} < floor ${C.LEARN_FLOOR}` });
    if (mult > 1.001) a.push({ t: "OVERFLOW", d: `mult=${mult.toFixed(4)} > 1.0` });
  }
  let prev = 1;
  for (let u = 10000; u <= 1e8; u *= 2) {
    const m = experienceCurve(u);
    if (m > prev + 0.001) a.push({ t: "MONOTONE", d: `cost increased at ${u}: ${m.toFixed(4)} > ${prev.toFixed(4)}` });
    prev = m;
  }
  return { anomalies: a, pts };
}

function testRubberBanding(n: number) {
  const a: Anomaly[] = [], pts: (ReturnType<typeof rubberBand> & { share: number; teams: number })[] = [];
  const continuity: { pos: string; cr: number; pb: number; drag: number }[] = [];
  for (let i = 0; i < n; i++) {
    const teams = RI(2, 5);
    const share = R(0, 1);
    const rb = rubberBand(share, teams);
    pts.push({ share, ...rb, teams });
    if (rb.cr > C.RB_COST_MAX + 1e-9) a.push({ t: "OVERFLOW", d: `cr=${rb.cr}` });
    if (rb.pb > C.RB_PERC_MAX + 1e-9) a.push({ t: "OVERFLOW", d: `pb=${rb.pb}` });
    if (rb.bdm > 1 + C.RB_DRAG_MAX + 1e-9) a.push({ t: "OVERFLOW", d: `bdm=${rb.bdm}` });
    if (!ok(rb.pos)) a.push({ t: "NAN", d: `pos NaN share=${share}` });
    if (rb.cr < -1e-9) a.push({ t: "NEG", d: `negative cost relief` });
    if (rb.pos > 0 && rb.cr > 1e-9) a.push({ t: "EXPLOIT", d: `leader (pos=${rb.pos.toFixed(2)}) getting cost relief` });
    if (rb.pos < 0 && rb.bdm > 1.001) a.push({ t: "EXPLOIT", d: `trailer getting brand drag` });
  }
  for (let p = -0.02; p <= 0.02; p += 0.0002) {
    const share = (1 / 4) + p * (1 / 4);
    const rb = rubberBand(share, 4);
    continuity.push({ pos: rb.pos.toFixed(4), cr: rb.cr, pb: rb.pb, drag: rb.bdm - 1 });
  }
  return { anomalies: a, pts, continuity };
}

function testHR(n: number) {
  const a: Anomaly[] = [];
  const salData: { stat: number; salary: number; role: string }[] = [];
  const turnData: { morale: number; loyalty: number; turnover: number }[] = [];
  const burnData: { prev: number; morale: number; newBurn: number }[] = [];
  for (let i = 0; i < n; i++) {
    const stat = R(0, 200);
    for (const [role, base] of [["worker", C.WORKER_BASE], ["eng", C.ENG_BASE], ["sup", C.SUP_BASE]] as const) {
      const s = salary(base, stat);
      salData.push({ stat, salary: s, role });
      if (s > C.SAL_CAP) a.push({ t: "OVERFLOW", d: `${role} stat=${stat.toFixed(0)} sal=${s}` });
      if (s < 0) a.push({ t: "NEG", d: `negative salary` });
    }
    const morale = R(0, 100), loyalty = R(0, 150), burnoutVal = R(0, 100);
    const tr = turnover(morale, loyalty, burnoutVal);
    turnData.push({ morale, loyalty, turnover: tr });
    if (tr < 0) a.push({ t: "NEG", d: `negative turnover morale=${morale.toFixed(0)}` });
    if (!ok(tr)) a.push({ t: "NAN", d: `turnover NaN` });
    const newBurn = burnoutCalc(burnoutVal, morale);
    burnData.push({ prev: burnoutVal, morale, newBurn });
    if (newBurn < 0 || newBurn > 100) a.push({ t: "BOUNDARY", d: `burnout=${newBurn.toFixed(1)} out of [0,100]` });
  }
  for (let progs = 0; progs < 8; progs++) {
    const eff = progs <= C.TRAIN_FATIGUE_THRESH ? 1.0 : Math.max(0.2, 1 - (progs - 1) * C.TRAIN_FATIGUE_PEN);
    if (eff < 0) a.push({ t: "NEG", d: `training eff negative at ${progs} programs` });
  }
  return { anomalies: a, salData: salData.slice(0, 500), turnData: turnData.slice(0, 500), burnData: burnData.slice(0, 500) };
}

function testMachinery(n: number) {
  const a: Anomaly[] = [], pts: { backlog: number; age: number; prob: number; burn: number }[] = [];
  for (let i = 0; i < n; i++) {
    const backlog = R(0, 5000), age = R(0, 60), burn = R(0, 100);
    const prevMaint = R(0, 5e6), maintEff = R(0.5, 1.5);
    const p = breakdownProb(backlog, age, burn, prevMaint, maintEff);
    pts.push({ backlog, age, prob: p, burn });
    if (p < 0.01 - 1e-9) a.push({ t: "UNDERFLOW", d: `prob=${p.toFixed(4)} < 1%` });
    if (p > 0.50 + 1e-9) a.push({ t: "OVERFLOW", d: `prob=${p.toFixed(4)} > 50%` });
    if (!ok(p)) a.push({ t: "NAN", d: `breakdown NaN` });
  }
  return { anomalies: a, pts };
}

function testWorkingCapital(n: number) {
  const a: Anomaly[] = [], pts: { rev: number; costs: number; wc: number; wcCost: number }[] = [];
  for (let i = 0; i < n; i++) {
    const rev = R(0, 2e9), costs = R(0, 2e9);
    const r = workingCapital(rev, costs);
    pts.push({ rev: rev / 1e6, costs: costs / 1e6, wc: r.wc / 1e6, wcCost: r.wcCost / 1e6 });
    if (!r.clean) a.push({ t: "NAN", d: `rev=${rev.toFixed(0)}` });
    if (r.wcCost < 0) a.push({ t: "NEG", d: `negative WC cost` });
  }
  return { anomalies: a, pts };
}

function testUnitCost(n: number) {
  const a: Anomaly[] = [], pts: { quality: number; efficiency: number; cost: number; seg: string; expMult: number }[] = [];
  for (let i = 0; i < n; i++) {
    const seg = SEGS[RI(0, 4)];
    const qual = R(30, 150), eff = R(0.1, 1.0), cumUnits = Math.pow(10, R(3, 8));
    const expM = experienceCurve(cumUnits);
    const uc = unitCost(SEG_MAT[seg], qual, eff, expM);
    pts.push({ quality: qual, efficiency: eff, cost: uc, seg, expMult: expM });
    if (!ok(uc)) a.push({ t: "NAN", d: `q=${qual.toFixed(0)} eff=${eff.toFixed(2)} seg=${seg}` });
    if (uc < 0) a.push({ t: "NEG", d: `negative unit cost $${uc.toFixed(2)}` });
    if (eff < 0.05 && uc > 50000) a.push({ t: "OVERFLOW", d: `unit cost $${uc.toFixed(0)} at eff=${eff.toFixed(2)}` });
  }
  return { anomalies: a, pts };
}

function testCreditRating(n: number) {
  const a: Anomaly[] = [], pts: { de: number; coverage: number; current: number; margin: number; score: number; grade: string }[] = [];
  for (let i = 0; i < n; i++) {
    const de = R(0, 3), cov = R(0, 10), cur = R(0, 4), margin = R(-0.3, 0.3);
    const r = creditRating(de, cov, cur, margin);
    pts.push({ de, coverage: cov, current: cur, margin, score: r.score, grade: r.grade });
    if (r.score < 0) a.push({ t: "UNDERFLOW", d: `score ${r.score} < 0` });
    if (r.score > 100) a.push({ t: "OVERFLOW", d: `score ${r.score} > 100` });
  }
  return { anomalies: a, pts };
}

function testEconCycle(n: number) {
  const a: Anomaly[] = [];
  const demandPts: { gdp: number; confidence: number; inflation: number; mult: number }[] = [];
  for (let i = 0; i < n; i++) {
    const gdp = R(-5, 10), conf = R(20, 100), inf = R(0, 15), growth = R(-0.05, 0.1);
    const noise = R(0, 1);
    const dm = econDemandMult(gdp, conf, inf, growth, noise);
    demandPts.push({ gdp, confidence: conf, inflation: inf, mult: dm });
    if (!ok(dm)) a.push({ t: "NAN", d: `gdp=${gdp.toFixed(1)}` });
    if (dm < 0) a.push({ t: "NEG", d: `negative demand mult` });
    if (dm > 5) a.push({ t: "OVERFLOW", d: `demand mult ${dm.toFixed(2)}` });
  }
  for (const [from, tos] of Object.entries(ECON_TRANS)) {
    const sum = Object.values(tos).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) a.push({ t: "PROBABILITY", d: `${from} transitions sum to ${sum.toFixed(2)}` });
  }
  return { anomalies: a, demandPts };
}

// ─── FULL GAME SIMULATION ───────────────────────────────────────────────────

const STRATEGIES: Record<string, { label: string; color: string; desc: string }> = {
  rdDump: { label: "R&D Dump", color: "#ef4444", desc: "70% cash to R&D rounds 1-3" },
  balanced: { label: "Balanced", color: "#3b82f6", desc: "Even split across departments" },
  brandBlitz: { label: "Brand Blitz", color: "#a855f7", desc: "50% cash to marketing" },
  debtSpiral: { label: "Debt Spiral", color: "#f97316", desc: "Max debt, reinvest everything" },
  patentTroll: { label: "Patent Troll", color: "#eab308", desc: "R&D only, no production" },
  expCurve: { label: "Exp Curve", color: "#22c55e", desc: "Mass produce budget, ride cost curve" },
  tank: { label: "Tanker", color: "#64748b", desc: "Tank share for RB relief, re-enter" },
};

interface ExploitFlag { strat: string; rate: string; expected: string; verdict: string }

function runFullSim(games: number, rounds = 20) {
  const res: {
    anomalies: Anomaly[];
    wins: Record<string, number>;
    bankruptcies: number;
    cashPaths: { strat: string; data: { round: number; cash: number }[] }[][];
    sharePaths: { strat: string; data: { round: number; share: number }[] }[][];
    exploitFlags: ExploitFlag[];
  } = { anomalies: [], wins: {}, bankruptcies: 0, cashPaths: [], sharePaths: [], exploitFlags: [] };
  Object.keys(STRATEGIES).forEach((k) => (res.wins[k] = 0));
  const strats = Object.keys(STRATEGIES);

  for (let g = 0; g < games; g++) {
    const teams = strats.map((s, i) => ({
      id: i, strat: s, cash: C.STARTING_CASH, brand: C.BRAND_INIT, esg: 100,
      quality: Object.fromEntries(SEGS.map((seg) => [seg, SEG_QUAL[seg]])) as Record<Seg, number>,
      production: 50000, rdProg: 0, patents: 0, shares: C.SHARES,
      mc: C.MARKET_CAP, cumUnits: 10000, morale: 75, burnout: 20,
      debt: 0, revenue: 0, netIncome: 0, satisfaction: 50,
    }));
    const cashHist = teams.map((t) => ({ strat: t.strat, data: [] as { round: number; cash: number }[] }));
    const shareHist = teams.map((t) => ({ strat: t.strat, data: [] as { round: number; share: number }[] }));

    for (let r = 1; r <= rounds; r++) {
      teams.forEach((t) => {
        let rdS = 0, mktS = 0, esgS = 0, debtNew = 0;
        const avail = Math.max(0, t.cash);
        switch (t.strat) {
          case "rdDump": rdS = r <= 3 ? avail * 0.7 : avail * 0.3; mktS = avail * 0.1; break;
          case "balanced": rdS = avail * 0.2; mktS = avail * 0.15; esgS = avail * 0.05; break;
          case "brandBlitz": mktS = avail * 0.5; esgS = avail * 0.1; rdS = avail * 0.05; break;
          case "debtSpiral": debtNew = 50e6; rdS = (avail + debtNew) * 0.3; mktS = (avail + debtNew) * 0.2; break;
          case "patentTroll": rdS = avail * 0.8; t.production = 0; break;
          case "expCurve": rdS = avail * 0.05; mktS = avail * 0.1; t.production = 200000; break;
          case "tank": if (r <= 5 || r > 8) { rdS = avail * 0.2; mktS = avail * 0.15; } else { t.production = 0; } break;
        }
        t.cash += debtNew; t.debt += debtNew;
        const rdPts = Math.floor(rdS / 100000);
        t.rdProg += rdPts;
        const pat = patents(t.rdProg);
        t.patents = pat.count;
        SEGS.forEach((s) => { t.quality[s] = clamp(SEG_QUAL[s] + pat.qualBonus + R(-3, 8), 20, 200); });
        const ai = adImpact(mktS);
        const bi = brandingImpact(mktS * 0.3);
        t.brand = clamp(t.brand + Math.min(C.BRAND_MAX_GROWTH, ai.impact + bi) - C.BRAND_DECAY, 0, 1);
        t.esg = clamp(t.esg + esgS / 1e6 * 8, 0, 1200);
        const fixedCosts = 5e6 + t.debt * 0.06 / 4;
        t.cash -= (rdS + mktS + esgS + fixedCosts);
        t.morale = clamp(t.morale + R(-3, 3), 0, 100);
        t.burnout = burnoutCalc(t.burnout, t.morale);
      });

      const segShares: Record<string, number[]> = {};
      SEGS.forEach((seg) => {
        const w = SEG_W[seg];
        const scores = teams.map((t) => {
          const price = (SEG_PRICE[seg][0] + SEG_PRICE[seg][1]) / 2;
          const ps = priceScore(price, price * R(0.8, 1.2), w.p, SEG_MAT[seg]).s;
          const qs = qualScore(t.quality[seg], SEG_QUAL[seg], w.q).s;
          const bs = brandScore(t.brand, w.b).s;
          const es = (t.esg / 1000) * w.e;
          const fs = R(0.3, 0.8) * w.f;
          return ps + qs + bs + es + fs + t.quality[seg] * C.QUALITY_SHARE_BONUS;
        });
        segShares[seg] = softmax(scores);
      });

      teams.forEach((t, i) => {
        let totalRev = 0;
        const expMult = experienceCurve(t.cumUnits);
        SEGS.forEach((seg) => {
          const demand = SEG_DEMAND[seg];
          const share = segShares[seg][i];
          const units = Math.min(t.production, Math.floor(demand * share));
          const price = (SEG_PRICE[seg][0] + SEG_PRICE[seg][1]) / 2;
          totalRev += units * price;
          t.cumUnits += units;
          const uc = unitCost(SEG_MAT[seg], t.quality[seg], 0.7, expMult);
          t.cash -= units * uc * (1 - Math.min(0.12, patents(t.rdProg).costRed));
        });
        const esgMod = esgModifier(t.esg);
        totalRev *= esgMod.mod;
        t.revenue = totalRev;
        t.cash += totalRev;
        t.netIncome = totalRev - 5e6;
        const eps = t.netIncome / t.shares;
        const mc = marketCap(eps, t.shares, totalRev, 50, t.cash * 0.5, t.cash, R(-1, 2), 0.1, t.debt / Math.max(1, t.cash));
        t.mc = mc.mc;
        if (!mc.clean) res.anomalies.push({ t: "NAN", d: `Game ${g} R${r} team ${i} MC NaN` });
        cashHist[i].data.push({ round: r, cash: t.cash });
        const avgShare = SEGS.reduce((a, s) => a + segShares[s][i], 0) / SEGS.length;
        shareHist[i].data.push({ round: r, share: avgShare });
      });
    }

    const winner = teams.reduce((a, b) => (a.mc > b.mc ? a : b));
    res.wins[winner.strat]++;
    teams.forEach((t) => { if (t.cash < 0) res.bankruptcies++; });
    if (g < 3) { res.cashPaths.push(cashHist); res.sharePaths.push(shareHist); }
  }

  const total = games;
  const expected = 1 / strats.length;
  for (const [s, w] of Object.entries(res.wins)) {
    const rate = w / total;
    if (rate > expected * 2) res.exploitFlags.push({ strat: s, rate: (rate * 100).toFixed(1) + "%", expected: (expected * 100).toFixed(1) + "%", verdict: "DOMINANT" });
    else if (rate > expected * 1.5) res.exploitFlags.push({ strat: s, rate: (rate * 100).toFixed(1) + "%", expected: (expected * 100).toFixed(1) + "%", verdict: "STRONG" });
  }
  return res;
}

// ─── UI ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "dash", label: "Dashboard" }, { id: "softmax", label: "Softmax" },
  { id: "pricing", label: "Pricing" }, { id: "quality", label: "Quality" },
  { id: "brand", label: "Brand" }, { id: "esg", label: "ESG" },
  { id: "mc", label: "Market Cap" }, { id: "prod", label: "Production" },
  { id: "exp", label: "Exp Curve" }, { id: "rb", label: "Rubber-Band" },
  { id: "hr", label: "HR" }, { id: "mach", label: "Machinery" },
  { id: "wc", label: "Working Cap" }, { id: "unitcost", label: "Unit Cost" },
  { id: "credit", label: "Credit Rating" }, { id: "econ", label: "Economy" },
  { id: "sim", label: "Full Sim" },
];

const P = { bg: "#0a0c10", card: "#0d1117", border: "#1b1f27", text: "#b0b8c4", bright: "#e6edf3", dim: "#484f58", red: "#f85149", orange: "#f0883e", yellow: "#d29922", green: "#3fb950", blue: "#58a6ff", purple: "#bc8cff", cyan: "#39d353" };

const Badge = ({ n, label }: { n: number; label: string }) => {
  const c = n === 0 ? P.green : n < 5 ? P.yellow : P.red;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 3, fontSize: 11, fontWeight: 600, background: c + "15", color: c, border: `1px solid ${c}30`, fontFamily: "monospace" }}>{n === 0 ? "PASS" : `${n} ${label}`}</span>;
};

const Stat = ({ label, value, sub, color = P.bright }: { label: string; value: string | number; sub?: string; color?: string }) => (
  <div style={{ padding: "12px 16px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 4, minWidth: 120 }}>
    <div style={{ fontSize: 10, color: P.dim, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Courier New', monospace", marginTop: 2 }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: P.dim, marginTop: 1 }}>{sub}</div>}
  </div>
);

const AnomalyTable = ({ rows, max = 20 }: { rows: Anomaly[]; max?: number }) => {
  if (!rows?.length) return <div style={{ color: P.green, padding: 10, fontSize: 12, fontFamily: "monospace" }}>No anomalies.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "monospace" }}>
        <thead><tr style={{ borderBottom: `1px solid ${P.border}` }}>
          <th style={{ padding: "6px 10px", textAlign: "left", color: P.dim }}>TYPE</th>
          <th style={{ padding: "6px 10px", textAlign: "left", color: P.dim }}>DETAIL</th>
        </tr></thead>
        <tbody>
          {rows.slice(0, max).map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${P.bg}` }}>
              <td style={{ padding: "4px 10px", color: r.t === "EXPLOIT" ? P.orange : r.t === "NAN" || r.t === "DIV0" ? P.red : P.yellow }}>{r.t}</td>
              <td style={{ padding: "4px 10px", color: P.text }}>{r.d}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > max && <div style={{ padding: 6, fontSize: 10, color: P.dim }}>+{rows.length - max} more</div>}
    </div>
  );
};

const ChartBox = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 4, padding: 14, marginBottom: 14 }}>
    {title && <div style={{ fontSize: 11, color: P.dim, marginBottom: 6 }}>{title}</div>}
    <ResponsiveContainer width="100%" height={240}>{children}</ResponsiveContainer>
  </div>
);

const TT = { contentStyle: { background: "#161b22", border: `1px solid ${P.border}`, borderRadius: 4, fontSize: 11, color: P.text }, itemStyle: { color: P.text } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestData = Record<string, any>;

export default function MonteCarloPage() {
  const [tab, setTab] = useState("dash");
  const [iters, setIters] = useState(3000);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<TestData | null>(null);
  const [prog, setProg] = useState(0);
  const cancel = useRef(false);

  const run = useCallback(async () => {
    setRunning(true); cancel.current = false; setProg(0);
    const d: TestData = {};
    const steps: [string, () => TestData][] = [
      ["softmax", () => testSoftmax(iters)], ["pricing", () => testPricing(iters)],
      ["quality", () => testQuality(iters)], ["brand", () => testBrand(iters)],
      ["esg", () => testESG(iters)], ["mc", () => testMarketCap(iters)],
      ["prod", () => testProduction(iters)], ["exp", () => testExperienceCurve(iters)],
      ["rb", () => testRubberBanding(iters)], ["hr", () => testHR(Math.min(iters, 2000))],
      ["mach", () => testMachinery(iters)], ["wc", () => testWorkingCapital(iters)],
      ["unitcost", () => testUnitCost(iters)], ["credit", () => testCreditRating(iters)],
      ["econ", () => testEconCycle(iters)], ["sim", () => runFullSim(Math.min(iters, 200), 20)],
    ];
    for (let i = 0; i < steps.length; i++) {
      if (cancel.current) break;
      await new Promise((r) => setTimeout(r, 5));
      d[steps[i][0]] = steps[i][1]();
      setProg(((i + 1) / steps.length) * 100);
    }
    setData(d); setRunning(false);
  }, [iters]);

  const totalA = data ? Object.values(data).reduce((s: number, r: TestData) => s + (r.anomalies?.length || 0), 0) : 0;

  const renderTab = () => {
    if (!data) return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 36, opacity: 0.1 }}>&#9881;</div>
        <div style={{ color: P.dim, fontSize: 13, textAlign: "center", maxWidth: 380 }}>
          {iters.toLocaleString()} randomized inputs x 16 test modules = {(iters * 16).toLocaleString()} formula evaluations. Hit <strong style={{ color: P.bright }}>RUN</strong>.
        </div>
      </div>
    );

    const D = data;

    if (tab === "dash") {
      const modules = Object.entries(D).map(([k, v]) => ({ id: k, a: v.anomalies?.length || 0, label: TABS.find((t) => t.id === k)?.label || k }));
      return (
        <div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            <Stat label="Total Tests" value={(iters * 15 + Math.min(iters, 200)).toLocaleString()} />
            <Stat label="Anomalies" value={totalA} color={totalA === 0 ? P.green : totalA < 30 ? P.yellow : P.red} />
            <Stat label="Anomaly Rate" value={((totalA / (iters * 16)) * 100).toFixed(3) + "%"} />
            {D.sim && <Stat label="Bankruptcies" value={D.sim.bankruptcies} color={D.sim.bankruptcies > 0 ? P.yellow : P.green} sub={`of ${Math.min(iters, 200) * 7} team-games`} />}
          </div>
          {D.sim?.exploitFlags?.length > 0 && (
            <div style={{ background: P.red + "10", border: `1px solid ${P.red}30`, borderRadius: 4, padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.red, marginBottom: 4 }}>EXPLOIT DETECTION</div>
              {D.sim.exploitFlags.map((e: ExploitFlag, i: number) => (
                <div key={i} style={{ fontSize: 11, fontFamily: "monospace", color: P.text, marginBottom: 2 }}>
                  <span style={{ color: STRATEGIES[e.strat]?.color || P.text }}>{STRATEGIES[e.strat]?.label}</span>: {e.rate} win rate (expected {e.expected}) — <span style={{ color: e.verdict === "DOMINANT" ? P.red : P.orange, fontWeight: 700 }}>{e.verdict}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: P.dim, marginBottom: 8 }}>MODULE RESULTS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
            {modules.map((m) => (
              <div key={m.id} onClick={() => setTab(m.id)} style={{ padding: "10px 14px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 4, cursor: "pointer" }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
                <Badge n={m.a} label="issues" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tab === "softmax" && D.softmax) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Softmax Market Share Allocation</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Random score vectors, 2-5 teams. Testing shares sum to 1, NaN, negative shares, PRNG determinism.</p><Badge n={D.softmax.anomalies.length} label="issues" /><ChartBox title="Share Sum Deviation vs Score Spread"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="spread" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="dev" tick={{ fill: P.dim, fontSize: 10 }} tickFormatter={(v: number) => v.toExponential(0)} /><Tooltip {...TT} /><Scatter data={D.softmax.shareDevs.slice(0, 800)} fill={P.blue} r={1.5} fillOpacity={0.4} /></ScatterChart></ChartBox><AnomalyTable rows={D.softmax.anomalies} /></div>);

    if (tab === "pricing" && D.pricing) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Price Score Testing</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Prices [-$200, $3000], expected [-$50, $2000]. Hunting negative-price exploits, div/0, NaN.</p><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><Badge n={D.pricing.anomalies.filter((a: Anomaly) => a.t === "EXPLOIT").length} label="exploits" /><Badge n={D.pricing.anomalies.filter((a: Anomaly) => a.t === "NAN" || a.t === "DIV0").length} label="NaN/div0" /></div><ChartBox title="Score vs Price (red = negative price, orange = below floor)"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="price" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="score" tick={{ fill: P.dim, fontSize: 10 }} /><Tooltip {...TT} /><Scatter data={D.pricing.pts.slice(0, 800)} r={1.5} fillOpacity={0.5}>{D.pricing.pts.slice(0, 800).map((d: { price: number; belowFloor: boolean }, i: number) => <Cell key={i} fill={d.price < 0 ? P.red : d.belowFloor ? P.orange : P.blue} />)}</Scatter></ScatterChart></ChartBox><AnomalyTable rows={D.pricing.anomalies} /></div>);

    if (tab === "quality" && D.quality) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Quality Score 3-Zone System</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Quality [0, 200] vs expectations. Verifying cap at {C.QUALITY_CAP}, quadratic penalty below 0.7, discontinuity at zone boundaries.</p><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><Badge n={D.quality.capViol.count} label="cap violations" /><Badge n={D.quality.anomalies.filter((a: Anomaly) => a.t === "DISCONTINUITY").length} label="discontinuities" /></div><ChartBox title="Quality Score vs Quality/Expectation Ratio"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="ratio" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="score" tick={{ fill: P.dim, fontSize: 10 }} /><Tooltip {...TT} /><Scatter data={D.quality.pts.slice(0, 800)} fill={P.green} r={1.5} fillOpacity={0.4} /></ScatterChart></ChartBox><AnomalyTable rows={D.quality.anomalies} /></div>);

    if (tab === "brand" && D.brand) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Brand Score sqrt Model</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Testing negative brand, threshold multipliers at 0.15/0.55.</p><Badge n={D.brand.anomalies.length} label="issues" /><ChartBox title="sqrt vs Linear Brand Scoring (normalized)"><LineChart data={D.brand.sqrtData}><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="bv" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis tick={{ fill: P.dim, fontSize: 10 }} /><Tooltip {...TT} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line dataKey="sqrt" stroke={P.blue} dot={false} strokeWidth={2} name="sqrt (new)" /><Line dataKey="linear" stroke={P.dim} dot={false} strokeWidth={1} strokeDasharray="4 4" name="linear (old)" /></LineChart></ChartBox><AnomalyTable rows={D.brand.anomalies} /></div>);

    if (tab === "esg" && D.esg) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>ESG Revenue Modifier 3-Tier System</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Penalty (&lt;300), neutral (300-399), mid bonus (400-699, +2%), high bonus (700+, +5%).</p><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><Badge n={D.esg.anomalies.filter((a: Anomaly) => a.t === "DISCONTINUITY").length} label="discontinuities" /><Badge n={D.esg.anomalies.filter((a: Anomaly) => a.t === "OVERFLOW").length} label="overflow" /></div><ChartBox title="Revenue Modifier vs ESG Score (colored by tier)"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="esg" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="mod" tick={{ fill: P.dim, fontSize: 10 }} domain={[0.85, 1.08]} /><Tooltip {...TT} /><Scatter data={D.esg.pts.slice(0, 800)} r={1.5} fillOpacity={0.6}>{D.esg.pts.slice(0, 800).map((d: { tier: string }, i: number) => <Cell key={i} fill={d.tier === "high" ? P.green : d.tier === "mid" ? P.cyan : d.tier === "neutral" ? P.blue : P.red} />)}</Scatter></ScatterChart></ChartBox><AnomalyTable rows={D.esg.anomalies} /></div>);

    if (tab === "mc" && D.mc) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Market Cap Calculation</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>EPS [-50, 150], PE clamped [5, 30], floor enforcement, EPS=0 boundary discontinuity.</p><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><Badge n={D.mc.anomalies.filter((a: Anomaly) => a.t === "DISCONTINUITY").length} label="EPS=0 jumps" /><Badge n={D.mc.anomalies.filter((a: Anomaly) => a.t === "OVERFLOW").length} label="overflow >$5T" /><Stat label="Floor Hits" value={D.mc.floorHits} sub="valuations at book/asset floor" /></div><ChartBox title="Market Cap vs EPS"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="eps" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="mc" tick={{ fill: P.dim, fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1e9).toFixed(0)}B`} /><Tooltip {...TT} /><Scatter data={D.mc.pts.slice(0, 800)} fill={P.purple} r={1.5} fillOpacity={0.3} /></ScatterChart></ChartBox><AnomalyTable rows={D.mc.anomalies} /></div>);

    if (tab === "prod" && D.prod) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Production Formula</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Workers [0, 2000], efficiency [0, 1.5]. Orange = exceeds 500K line capacity.</p><Badge n={D.prod.anomalies.filter((a: Anomaly) => a.t === "OVERFLOW").length} label="capacity overflow" /><ChartBox title="Units vs Workers"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="workers" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="units" tick={{ fill: P.dim, fontSize: 10 }} tickFormatter={(v: number) => v > 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)} /><Tooltip {...TT} /><Scatter data={D.prod.pts.slice(0, 800)} r={1.5} fillOpacity={0.5}>{D.prod.pts.slice(0, 800).map((d: { overCap: boolean }, i: number) => <Cell key={i} fill={d.overCap ? P.orange : P.blue} />)}</Scatter></ScatterChart></ChartBox><AnomalyTable rows={D.prod.anomalies} /></div>);

    if (tab === "exp" && D.exp) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Experience Curve (Wright&apos;s Law)</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Cost multiplier vs cumulative units. Floor at {C.LEARN_FLOOR}. Testing monotonicity and floor enforcement.</p><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><Badge n={D.exp.anomalies.filter((a: Anomaly) => a.t === "MONOTONE").length} label="monotonicity violations" /><Badge n={D.exp.anomalies.filter((a: Anomaly) => a.t === "UNDERFLOW").length} label="below floor" /></div><ChartBox title="Cost Multiplier vs Cumulative Units (log scale)"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="cumUnits" tick={{ fill: P.dim, fontSize: 10 }} scale="log" domain={["auto", "auto"]} tickFormatter={(v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)} /><YAxis dataKey="mult" tick={{ fill: P.dim, fontSize: 10 }} domain={[0.4, 1.1]} /><Tooltip {...TT} /><Scatter data={D.exp.pts.slice(0, 800)} fill={P.cyan} r={1.5} fillOpacity={0.4} /></ScatterChart></ChartBox><AnomalyTable rows={D.exp.anomalies} /></div>);

    if (tab === "rb" && D.rb) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Rubber-Banding Continuous 3-Mechanism System</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Cost relief (trailing, max 12%), perception boost (trailing, max 8%), incumbent drag (leading, max 50% decay). Testing bounds, continuity at position=0.</p><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><Badge n={D.rb.anomalies.filter((a: Anomaly) => a.t === "EXPLOIT").length} label="mechanism leaks" /><Badge n={D.rb.anomalies.filter((a: Anomaly) => a.t === "OVERFLOW").length} label="cap violations" /></div><ChartBox title="Continuity Test All 3 Mechanisms Sweeping Through Position = 0"><LineChart data={D.rb.continuity}><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="pos" tick={{ fill: P.dim, fontSize: 10 }} tickFormatter={(v: string) => (+v).toFixed(2)} /><YAxis tick={{ fill: P.dim, fontSize: 10 }} /><Tooltip {...TT} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line dataKey="cr" stroke={P.green} dot={false} strokeWidth={2} name="Cost Relief" /><Line dataKey="pb" stroke={P.blue} dot={false} strokeWidth={2} name="Perception" /><Line dataKey="drag" stroke={P.orange} dot={false} strokeWidth={2} name="Drag" /></LineChart></ChartBox><ChartBox title="Cost Relief vs Market Share (all team counts)"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="share" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="cr" tick={{ fill: P.dim, fontSize: 10 }} /><Tooltip {...TT} /><Scatter data={D.rb.pts.slice(0, 600)} fill={P.green} r={1.5} fillOpacity={0.4} /></ScatterChart></ChartBox><AnomalyTable rows={D.rb.anomalies} /></div>);

    if (tab === "hr" && D.hr) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>HR Module Salary, Turnover, Burnout</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Salary capped at $500K, turnover driven by morale/loyalty/burnout, burnout [0,100] with recovery above morale 70.</p><Badge n={D.hr.anomalies.length} label="issues" /><ChartBox title="Salary vs Average Stat (by role)"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="stat" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="salary" tick={{ fill: P.dim, fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1e3).toFixed(0)}K`} /><Tooltip {...TT} /><Scatter data={D.hr.salData} r={1.5} fillOpacity={0.4}>{D.hr.salData.map((d: { role: string }, i: number) => <Cell key={i} fill={d.role === "worker" ? P.blue : d.role === "eng" ? P.purple : P.cyan} />)}</Scatter></ScatterChart></ChartBox><ChartBox title="Burnout Next Round vs Current Burnout (colored by morale)"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="prev" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="newBurn" tick={{ fill: P.dim, fontSize: 10 }} /><Tooltip {...TT} /><Scatter data={D.hr.burnData.slice(0, 500)} r={1.5} fillOpacity={0.4}>{D.hr.burnData.slice(0, 500).map((d: { morale: number }, i: number) => <Cell key={i} fill={d.morale > 70 ? P.green : d.morale > 40 ? P.yellow : P.red} />)}</Scatter></ScatterChart></ChartBox><AnomalyTable rows={D.hr.anomalies} /></div>);

    if (tab === "mach" && D.mach) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Machinery Breakdown Probability</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Base 3% + backlog/age/burnout factors. Clamped [1%, 50%].</p><div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><Badge n={D.mach.anomalies.filter((a: Anomaly) => a.t === "OVERFLOW").length} label="over 50%" /><Badge n={D.mach.anomalies.filter((a: Anomaly) => a.t === "UNDERFLOW").length} label="under 1%" /></div><ChartBox title="Breakdown Probability vs Equipment Age"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="age" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="prob" tick={{ fill: P.dim, fontSize: 10 }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} /><Tooltip {...TT} /><Scatter data={D.mach.pts.slice(0, 800)} r={1.5} fillOpacity={0.4}>{D.mach.pts.slice(0, 800).map((d: { prob: number }, i: number) => <Cell key={i} fill={d.prob > 0.3 ? P.red : d.prob > 0.15 ? P.orange : P.blue} />)}</Scatter></ScatterChart></ChartBox><AnomalyTable rows={D.mach.anomalies} /></div>);

    if (tab === "wc" && D.wc) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Working Capital</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>AR = revenue x 30/90, AP = costs x 0.7 x 45/90. WC cost = max(0, WC) x 8%/4.</p><Badge n={D.wc.anomalies.length} label="issues" /><ChartBox title="Working Capital Cost vs Revenue"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="rev" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="wcCost" tick={{ fill: P.dim, fontSize: 10 }} /><Tooltip {...TT} /><Scatter data={D.wc.pts.slice(0, 800)} fill={P.cyan} r={1.5} fillOpacity={0.4} /></ScatterChart></ChartBox><AnomalyTable rows={D.wc.anomalies} /></div>);

    if (tab === "unitcost" && D.unitcost) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Unit Cost (with Experience Curve)</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Material cost x quality / efficiency x experience multiplier. Testing near-zero efficiency and negative costs.</p><Badge n={D.unitcost.anomalies.length} label="issues" /><ChartBox title="Unit Cost vs Quality (colored by segment)"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="quality" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="cost" tick={{ fill: P.dim, fontSize: 10 }} tickFormatter={(v: number) => `$${v.toFixed(0)}`} domain={[0, "auto"]} /><Tooltip {...TT} /><Scatter data={D.unitcost.pts.slice(0, 800)} r={1.5} fillOpacity={0.4}>{D.unitcost.pts.slice(0, 800).map((d: { seg: string }, i: number) => <Cell key={i} fill={d.seg === "Professional" ? P.purple : d.seg === "Budget" ? P.green : d.seg === "Enthusiast" ? P.orange : P.blue} />)}</Scatter></ScatterChart></ChartBox><AnomalyTable rows={D.unitcost.anomalies} /></div>);

    if (tab === "credit" && D.credit) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Credit Rating System</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Score 0-100 from D/E, coverage, current ratio, profit margin. Grades AAA to D.</p><Badge n={D.credit.anomalies.length} label="issues" /><ChartBox title="Credit Score vs D/E Ratio (colored by grade)"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="de" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="score" tick={{ fill: P.dim, fontSize: 10 }} /><Tooltip {...TT} /><Scatter data={D.credit.pts.slice(0, 800)} r={1.5} fillOpacity={0.5}>{D.credit.pts.slice(0, 800).map((d: { grade: string }, i: number) => <Cell key={i} fill={d.grade === "AAA" || d.grade === "AA" ? P.green : d.grade === "A" || d.grade === "BBB" ? P.yellow : P.red} />)}</Scatter></ScatterChart></ChartBox><AnomalyTable rows={D.credit.anomalies} /></div>);

    if (tab === "econ" && D.econ) return (<div><h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Economic Engine</h3><p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>Demand multiplier from GDP/confidence/inflation/growth. Phase transitions must sum to 1.0.</p><Badge n={D.econ.anomalies.length} label="issues" /><ChartBox title="Demand Multiplier vs GDP"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} /><XAxis dataKey="gdp" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis dataKey="mult" tick={{ fill: P.dim, fontSize: 10 }} /><Tooltip {...TT} /><Scatter data={D.econ.demandPts.slice(0, 800)} fill={P.blue} r={1.5} fillOpacity={0.4} /></ScatterChart></ChartBox><AnomalyTable rows={D.econ.anomalies} /></div>);

    if (tab === "sim" && D.sim) {
      const winData = Object.entries(D.sim.wins).map(([k, v]) => ({ strategy: STRATEGIES[k]?.label || k, wins: v as number, color: STRATEGIES[k]?.color || P.dim, rate: (((v as number) / Math.min(iters, 200)) * 100).toFixed(1) }));
      return (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Full Game Simulation 7 Strategy Archetypes</h3>
          <p style={{ fontSize: 12, color: P.dim, marginBottom: 12 }}>{Math.min(iters, 200)} games x 7 teams x 20 rounds. Strategies: R&D Dump, Balanced, Brand Blitz, Debt Spiral, Patent Troll, Experience Curve, Tanker.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <Stat label="Games" value={Math.min(iters, 200)} />
            <Stat label="Bankruptcies" value={D.sim.bankruptcies} color={D.sim.bankruptcies > 0 ? P.yellow : P.green} />
            <Stat label="Anomalies" value={D.sim.anomalies.length} color={D.sim.anomalies.length ? P.red : P.green} />
          </div>
          {D.sim.exploitFlags.length > 0 && (
            <div style={{ background: P.red + "10", border: `1px solid ${P.red}30`, borderRadius: 4, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.red, marginBottom: 6 }}>EXPLOIT ALERT</div>
              {D.sim.exploitFlags.map((e: ExploitFlag, i: number) => (
                <div key={i} style={{ fontSize: 11, fontFamily: "monospace", color: P.text }}>
                  <span style={{ color: STRATEGIES[e.strat]?.color }}>{STRATEGIES[e.strat]?.label}</span> wins {e.rate} (expected ~{e.expected}) — <span style={{ fontWeight: 700, color: e.verdict === "DOMINANT" ? P.red : P.orange }}>{e.verdict}</span>
                </div>
              ))}
            </div>
          )}
          <ChartBox title="Win Rate by Strategy">
            <BarChart data={winData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={P.border} />
              <XAxis type="number" tick={{ fill: P.dim, fontSize: 10 }} /><YAxis type="category" dataKey="strategy" tick={{ fill: P.text, fontSize: 10 }} width={100} />
              <Tooltip {...TT} /><Bar dataKey="wins" name="Wins">{winData.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
            </BarChart>
          </ChartBox>
          {D.sim.cashPaths[0] && (
            <ChartBox title="Cash Trajectories Sample Game 1">
              <LineChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="round" type="number" domain={[1, 20]} tick={{ fill: P.dim, fontSize: 10 }} /><YAxis tick={{ fill: P.dim, fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1e6).toFixed(0)}M`} />
                <Tooltip {...TT} formatter={(v: number) => `$${(v / 1e6).toFixed(1)}M`} /><Legend wrapperStyle={{ fontSize: 10 }} />
                {D.sim.cashPaths[0].map((t: { strat: string; data: { round: number; cash: number }[] }, i: number) => <Line key={i} data={t.data} dataKey="cash" name={t.strat} stroke={STRATEGIES[t.strat]?.color || P.dim} strokeWidth={1.5} dot={false} />)}
              </LineChart>
            </ChartBox>
          )}
          {D.sim.sharePaths[0] && (
            <ChartBox title="Market Share Trajectories Sample Game 1">
              <LineChart><CartesianGrid strokeDasharray="3 3" stroke={P.border} />
                <XAxis dataKey="round" type="number" domain={[1, 20]} tick={{ fill: P.dim, fontSize: 10 }} /><YAxis tick={{ fill: P.dim, fontSize: 10 }} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                <Tooltip {...TT} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} /><Legend wrapperStyle={{ fontSize: 10 }} />
                {D.sim.sharePaths[0].map((t: { strat: string; data: { round: number; share: number }[] }, i: number) => <Line key={i} data={t.data} dataKey="share" name={t.strat} stroke={STRATEGIES[t.strat]?.color || P.dim} strokeWidth={1.5} dot={false} />)}
              </LineChart>
            </ChartBox>
          )}
          <AnomalyTable rows={D.sim.anomalies} />
        </div>
      );
    }

    return <div style={{ color: P.dim, padding: 20 }}>Select a test module from the sidebar.</div>;
  };

  return (
    <div style={{ minHeight: "100vh", background: P.bg, color: P.text, fontFamily: "'Menlo', 'Courier New', monospace" }}>
      <div style={{ borderBottom: `1px solid ${P.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: running ? P.blue : data ? P.green : P.dim, boxShadow: running ? `0 0 6px ${P.blue}` : "none" }} />
          <div><div style={{ fontSize: 13, fontWeight: 700, color: P.bright, letterSpacing: "-0.03em" }}>BIZZSIMSIM V2 MONTE CARLO</div><div style={{ fontSize: 10, color: P.dim }}>16 modules | {TABS.length - 1} test suites | Miyazaki QA</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 11, color: P.dim, display: "flex", alignItems: "center", gap: 4 }}>N:
            <input type="number" value={iters} onChange={(e) => setIters(Math.max(100, +e.target.value || 1000))} disabled={running} style={{ width: 70, padding: "3px 6px", background: "#161b22", border: `1px solid ${P.border}`, borderRadius: 3, color: P.bright, fontSize: 12, fontFamily: "inherit" }} />
          </label>
          <button onClick={running ? () => { cancel.current = true; } : run} style={{ padding: "5px 16px", borderRadius: 3, border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: running ? P.red : "#238636", color: "#fff", fontFamily: "inherit" }}>
            {running ? "ABORT" : "RUN"}
          </button>
        </div>
      </div>
      {running && <div style={{ height: 2, background: P.border }}><div style={{ height: 2, background: P.blue, width: `${prog}%`, transition: "width 0.2s" }} /></div>}
      <div style={{ display: "flex", minHeight: "calc(100vh - 50px)" }}>
        <div style={{ width: 150, borderRight: `1px solid ${P.border}`, padding: "8px 0", flexShrink: 0, overflowY: "auto" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 12px", fontSize: 11, border: "none", background: tab === t.id ? "#161b22" : "transparent", color: tab === t.id ? P.bright : P.dim, cursor: "pointer", borderLeft: tab === t.id ? `2px solid ${P.blue}` : "2px solid transparent", fontFamily: "inherit" }}>
              {t.label}
              {data?.[t.id]?.anomalies?.length > 0 && <span style={{ marginLeft: 4, fontSize: 9, padding: "0 4px", borderRadius: 6, background: P.red + "20", color: P.red }}>{data[t.id].anomalies.length}</span>}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, padding: 20, overflow: "auto" }}>{renderTab()}</div>
      </div>
    </div>
  );
}
