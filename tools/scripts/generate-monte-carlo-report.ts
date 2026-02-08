/**
 * Monte Carlo Report Generator
 *
 * Generates PDF and Excel reports from comprehensive 7-strategy simulation
 */

// @ts-nocheck - Needs updates for current engine interfaces

import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";

import { SimulationEngine, type SimulationInput } from "../engine/core/SimulationEngine";
import { STRATEGIES } from "../engine/balance/strategies";
import type { StrategyArchetype } from "../engine/balance/strategies";
import { CONSTANTS } from "../engine/types";
import { setRandomSeed } from "../engine/utils";

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  simulationsPerMatchup: 100,
  rounds: 8,
  teamsPerGame: 4,
};

const ALL_STRATEGIES: StrategyArchetype[] = [
  "volume",
  "premium",
  "brand",
  "automation",
  "balanced",
  "rd-focused",
  "cost-cutter",
];

const STRATEGY_DESCRIPTIONS: Record<StrategyArchetype, string> = {
  "volume": "High production, competitive pricing, Budget/General focus",
  "premium": "High quality products, premium pricing, Professional/Enthusiast focus",
  "brand": "Heavy marketing investment, sponsorships, brand building",
  "automation": "Early automation upgrade, factory efficiency focus",
  "balanced": "Moderate investment across all areas, diversified approach",
  "rd-focused": "Maximum R&D budget, continuous product improvements",
  "cost-cutter": "Minimal expenses, heavy discounts, conservative spending",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// ============================================
// SIMULATION TYPES
// ============================================

interface MatchupResult {
  strategies: StrategyArchetype[];
  winCounts: Record<StrategyArchetype, number>;
  avgRevenues: Record<StrategyArchetype, number>;
  avgBrandValues: Record<StrategyArchetype, number>;
  avgRanks: Record<StrategyArchetype, number>;
}

interface SimulationData {
  totalSimulations: number;
  matchupCount: number;
  simulationsPerMatchup: number;
  rounds: number;
  globalStats: {
    totalWins: Record<StrategyArchetype, number>;
    totalGames: Record<StrategyArchetype, number>;
    allRevenues: Record<StrategyArchetype, number[]>;
    allBrandValues: Record<StrategyArchetype, number[]>;
    allRanks: Record<StrategyArchetype, number[]>;
  };
  matchupResults: MatchupResult[];
  h2hWins: Record<string, Record<string, number>>;
  h2hGames: Record<string, Record<string, number>>;
}

// ============================================
// SIMULATION RUNNER
// ============================================

function runSimulation(): SimulationData {
  console.log("Running Monte Carlo simulation...");

  const allMatchups = combinations(ALL_STRATEGIES, CONFIG.teamsPerGame);
  const totalSimulations = allMatchups.length * CONFIG.simulationsPerMatchup;

  const globalStats = {
    totalWins: {} as Record<StrategyArchetype, number>,
    totalGames: {} as Record<StrategyArchetype, number>,
    allRevenues: {} as Record<StrategyArchetype, number[]>,
    allBrandValues: {} as Record<StrategyArchetype, number[]>,
    allRanks: {} as Record<StrategyArchetype, number[]>,
  };

  for (const s of ALL_STRATEGIES) {
    globalStats.totalWins[s] = 0;
    globalStats.totalGames[s] = 0;
    globalStats.allRevenues[s] = [];
    globalStats.allBrandValues[s] = [];
    globalStats.allRanks[s] = [];
  }

  const matchupResults: MatchupResult[] = [];

  for (let i = 0; i < allMatchups.length; i++) {
    const matchup = allMatchups[i];
    const result = runMatchup(matchup, CONFIG.simulationsPerMatchup);
    matchupResults.push(result);

    for (const s of matchup) {
      globalStats.totalWins[s] += result.winCounts[s];
      globalStats.totalGames[s] += CONFIG.simulationsPerMatchup;
      globalStats.allRevenues[s].push(result.avgRevenues[s]);
      globalStats.allBrandValues[s].push(result.avgBrandValues[s]);
      globalStats.allRanks[s].push(result.avgRanks[s]);
    }

    if ((i + 1) % 5 === 0) {
      console.log(`  Progress: ${i + 1}/${allMatchups.length} matchups`);
    }
  }

  // Build head-to-head matrix
  const h2hWins: Record<string, Record<string, number>> = {};
  const h2hGames: Record<string, Record<string, number>> = {};

  for (const s1 of ALL_STRATEGIES) {
    h2hWins[s1] = {};
    h2hGames[s1] = {};
    for (const s2 of ALL_STRATEGIES) {
      h2hWins[s1][s2] = 0;
      h2hGames[s1][s2] = 0;
    }
  }

  for (const result of matchupResults) {
    for (const s1 of result.strategies) {
      for (const s2 of result.strategies) {
        if (s1 !== s2) {
          h2hGames[s1][s2] += CONFIG.simulationsPerMatchup;
          if (result.avgRevenues[s1] > result.avgRevenues[s2]) {
            h2hWins[s1][s2] += CONFIG.simulationsPerMatchup;
          }
        }
      }
    }
  }

  console.log(`Completed ${totalSimulations} simulations`);

  return {
    totalSimulations,
    matchupCount: allMatchups.length,
    simulationsPerMatchup: CONFIG.simulationsPerMatchup,
    rounds: CONFIG.rounds,
    globalStats,
    matchupResults,
    h2hWins,
    h2hGames,
  };
}

function runMatchup(strategies: StrategyArchetype[], simulations: number): MatchupResult {
  const winCounts: Record<string, number> = {};
  const totalRevenues: Record<string, number> = {};
  const totalBrandValues: Record<string, number> = {};
  const totalRanks: Record<string, number> = {};

  for (const s of strategies) {
    winCounts[s] = 0;
    totalRevenues[s] = 0;
    totalBrandValues[s] = 0;
    totalRanks[s] = 0;
  }

  for (let sim = 0; sim < simulations; sim++) {
    const seed = `matchup-${strategies.join("-")}-sim-${sim}`;
    setRandomSeed(seed);

    const teams = strategies.map((strategy, i) => ({
      id: `team-${i + 1}`,
      state: SimulationEngine.createInitialTeamState(),
      strategy,
      strategyFn: STRATEGIES[strategy],
    }));

    let marketState = SimulationEngine.createInitialMarketState();
    const cumulativeRevenue: Record<string, number> = {};
    for (const team of teams) {
      cumulativeRevenue[team.id] = 0;
    }

    for (let round = 1; round <= CONFIG.rounds; round++) {
      const teamsWithDecisions = teams.map((team) => ({
        id: team.id,
        state: team.state,
        decisions: team.strategyFn(team.state, marketState, round),
      }));

      const input: SimulationInput = {
        roundNumber: round,
        teams: teamsWithDecisions,
        marketState,
        matchSeed: `${seed}-round-${round}`,
      };

      const output = SimulationEngine.processRound(input);

      for (const result of output.results) {
        const team = teams.find((t) => t.id === result.teamId);
        if (team) {
          team.state = result.newState;
          cumulativeRevenue[team.id] += result.totalRevenue;
        }
      }

      marketState = output.newMarketState;
    }

    const results = teams.map(t => ({
      strategy: t.strategy,
      revenue: cumulativeRevenue[t.id],
      brandValue: t.state.brandValue,
    })).sort((a, b) => b.revenue - a.revenue);

    for (let rank = 0; rank < results.length; rank++) {
      const r = results[rank];
      totalRevenues[r.strategy] += r.revenue;
      totalBrandValues[r.strategy] += r.brandValue;
      totalRanks[r.strategy] += rank + 1;
      if (rank === 0) {
        winCounts[r.strategy]++;
      }
    }
  }

  return {
    strategies,
    winCounts: winCounts as Record<StrategyArchetype, number>,
    avgRevenues: Object.fromEntries(
      strategies.map(s => [s, totalRevenues[s] / simulations])
    ) as Record<StrategyArchetype, number>,
    avgBrandValues: Object.fromEntries(
      strategies.map(s => [s, totalBrandValues[s] / simulations])
    ) as Record<StrategyArchetype, number>,
    avgRanks: Object.fromEntries(
      strategies.map(s => [s, totalRanks[s] / simulations])
    ) as Record<StrategyArchetype, number>,
  };
}

// ============================================
// EXCEL GENERATION
// ============================================

function generateExcel(data: SimulationData, outputPath: string): void {
  console.log("Generating Excel report...");

  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const summaryData = [
    ["MONTE CARLO SIMULATION REPORT - ALL 7 STRATEGIES"],
    [""],
    ["Simulation Configuration"],
    ["Total Simulations", data.totalSimulations],
    ["Unique Matchups", data.matchupCount],
    ["Simulations per Matchup", data.simulationsPerMatchup],
    ["Rounds per Game", data.rounds],
    ["Teams per Game", CONFIG.teamsPerGame],
    [""],
    ["Strategy Overview"],
    ["Strategy", "Win Rate", "Wins", "Games", "Avg Revenue", "Avg Brand Value", "Avg Rank", "Description"],
  ];

  const sortedStrategies = ALL_STRATEGIES
    .map(s => ({
      strategy: s,
      winRate: data.globalStats.totalWins[s] / data.globalStats.totalGames[s],
      wins: data.globalStats.totalWins[s],
      games: data.globalStats.totalGames[s],
      avgRevenue: data.globalStats.allRevenues[s].reduce((a, b) => a + b, 0) / data.globalStats.allRevenues[s].length,
      avgBrand: data.globalStats.allBrandValues[s].reduce((a, b) => a + b, 0) / data.globalStats.allBrandValues[s].length,
      avgRank: data.globalStats.allRanks[s].reduce((a, b) => a + b, 0) / data.globalStats.allRanks[s].length,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  for (const s of sortedStrategies) {
    summaryData.push([
      s.strategy,
      `${(s.winRate * 100).toFixed(1)}%`,
      s.wins,
      s.games,
      `$${(s.avgRevenue / 1_000_000).toFixed(1)}M`,
      `${(s.avgBrand * 100).toFixed(1)}%`,
      s.avgRank.toFixed(2),
      STRATEGY_DESCRIPTIONS[s.strategy as StrategyArchetype],
    ]);
  }

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = [
    { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 8 },
    { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Executive Summary");

  // Sheet 2: Head-to-Head Matrix
  const h2hData = [
    ["HEAD-TO-HEAD WIN RATES"],
    ["(Row strategy beats Column strategy)"],
    [""],
    ["", ...ALL_STRATEGIES],
  ];

  for (const s1 of ALL_STRATEGIES) {
    const row: (string | number)[] = [s1];
    for (const s2 of ALL_STRATEGIES) {
      if (s1 === s2) {
        row.push("-");
      } else {
        const rate = data.h2hGames[s1][s2] > 0
          ? data.h2hWins[s1][s2] / data.h2hGames[s1][s2]
          : 0;
        row.push(`${(rate * 100).toFixed(0)}%`);
      }
    }
    h2hData.push(row);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(h2hData);
  ws2["!cols"] = Array(8).fill({ wch: 12 });
  XLSX.utils.book_append_sheet(wb, ws2, "Head-to-Head");

  // Sheet 3: All Matchup Results
  const matchupData = [
    ["ALL MATCHUP RESULTS"],
    [""],
    ["Matchup #", "Strategy 1", "Win %", "Strategy 2", "Win %", "Strategy 3", "Win %", "Strategy 4", "Win %"],
  ];

  for (let i = 0; i < data.matchupResults.length; i++) {
    const m = data.matchupResults[i];
    const row: (string | number)[] = [i + 1];
    for (const s of m.strategies) {
      row.push(s);
      row.push(`${(m.winCounts[s] / data.simulationsPerMatchup * 100).toFixed(0)}%`);
    }
    matchupData.push(row);
  }

  const ws3 = XLSX.utils.aoa_to_sheet(matchupData);
  ws3["!cols"] = [
    { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 8 },
    { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, ws3, "All Matchups");

  // Sheet 4: Revenue Analysis
  const revenueData = [
    ["REVENUE ANALYSIS"],
    [""],
    ["Strategy", "Avg Revenue ($M)", "% of Leader", "Min Revenue", "Max Revenue", "Std Dev"],
  ];

  const revenues = sortedStrategies.map(s => s.avgRevenue);
  const maxRev = Math.max(...revenues);

  for (const s of sortedStrategies) {
    const revArray = data.globalStats.allRevenues[s.strategy as StrategyArchetype];
    const min = Math.min(...revArray);
    const max = Math.max(...revArray);
    const mean = revArray.reduce((a, b) => a + b, 0) / revArray.length;
    const variance = revArray.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / revArray.length;
    const stdDev = Math.sqrt(variance);

    revenueData.push([
      s.strategy,
      (s.avgRevenue / 1_000_000).toFixed(1),
      `${(s.avgRevenue / maxRev * 100).toFixed(1)}%`,
      `$${(min / 1_000_000).toFixed(1)}M`,
      `$${(max / 1_000_000).toFixed(1)}M`,
      `$${(stdDev / 1_000_000).toFixed(2)}M`,
    ]);
  }

  const ws4 = XLSX.utils.aoa_to_sheet(revenueData);
  ws4["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws4, "Revenue Analysis");

  // Sheet 5: Brand Value Analysis
  const brandData = [
    ["BRAND VALUE ANALYSIS"],
    [""],
    ["Strategy", "Final Brand Value", "Starting Value", "Net Change"],
  ];

  for (const s of sortedStrategies) {
    const avgBrand = s.avgBrand;
    const startBrand = 0.5; // Starting brand value
    brandData.push([
      s.strategy,
      `${(avgBrand * 100).toFixed(1)}%`,
      `${(startBrand * 100).toFixed(1)}%`,
      `${((avgBrand - startBrand) * 100).toFixed(1)}%`,
    ]);
  }

  const ws5 = XLSX.utils.aoa_to_sheet(brandData);
  ws5["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws5, "Brand Analysis");

  // Sheet 6: Simulation Parameters
  const paramsData = [
    ["SIMULATION PARAMETERS"],
    [""],
    ["Category", "Parameter", "Value", "Description"],
    [""],
    ["Brand Mechanics", "Decay Rate", `${(CONSTANTS.BRAND_DECAY_RATE * 100).toFixed(1)}%`, "Brand value decay per round"],
    ["Brand Mechanics", "Max Growth/Round", `${(CONSTANTS.BRAND_MAX_GROWTH_PER_ROUND * 100).toFixed(1)}%`, "Maximum brand growth cap"],
    [""],
    ["ESG Mechanics", "High Threshold", CONSTANTS.ESG_HIGH_THRESHOLD, "Score for +5% bonus"],
    ["ESG Mechanics", "Mid Threshold", CONSTANTS.ESG_MID_THRESHOLD, "Score for +2% bonus"],
    ["ESG Mechanics", "High Bonus", `${(CONSTANTS.ESG_HIGH_BONUS * 100).toFixed(0)}%`, "Revenue bonus for high ESG"],
    ["ESG Mechanics", "Mid Bonus", `${(CONSTANTS.ESG_MID_BONUS * 100).toFixed(0)}%`, "Revenue bonus for mid ESG"],
    [""],
    ["Price Floor", "Penalty Threshold", `${(CONSTANTS.PRICE_FLOOR_PENALTY_THRESHOLD * 100).toFixed(0)}%`, "Below segment min triggers penalty"],
    ["Price Floor", "Max Penalty", `${(CONSTANTS.PRICE_FLOOR_PENALTY_MAX * 100).toFixed(0)}%`, "Maximum score reduction"],
    [""],
    ["Rubber Banding", "Trailing Boost", `${((CONSTANTS.RUBBER_BAND_TRAILING_BOOST - 1) * 100).toFixed(0)}%`, "Boost for trailing teams"],
    ["Rubber Banding", "Leading Penalty", `${((1 - CONSTANTS.RUBBER_BAND_LEADING_PENALTY) * 100).toFixed(0)}%`, "Penalty for leading teams"],
    [""],
    ["Segment Weights", "Budget", "Price:50, Quality:22, Brand:8, ESG:8, Features:12", "Sum=100"],
    ["Segment Weights", "General", "Price:32, Quality:28, Brand:10, ESG:10, Features:20", "Sum=100"],
    ["Segment Weights", "Enthusiast", "Price:20, Quality:40, Brand:10, ESG:10, Features:20", "Sum=100"],
    ["Segment Weights", "Professional", "Price:15, Quality:42, Brand:10, ESG:16, Features:17", "Sum=100"],
    ["Segment Weights", "Active Lifestyle", "Price:25, Quality:32, Brand:12, ESG:10, Features:21", "Sum=100"],
  ];

  const ws6 = XLSX.utils.aoa_to_sheet(paramsData);
  ws6["!cols"] = [{ wch: 18 }, { wch: 20 }, { wch: 50 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, ws6, "Parameters");

  // Sheet 7: Balance Assessment
  const winRates = sortedStrategies.map(s => s.winRate);
  const maxWinRate = Math.max(...winRates);
  const minWinRate = Math.min(...winRates);
  const normalizedWinRates = winRates.map(w => w / winRates.reduce((a, b) => a + b, 0));
  const entropy = -normalizedWinRates.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
  const diversityScore = entropy / Math.log2(ALL_STRATEGIES.length);
  const viableStrategies = sortedStrategies.filter(s => s.winRate >= 0.05).length;
  const revenueSpread = Math.max(...revenues) / Math.min(...revenues);

  const balanceData = [
    ["BALANCE ASSESSMENT"],
    [""],
    ["Metric", "Value", "Target", "Status"],
    ["Max Win Rate", `${(maxWinRate * 100).toFixed(1)}%`, "<60%", maxWinRate <= 0.60 ? "PASS" : "FAIL"],
    ["Diversity Score", diversityScore.toFixed(3), ">0.7", diversityScore > 0.7 ? "PASS" : "FAIL"],
    ["Viable Strategies", `${viableStrategies}/7`, ">=4", viableStrategies >= 4 ? "PASS" : "FAIL"],
    ["Revenue Spread", `${revenueSpread.toFixed(2)}x`, "<2.0x", revenueSpread < 2.0 ? "PASS" : "FAIL"],
    ["All Can Win", minWinRate > 0 ? "Yes" : "No", "Yes", minWinRate > 0 ? "PASS" : "FAIL"],
    [""],
    ["Tier List"],
    ["S-Tier (>40%)", sortedStrategies.filter(s => s.winRate > 0.40).map(s => s.strategy).join(", ") || "None"],
    ["A-Tier (25-40%)", sortedStrategies.filter(s => s.winRate > 0.25 && s.winRate <= 0.40).map(s => s.strategy).join(", ") || "None"],
    ["B-Tier (15-25%)", sortedStrategies.filter(s => s.winRate > 0.15 && s.winRate <= 0.25).map(s => s.strategy).join(", ") || "None"],
    ["C-Tier (5-15%)", sortedStrategies.filter(s => s.winRate > 0.05 && s.winRate <= 0.15).map(s => s.strategy).join(", ") || "None"],
    ["D-Tier (<5%)", sortedStrategies.filter(s => s.winRate <= 0.05).map(s => s.strategy).join(", ") || "None"],
  ];

  const ws7 = XLSX.utils.aoa_to_sheet(balanceData);
  ws7["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws7, "Balance Assessment");

  XLSX.writeFile(wb, outputPath);
  console.log(`Excel report saved to: ${outputPath}`);
}

// ============================================
// PDF GENERATION
// ============================================

function generatePDF(data: SimulationData, outputPath: string): void {
  console.log("Generating PDF report...");

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Title
  doc.fontSize(24).font("Helvetica-Bold").text("Monte Carlo Simulation Report", { align: "center" });
  doc.fontSize(14).font("Helvetica").text("All 7 Strategies - Comprehensive Analysis", { align: "center" });
  doc.moveDown(2);

  // Configuration
  doc.fontSize(16).font("Helvetica-Bold").text("Simulation Configuration");
  doc.fontSize(11).font("Helvetica");
  doc.text(`Total Simulations: ${data.totalSimulations.toLocaleString()}`);
  doc.text(`Unique Matchups: ${data.matchupCount}`);
  doc.text(`Simulations per Matchup: ${data.simulationsPerMatchup}`);
  doc.text(`Rounds per Game: ${data.rounds}`);
  doc.text(`Teams per Game: ${CONFIG.teamsPerGame}`);
  doc.moveDown(2);

  // Strategy Rankings
  doc.fontSize(16).font("Helvetica-Bold").text("Strategy Performance Rankings");
  doc.moveDown(0.5);

  const sortedStrategies = ALL_STRATEGIES
    .map(s => ({
      strategy: s,
      winRate: data.globalStats.totalWins[s] / data.globalStats.totalGames[s],
      wins: data.globalStats.totalWins[s],
      games: data.globalStats.totalGames[s],
      avgRevenue: data.globalStats.allRevenues[s].reduce((a, b) => a + b, 0) / data.globalStats.allRevenues[s].length,
      avgBrand: data.globalStats.allBrandValues[s].reduce((a, b) => a + b, 0) / data.globalStats.allBrandValues[s].length,
      avgRank: data.globalStats.allRanks[s].reduce((a, b) => a + b, 0) / data.globalStats.allRanks[s].length,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  // Table header
  const tableTop = doc.y;
  const col1 = 50, col2 = 130, col3 = 200, col4 = 280, col5 = 360, col6 = 440;

  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Strategy", col1, tableTop);
  doc.text("Win Rate", col2, tableTop);
  doc.text("Wins/Games", col3, tableTop);
  doc.text("Avg Revenue", col4, tableTop);
  doc.text("Brand Value", col5, tableTop);
  doc.text("Avg Rank", col6, tableTop);

  doc.moveTo(col1, tableTop + 15).lineTo(500, tableTop + 15).stroke();

  let y = tableTop + 20;
  doc.fontSize(10).font("Helvetica");
  for (const s of sortedStrategies) {
    doc.text(s.strategy, col1, y);
    doc.text(`${(s.winRate * 100).toFixed(1)}%`, col2, y);
    doc.text(`${s.wins}/${s.games}`, col3, y);
    doc.text(`$${(s.avgRevenue / 1_000_000).toFixed(1)}M`, col4, y);
    doc.text(`${(s.avgBrand * 100).toFixed(1)}%`, col5, y);
    doc.text(s.avgRank.toFixed(2), col6, y);
    y += 18;
  }

  doc.moveDown(4);

  // Head-to-Head Matrix
  doc.addPage();
  doc.fontSize(16).font("Helvetica-Bold").text("Head-to-Head Win Rates");
  doc.fontSize(10).font("Helvetica").text("(Row strategy beats Column strategy)");
  doc.moveDown();

  const shortNames: Record<string, string> = {
    "volume": "VOL", "premium": "PRE", "brand": "BRD", "automation": "AUT",
    "balanced": "BAL", "rd-focused": "R&D", "cost-cutter": "CUT",
  };

  const matrixTop = doc.y;
  const cellWidth = 50;
  const startX = 100;

  // Header row
  doc.fontSize(9).font("Helvetica-Bold");
  for (let i = 0; i < ALL_STRATEGIES.length; i++) {
    doc.text(shortNames[ALL_STRATEGIES[i]], startX + (i + 1) * cellWidth, matrixTop, { width: cellWidth, align: "center" });
  }

  // Data rows
  doc.font("Helvetica");
  for (let row = 0; row < ALL_STRATEGIES.length; row++) {
    const s1 = ALL_STRATEGIES[row];
    const rowY = matrixTop + 20 + row * 18;

    doc.font("Helvetica-Bold").text(shortNames[s1], 50, rowY);
    doc.font("Helvetica");

    for (let col = 0; col < ALL_STRATEGIES.length; col++) {
      const s2 = ALL_STRATEGIES[col];
      let value = "-";
      if (s1 !== s2) {
        const rate = data.h2hGames[s1][s2] > 0 ? data.h2hWins[s1][s2] / data.h2hGames[s1][s2] : 0;
        value = `${(rate * 100).toFixed(0)}%`;
      }
      doc.text(value, startX + (col + 1) * cellWidth, rowY, { width: cellWidth, align: "center" });
    }
  }

  doc.moveDown(8);

  // Balance Assessment
  doc.fontSize(16).font("Helvetica-Bold").text("Balance Assessment");
  doc.moveDown(0.5);

  const winRates = sortedStrategies.map(s => s.winRate);
  const maxWinRate = Math.max(...winRates);
  const minWinRate = Math.min(...winRates);
  const normalizedWinRates = winRates.map(w => w / winRates.reduce((a, b) => a + b, 0));
  const entropy = -normalizedWinRates.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
  const diversityScore = entropy / Math.log2(ALL_STRATEGIES.length);
  const viableStrategies = sortedStrategies.filter(s => s.winRate >= 0.05).length;
  const revenues = sortedStrategies.map(s => s.avgRevenue);
  const revenueSpread = Math.max(...revenues) / Math.min(...revenues);

  doc.fontSize(11).font("Helvetica");
  const check = (pass: boolean) => pass ? "[PASS]" : "[FAIL]";
  doc.text(`${check(maxWinRate <= 0.60)} Max Win Rate: ${(maxWinRate * 100).toFixed(1)}% (target: <60%)`);
  doc.text(`${check(diversityScore > 0.7)} Diversity Score: ${diversityScore.toFixed(3)} (target: >0.7)`);
  doc.text(`${check(viableStrategies >= 4)} Viable Strategies: ${viableStrategies}/7 (target: >=4)`);
  doc.text(`${check(revenueSpread < 2.0)} Revenue Spread: ${revenueSpread.toFixed(2)}x (target: <2.0x)`);
  doc.text(`${check(minWinRate > 0)} All Strategies Can Win: ${minWinRate > 0 ? "Yes" : "No"}`);

  doc.moveDown(2);

  // Tier List
  doc.fontSize(14).font("Helvetica-Bold").text("Strategy Tier List");
  doc.fontSize(11).font("Helvetica");
  doc.text(`S-Tier (>40%): ${sortedStrategies.filter(s => s.winRate > 0.40).map(s => s.strategy).join(", ") || "None"}`);
  doc.text(`A-Tier (25-40%): ${sortedStrategies.filter(s => s.winRate > 0.25 && s.winRate <= 0.40).map(s => s.strategy).join(", ") || "None"}`);
  doc.text(`B-Tier (15-25%): ${sortedStrategies.filter(s => s.winRate > 0.15 && s.winRate <= 0.25).map(s => s.strategy).join(", ") || "None"}`);
  doc.text(`C-Tier (5-15%): ${sortedStrategies.filter(s => s.winRate > 0.05 && s.winRate <= 0.15).map(s => s.strategy).join(", ") || "None"}`);
  doc.text(`D-Tier (<5%): ${sortedStrategies.filter(s => s.winRate <= 0.05).map(s => s.strategy).join(", ") || "None"}`);

  // Strategy Descriptions
  doc.addPage();
  doc.fontSize(16).font("Helvetica-Bold").text("Strategy Descriptions");
  doc.moveDown();

  for (const s of ALL_STRATEGIES) {
    doc.fontSize(12).font("Helvetica-Bold").text(s.charAt(0).toUpperCase() + s.slice(1));
    doc.fontSize(10).font("Helvetica").text(STRATEGY_DESCRIPTIONS[s]);
    doc.moveDown(0.5);
  }

  // Parameters
  doc.addPage();
  doc.fontSize(16).font("Helvetica-Bold").text("Simulation Parameters");
  doc.moveDown();

  doc.fontSize(12).font("Helvetica-Bold").text("Brand Mechanics");
  doc.fontSize(10).font("Helvetica");
  doc.text(`  Decay Rate: ${(CONSTANTS.BRAND_DECAY_RATE * 100).toFixed(1)}% per round`);
  doc.text(`  Max Growth/Round: ${(CONSTANTS.BRAND_MAX_GROWTH_PER_ROUND * 100).toFixed(1)}%`);
  doc.text(`  Score Formula: sqrt(brandValue) * weight`);
  doc.moveDown();

  doc.fontSize(12).font("Helvetica-Bold").text("Segment Scoring Weights");
  doc.fontSize(10).font("Helvetica");
  doc.text("  Budget: Price=50, Quality=22, Brand=8, ESG=8, Features=12");
  doc.text("  General: Price=32, Quality=28, Brand=10, ESG=10, Features=20");
  doc.text("  Enthusiast: Price=20, Quality=40, Brand=10, ESG=10, Features=20");
  doc.text("  Professional: Price=15, Quality=42, Brand=10, ESG=16, Features=17");
  doc.text("  Active Lifestyle: Price=25, Quality=32, Brand=12, ESG=10, Features=21");
  doc.moveDown();

  doc.fontSize(12).font("Helvetica-Bold").text("ESG Mechanics");
  doc.fontSize(10).font("Helvetica");
  doc.text(`  High Tier: Score ${CONSTANTS.ESG_HIGH_THRESHOLD}+ = +${(CONSTANTS.ESG_HIGH_BONUS * 100).toFixed(0)}% revenue`);
  doc.text(`  Mid Tier: Score ${CONSTANTS.ESG_MID_THRESHOLD}-${CONSTANTS.ESG_HIGH_THRESHOLD - 1} = +${(CONSTANTS.ESG_MID_BONUS * 100).toFixed(0)}% revenue`);
  doc.text(`  Low Tier: Score <${CONSTANTS.ESG_LOW_THRESHOLD} = 1-8% penalty`);

  // Footer
  doc.fontSize(8).font("Helvetica").text(
    `Generated: ${new Date().toISOString()} | Business Simulation Engine v2.4.0`,
    50, 750, { align: "center" }
  );

  doc.end();

  stream.on("finish", () => {
    console.log(`PDF report saved to: ${outputPath}`);
  });
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║              MONTE CARLO REPORT GENERATOR - ALL 7 STRATEGIES                  ║");
  console.log("╚════════════════════════════════════════════════════════════════════════════════╝\n");

  // Run simulation
  const data = runSimulation();

  // Create output directory
  const outputDir = path.join(__dirname, "..", "..", "reports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  // Generate Excel
  const excelPath = path.join(outputDir, `monte-carlo-report-${timestamp}.xlsx`);
  generateExcel(data, excelPath);

  // Generate PDF
  const pdfPath = path.join(outputDir, `monte-carlo-report-${timestamp}.pdf`);
  generatePDF(data, pdfPath);

  console.log("\n════════════════════════════════════════════════════════════════════════════════");
  console.log("                              REPORTS GENERATED");
  console.log("════════════════════════════════════════════════════════════════════════════════");
  console.log(`\nExcel: ${excelPath}`);
  console.log(`PDF:   ${pdfPath}`);
  console.log("");
}

main().catch(console.error);
