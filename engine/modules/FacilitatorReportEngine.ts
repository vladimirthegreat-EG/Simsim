/**
 * FacilitatorReportEngine -- Template-based narrative generation engine.
 * Deterministic, fast, no external deps beyond engine types. No AI calls.
 */
import type { TeamState } from "../types/state";
import type { Segment } from "../types/factory";
import type { MarketSimulationResult } from "../market/MarketSimulator";
import type {
  FacilitatorBrief, FacilitatorKeyDecision, ConceptSpotlight,
  PostGameReport, TeamJourney, ConceptMapEntry, TeamAchievementAnalysis,
  MarketTimelineEntry, WhatIfScenario, DiscussionGuide, DiscussionQuestion,
  DiscussionCategory, ParticipantScorecard, TeamHealthSummary, CompetitiveTension,
} from "../types/facilitator";
import { ALL_ACHIEVEMENTS, calculateAchievementScore } from "../types/achievements";
import type { AchievementCategory } from "../types/achievements";
import { CONSTANTS } from "../types";
import type { Patent } from "../types/patents";

// --- Shared input shapes ---
type TeamInput = { id: string; name: string; state: TeamState; previousStates?: TeamState[] };
type RoundHistory = { round: number; teams: Array<{ id: string; name: string; state: TeamState }> };

// --- Helpers ---
const $ = (n: number) => {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
};
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const pat = (s: TeamState): Patent[] => Array.isArray(s.patents) ? s.patents : [];
const share = (s: TeamState) => Object.values(s.marketShare ?? {}).reduce((a, b) => a + (b ?? 0), 0);
const lp = (s: TeamState) => (s.products ?? []).filter(p => p.developmentStatus === "launched");
const segs = (s: TeamState): Segment[] => lp(s).map(p => p.segment).filter((v, i, a) => a.indexOf(v) === i);
const prev = (t: TeamInput) => t.previousStates?.length ? t.previousStates[t.previousStates.length - 1] : undefined;
const hist = (t: TeamInput): TeamState[] => [...(t.previousStates ?? []), t.state];
const techs = (s: TeamState) => (s.unlockedTechnologies ?? []).length;
const SEGS = CONSTANTS.SEGMENTS;

export class FacilitatorReportEngine {
  // 1. generateRoundBrief
  static generateRoundBrief(round: number, teams: TeamInput[], marketResult?: MarketSimulationResult): FacilitatorBrief {
    if (!teams.length) return {
      round, headline: `Round ${round}: No teams active.`,
      winnerOfRound: { teamId: "", teamName: "N/A", reason: "No teams" },
      loserOfRound: { teamId: "", teamName: "N/A", reason: "No teams" },
      keyDecisions: [], conceptSpotlight: { concept: "N/A", explanation: "No data." }, lookAhead: "Waiting for teams.",
    };

    const scored = teams.map(t => {
      const p = prev(t);
      const rg = p ? t.state.revenue - p.revenue : t.state.revenue;
      const sg = p ? share(t.state) - share(p) : share(t.state);
      const na = (t.state.achievements ?? []).length - (p ? (p.achievements ?? []).length : 0);
      return { ...t, rg, sg, na, sc: rg + sg * 1e6 + na * 1e5 };
    }).sort((a, b) => b.sc - a.sc);

    const w = scored[0], l = scored[scored.length - 1];
    const wr = w.na > 0 ? `unlocking ${w.na} achievement(s)` : w.rg > 0 ? `${$(w.rg)} revenue growth` : `maintaining ${$(w.state.revenue)} revenue`;
    const lr = l.rg < 0 ? `Revenue declined by ${$(Math.abs(l.rg))}` : l.sg < 0 ? `Lost ${pct(Math.abs(l.sg))} market share` : `Lowest momentum this round`;

    const kd: FacilitatorKeyDecision[] = [];
    for (const t of teams) {
      const p = prev(t), c = t.state;
      const pl = p ? lp(p).length : 0, cl = lp(c).length;
      if (cl > pl) {
        const ns = segs(c).filter(s => !p || !segs(p).includes(s));
        kd.push({ teamId: t.id, teamName: t.name, description: `Launched ${cl - pl} new product(s) in ${ns.length ? ns.join(", ") : "existing segments"}`, consequence: `Product count now ${cl}. Market share impact will show next round.` });
      }
      if (c.rdBudget > 0 && c.revenue > 0 && c.rdBudget / c.revenue > 0.3)
        kd.push({ teamId: t.id, teamName: t.name, description: `Allocated ${pct(c.rdBudget / c.revenue)} of revenue to R&D (${$(c.rdBudget)})`, consequence: `Heavy R&D may yield breakthroughs but reduces short-term profitability.` });
      if (pat(c).length > (p ? pat(p).length : 0))
        kd.push({ teamId: t.id, teamName: t.name, description: `Filed new patents, now holding ${pat(c).length} total`, consequence: `Patent blocking may restrict competitors' access to key technologies.` });
    }

    return {
      round, headline: `Round ${round}: ${w.name} surges ahead with ${wr}`,
      winnerOfRound: { teamId: w.id, teamName: w.name, reason: wr },
      loserOfRound: { teamId: l.id, teamName: l.name, reason: lr },
      keyDecisions: kd,
      conceptSpotlight: this.spotConcept(round, teams),
      lookAhead: this.lookAhead(round, teams),
    };
  }

  // 2. generateTeamHealthSummaries
  static generateTeamHealthSummaries(teams: Array<{ id: string; name: string; state: TeamState }>): TeamHealthSummary[] {
    return teams.map(t => {
      const s = t.state, pc = lp(s).length;
      const status: TeamHealthSummary["status"] = s.cash < 0 ? "critical" : (s.cash < 50_000_000 || pc === 0) ? "struggling" : "healthy";
      return { teamId: t.id, teamName: t.name, cash: s.cash, revenue: s.revenue, productCount: pc, techsResearched: techs(s), achievementScore: calculateAchievementScore(s.achievements ?? []), status };
    });
  }

  // 3. detectCompetitiveTensions
  static detectCompetitiveTensions(teams: Array<{ id: string; name: string; state: TeamState }>, marketResult?: MarketSimulationResult): CompetitiveTension[] {
    const out: CompetitiveTension[] = [];
    if (teams.length < 2) return out;
    for (const seg of SEGS) {
      const ts = teams.filter(t => (t.state.marketShare?.[seg] ?? 0) > 0)
        .map(t => ({ ...t, sh: t.state.marketShare[seg] ?? 0 })).sort((a, b) => b.sh - a.sh);
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i], b = ts[j];
        // Price war
        const ap = lp(a.state).filter(p => p.segment === seg), bp = lp(b.state).filter(p => p.segment === seg);
        if (ap.length && bp.length) {
          const am = Math.min(...ap.map(p => p.price)), bm = Math.min(...bp.map(p => p.price)), av = (am + bm) / 2;
          if (av > 0 && Math.abs(am - bm) / av < 0.1)
            out.push({ teamA: a.name, teamB: b.name, segment: seg, type: "price_war", description: `${a.name} and ${b.name} are price-matched in ${seg} (${$(am)} vs ${$(bm)}). A price war may be brewing.`, severity: Math.abs(am - bm) / av < 0.03 ? "high" : "medium" });
        }
        // Head-to-head
        if (a.sh > 0.25 && b.sh > 0.25)
          out.push({ teamA: a.name, teamB: b.name, segment: seg, type: "head_to_head", description: `${a.name} (${pct(a.sh)}) and ${b.name} (${pct(b.sh)}) are in a head-to-head battle in ${seg}.`, severity: Math.abs(a.sh - b.sh) < 0.05 ? "high" : "medium" });
        // Share battle
        const d = Math.abs(a.sh - b.sh);
        if (d < 0.1 && a.sh > 0.1)
          out.push({ teamA: a.name, teamB: b.name, segment: seg, type: "share_battle", description: `${a.name} (${pct(a.sh)}) and ${b.name} (${pct(b.sh)}) are in a tight share battle in ${seg}.`, severity: d < 0.03 ? "high" : d < 0.07 ? "medium" : "low" });
      }
    }
    // Patent blocking
    for (const h of teams) {
      const pts = pat(h.state).filter(p => p.status === "active");
      for (const o of teams) {
        if (o.id === h.id) continue;
        const bc = pts.filter(p => p.blockingPower > 0 && !p.licensedTo.includes(o.id)).length;
        if (bc >= 2) out.push({ teamA: h.name, teamB: o.name, segment: "General", type: "patent_blocking", description: `${h.name} holds ${bc} patents blocking ${o.name}. Licensing negotiations could shift the balance.`, severity: bc >= 4 ? "high" : "medium" });
      }
    }
    return out;
  }

  // 4. generatePostGameReport
  static generatePostGameReport(teams: TeamInput[], roundHistory: RoundHistory[]): PostGameReport {
    if (!teams.length) return { executiveSummary: "No teams participated.", teamJourneys: [], conceptMap: [], achievementAnalysis: [], marketTimeline: [], whatIfScenarios: [] };
    const sorted = [...teams].sort((a, b) => calculateAchievementScore(b.state.achievements ?? []) - calculateAchievementScore(a.state.achievements ?? []));
    const w = sorted[0], ws = calculateAchievementScore(w.state.achievements ?? []);
    const tr = roundHistory.length ? roundHistory[roundHistory.length - 1].round : w.state.round;
    const es = `${w.name} won with ${ws} achievement points over ${tr} rounds across ${SEGS.length} segments. Finished with ${$(w.state.revenue)} revenue and ${$(w.state.cash)} cash.` +
      (sorted.length > 1 ? ` Runner-up: ${sorted[1].name} with ${calculateAchievementScore(sorted[1].state.achievements ?? [])} points.` : "");
    return {
      executiveSummary: es,
      teamJourneys: sorted.map(t => this.journey(t)),
      conceptMap: this.concepts(sorted),
      achievementAnalysis: this.achievements(sorted),
      marketTimeline: this.timeline(roundHistory),
      whatIfScenarios: this.whatIfs(teams),
    };
  }

  // 5. generateDiscussionGuide
  static generateDiscussionGuide(teams: TeamInput[], roundHistory: RoundHistory[]): DiscussionGuide {
    if (!teams.length) return { questions: [] };
    const q: DiscussionQuestion[] = [];
    const top = [...teams].sort((a, b) => b.state.revenue - a.state.revenue)[0];
    const esg = [...teams].sort((a, b) => b.state.esgScore - a.state.esgScore)[0];
    const ms = teams.filter(t => segs(t.state).length >= 3);
    const ph = teams.filter(t => pat(t.state).length > 0);
    const rd = teams.filter(t => t.state.rdBudget > 0 && t.state.revenue > 0 && t.state.rdBudget / t.state.revenue > 0.2);
    const cc = teams.filter(t => t.state.cash < 10_000_000);

    const add = (cat: DiscussionCategory, question: string, context: string) => q.push({ category: cat, question, context });

    add("strategic", `${top.name} finished with the highest revenue. What strategic choices led to this outcome?`, `${top.name} earned ${$(top.state.revenue)}.`);
    add("strategic", "Looking back, would you change your initial strategy? What would you do differently in round 1?", "Early-round choices shaped each team's trajectory.");
    if (ms.length) add("competitive", `${ms.map(t => t.name).join(" and ")} chose broad multi-segment strategies. What are the trade-offs of diversification vs. focus?`, "These teams competed in 3+ segments.");
    if (ph.length) add("competitive", "How did patents affect competitive dynamics? Were they used offensively or defensively?", `${ph.map(t => t.name).join(", ")} held active patents.`);
    if (rd.length) add("resource", `${rd.map(t => t.name).join(" and ")} invested heavily in R&D. When does R&D spending become excessive?`, "These teams spent over 20% of revenue on R&D.");
    add("resource", "How did you decide between investing in new products vs. improving existing ones?", "Teams balanced product development with quality improvements.");
    add("market_signals", "What market signals did you pay attention to? Were there signals you missed?", "Market share, pricing, and competitor actions all provided information.");
    if (cc.length) add("market_signals", `${cc.map(t => t.name).join(" and ")} faced cash pressure. What warning signs should have prompted earlier action?`, "These teams ended with less than $10M cash.");
    if (esg.state.esgScore > 0) add("ethics", `${esg.name} led on ESG. Did investing in sustainability help or hurt competitiveness?`, `${esg.name} achieved ESG score of ${esg.state.esgScore}.`);
    add("ethics", "Were there moments where you faced a trade-off between profit and ethics?", "ESG scores and brand value are linked to long-term reputation.");
    add("adaptability", "How did your strategy evolve from beginning to end?", "Market conditions and competitor actions required ongoing adaptation.");
    add("adaptability", "Describe a moment where a competitor's action forced you to change your plan.", "Competitive dynamics created action-reaction cycles.");
    add("real_world", "Which real-world company does your team's strategy most resemble, and why?", "Simulation strategies often parallel real business approaches.");
    add("real_world", "What concept from this simulation will you think about differently in future business decisions?", "The game demonstrated pricing, R&D, competitive dynamics, and resource allocation.");

    return { questions: q.slice(0, 14) };
  }

  // 6. generateParticipantScorecard
  static generateParticipantScorecard(teamId: string, teams: TeamInput[], roundHistory: RoundHistory[]): ParticipantScorecard {
    const t = teams.find(t => t.id === teamId);
    if (!t) return { teamId, teamName: "Unknown", strategySummary: "Team not found.", strengths: [], growthAreas: [], keyDecisionsAndConsequences: [], achievements: [], achievementsByCategory: {}, learningOutcomes: [] };

    const h = hist(t), f = t.state, f0 = h[0] ?? f, ach = f.achievements ?? [];
    const sg = segs(f), tc = techs(f), pc = pat(f).length;

    // Strategy
    let ss = tc > 10 && sg.length >= 3 ? `${t.name} pursued tech-focused diversification across ${sg.length} segments with ${tc} technologies.`
      : tc > 10 ? `${t.name} pursued a technology-led strategy with ${tc} technologies.`
      : sg.length >= 4 ? `${t.name} pursued broad market coverage across ${sg.length} segments.`
      : sg.length === 1 ? `${t.name} focused on a niche strategy in ${sg[0]}.`
      : sg.length === 0 ? `${t.name} had no launched products by game end -- a critical gap.`
      : `${t.name} adopted a balanced strategy in ${sg.join(" and ")}.`;
    if (pc > 3) ss += ` With ${pc} patents, IP protection was a key pillar.`;

    const str: string[] = [];
    if (f.revenue > (f0.revenue ?? 0) * 2) str.push("Strong revenue growth trajectory");
    if (sg.length >= 3) str.push("Effective multi-segment coverage");
    if (tc > 8) str.push("Deep technology portfolio");
    if (pc > 2) str.push("Active IP strategy");
    if (f.brandValue > 0.7) str.push("Strong brand value");
    if (f.esgScore > 500) str.push("ESG leadership");
    if (!str.length) str.push("Resilience through challenging conditions");

    const ga: string[] = [];
    if (sg.length <= 1) ga.push("Market diversification -- expand to additional segments");
    if (tc < 3) ga.push("R&D investment -- more technologies unlock competitive advantages");
    if (f.cash < 20_000_000) ga.push("Cash management -- larger reserves provide flexibility");
    if (f.brandValue < 0.3) ga.push("Brand building -- higher brand value supports premium pricing");
    if (!ga.length) ga.push("Continue iterating -- no critical gaps identified");

    const kd: { round: number; decision: string; consequence: string }[] = [];
    for (let i = 1; i < h.length && kd.length < 5; i++) {
      const c = h[i], p = h[i - 1];
      if (lp(c).length > lp(p).length) {
        const ns = segs(c).filter(s => !segs(p).includes(s));
        kd.push({ round: c.round, decision: `Launched ${lp(c).length - lp(p).length} product(s) in ${ns.length ? ns.join(", ") : "existing segments"}`, consequence: c.revenue > p.revenue ? `Revenue grew to ${$(c.revenue)}.` : `Revenue held at ${$(c.revenue)}; impact may be delayed.` });
      }
      if (c.rdBudget > p.rdBudget * 1.5 && p.rdBudget > 0 && kd.length < 5)
        kd.push({ round: c.round, decision: `Increased R&D budget to ${$(c.rdBudget)}`, consequence: `${techs(c)} technologies now unlocked.` });
      if (c.cash < 0 && p.cash >= 0 && kd.length < 5)
        kd.push({ round: c.round, decision: "Cash went negative", consequence: `Crisis: cash hit ${$(c.cash)}.` });
    }

    const abc: Partial<Record<AchievementCategory, number>> = {};
    for (const a of ach) { const d = ALL_ACHIEVEMENTS.find(x => x.id === a.id); if (d) abc[d.category] = (abc[d.category] ?? 0) + a.points; }

    const lo = [
      { concept: "Competitive Strategy", demonstrated: sg.length >= 2, evidence: sg.length >= 2 ? `Competed in ${sg.length} segments.` : undefined },
      { concept: "Innovation Management", demonstrated: tc >= 3, evidence: tc >= 3 ? `Unlocked ${tc} technologies.` : undefined },
      { concept: "Financial Management", demonstrated: f.cash > 0 && f.revenue > 0, evidence: f.cash > 0 ? `Maintained ${$(f.cash)} reserves.` : undefined },
      { concept: "Intellectual Property", demonstrated: pc > 0, evidence: pc > 0 ? `Filed ${pc} patents.` : undefined },
      { concept: "Sustainability & Ethics", demonstrated: f.esgScore > 200, evidence: f.esgScore > 200 ? `ESG score: ${f.esgScore}.` : undefined },
    ];

    return { teamId, teamName: t.name, strategySummary: ss, strengths: str, growthAreas: ga, keyDecisionsAndConsequences: kd, achievements: ach, achievementsByCategory: abc, learningOutcomes: lo };
  }

  // --- Private helpers ---

  private static spotConcept(round: number, teams: TeamInput[]): ConceptSpotlight {
    for (const t of teams) { const p = prev(t); if (!p) continue; for (const c of lp(t.state)) { const pp = lp(p).find(x => x.id === c.id); if (pp && c.price < pp.price * 0.85) return { concept: "Price War", explanation: `${t.name} cut prices >15%. Aggressive cuts gain short-term share but erode profitability -- a prisoner's dilemma.` }; } }
    for (const t of teams) { const p = prev(t); if (!p) continue; for (const s of segs(t.state).filter(s => !segs(p).includes(s))) { if (!teams.some(o => o.id !== t.id && (o.state.marketShare?.[s] ?? 0) > 0.01)) return { concept: "First-Mover Advantage", explanation: `${t.name} was first to enter ${s}. First movers capture early share but bear market-education costs.` }; } }
    const pm = teams.find(t => lp(t.state).some(p => p.quality > 80 && p.price > 400));
    if (pm) return { concept: "Differentiation Strategy", explanation: `${pm.name} sells high-quality premium products. Differentiation allows premium pricing when customers perceive unique value.` };
    const bf = teams.find(t => t.state.factories.length >= 3);
    if (bf) return { concept: "Economies of Scale", explanation: `${bf.name} operates ${bf.state.factories.length} factories. Greater scale reduces per-unit costs.` };
    return { concept: "Competitive Positioning", explanation: `Round ${round}: each team's decisions create a unique competitive position.` };
  }

  private static lookAhead(round: number, teams: TeamInput[]): string {
    const p: string[] = [];
    const dev = teams.filter(t => (t.state.products ?? []).some(x => x.developmentStatus === "in_development"));
    if (dev.length) p.push(`Watch for ${dev.map(t => t.name).join(" and ")}'s new product launch.`);
    for (const s of SEGS) { if (teams.filter(t => (t.state.marketShare?.[s] ?? 0) > 0.1).length >= 3) { p.push(`The ${s} segment is becoming crowded.`); break; } }
    const lc = teams.filter(t => t.state.cash >= 0 && t.state.cash < 15_000_000);
    if (lc.length) p.push(`${lc.map(t => t.name).join(" and ")} may face cash pressure next round.`);
    return p.length ? p.join(" ") : `Round ${round + 1} will reveal whether current strategies are sustainable.`;
  }

  private static journey(t: TeamInput): TeamJourney {
    const h = hist(t), f0 = h[0] ?? t.state, fl = t.state, sg = segs(fl), tc = techs(fl);
    const arc = `${t.name} began with ${$(f0.cash)} and ${lp(f0).length} products. By the final round: ${lp(fl).length} products across ${sg.length} segment(s) (${sg.join(", ") || "none"}), ${tc} technologies, ${$(fl.revenue)} revenue.`;
    const dp: string[] = [];
    for (let i = 1; i < h.length; i++) { if (lp(h[i]).length > lp(h[i - 1]).length) dp.push(`Round ${h[i].round}: launched new products.`); if (h[i].cash < 0 && h[i - 1].cash >= 0) dp.push(`Round ${h[i].round}: cash went negative.`); }
    return {
      teamId: t.id, teamName: t.name, strategyArc: arc,
      keyDecisions: dp.length ? dp.join(" ") : `${t.name} maintained a steady approach.`,
      competitiveInteractions: `${t.name} competed in ${sg.join(", ") || "no segments"}, building a ${pat(fl).length ? "patent-backed" : "product-focused"} position.`,
      learningSummary: `${sg.length >= 3 ? "Diversification" : "Focus"} was central. ${tc > 5 ? "Heavy" : "Moderate"} R&D shaped later-round options.`,
    };
  }

  private static concepts(teams: TeamInput[]): ConceptMapEntry[] {
    const c: ConceptMapEntry[] = [];
    if (!teams.length) return c;
    c.push({ concept: "Competitive Advantage", whereAppeared: `${teams[0].name} (winner)`, whatHappened: `Built sustained advantage via revenue (${$(teams[0].state.revenue)}) and achievements.` });
    if (teams.some(t => lp(t.state).some(p => p.price > 500))) c.push({ concept: "Price Elasticity", whereAppeared: "Premium products", whatHappened: "Teams priced >$500 tested consumer willingness to pay for quality." });
    const rh = teams.filter(t => t.state.rdBudget > 0 && t.state.revenue > 0 && t.state.rdBudget / t.state.revenue > 0.4);
    if (rh.length) c.push({ concept: "Sunk Cost", whereAppeared: rh.map(t => t.name).join(", "), whatHappened: "Heavy R&D created pressure to keep investing despite uncertain returns." });
    const pt = teams.filter(t => pat(t.state).length > 0);
    if (pt.length) c.push({ concept: "Barriers to Entry", whereAppeared: `Patent holders: ${pt.map(t => t.name).join(", ")}`, whatHappened: "Patents restricted competitor access to key technologies." });
    return c;
  }

  private static achievements(teams: TeamInput[]): TeamAchievementAnalysis[] {
    return teams.map(t => {
      const earned = t.state.achievements ?? [], ids = new Set(earned.map(a => a.id)), missed: string[] = [];
      const sg = segs(t.state), tc = techs(t.state);
      if (!ids.has("arch_segment_sweep") && sg.length >= 3) missed.push("arch_segment_sweep");
      if (!ids.has("tech_full_family") && tc >= 6) missed.push("tech_full_family");
      if (!ids.has("pat_portfolio") && pat(t.state).length >= 3) missed.push("pat_portfolio");
      if (!ids.has("pvp_monopoly") && Object.values(t.state.marketShare ?? {}).some(s => s > 0.4)) missed.push("pvp_monopoly");
      const sc = calculateAchievementScore(earned);
      const si = sc > 100 ? `${t.name}: well-rounded strategy, ${sc} pts across ${earned.length} achievements.`
        : sc > 50 ? `${t.name}: solid fundamentals, ${sc} pts. Broader coverage could unlock more.`
        : `${t.name}: narrow focus, ${sc} pts. More strategic dimensions would help.`;
      return { teamId: t.id, teamName: t.name, earned, missed, strategicInsight: si };
    });
  }

  private static timeline(rh: RoundHistory[]): MarketTimelineEntry[] {
    const out: MarketTimelineEntry[] = [];
    for (let i = 1; i < rh.length; i++) for (const seg of SEGS) {
      const sb: Record<string, number> = {}, sa: Record<string, number> = {};
      let ch = false;
      for (const ct of rh[i].teams) { const pt = rh[i - 1].teams.find(t => t.id === ct.id); sb[ct.name] = pt?.state.marketShare?.[seg] ?? 0; sa[ct.name] = ct.state.marketShare?.[seg] ?? 0; if (Math.abs(sa[ct.name] - sb[ct.name]) > 0.05) ch = true; }
      if (ch) { const b = Object.entries(sb).sort((a, b) => b[1] - a[1]), a = Object.entries(sa).sort((a, b) => b[1] - a[1]); out.push({ round: rh[i].round, segment: seg, event: b[0]?.[0] !== a[0]?.[0] ? `${a[0][0]} overtook ${b[0][0]} in ${seg}` : `Significant share shift in ${seg}`, sharesBefore: sb, sharesAfter: sa }); }
    }
    return out;
  }

  private static whatIfs(teams: TeamInput[]): WhatIfScenario[] {
    const out: WhatIfScenario[] = [], cav = "This is an estimate, not a definitive prediction";
    for (const t of teams) {
      const h = hist(t); if (h.length < 3) continue;
      let wd = 0, wr = -1;
      for (let i = 1; i < h.length; i++) { const d = h[i - 1].revenue - h[i].revenue; if (d > wd) { wd = d; wr = h[i].round; } }
      if (wr > 0 && wd > 0) out.push({ teamId: t.id, teamName: t.name, decisionRound: wr, actualDecision: `Revenue dropped by ${$(wd)} in round ${wr}`, alternativeDecision: `Investing in product quality or pricing before round ${wr} might have avoided the drop.`, estimatedImpact: `Estimated +${$(wd * 0.5)} retained revenue`, caveat: cav });
      const ms = SEGS.filter(s => !segs(t.state).includes(s));
      if (ms.length > 0 && ms.length <= 3) out.push({ teamId: t.id, teamName: t.name, decisionRound: Math.floor(h.length / 2), actualDecision: `Never entered ${ms[0]}`, alternativeDecision: `Entering ${ms[0]} mid-game could have diversified revenue and unlocked Segment Sweep.`, estimatedImpact: "Estimated +25 achievement points", caveat: cav });
    }
    return out;
  }
}
