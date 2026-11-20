// FAST_E1_TR — Temporal Reversal | AB and C independent color palettes.
// AB: 45°↔225°, 135°↔315°; C: 0°↔180°, 90°↔270°.
// Target/distractor direction and shape are balanced in a 16-participant
// fractional-factorial cycle, with target hue x target shape balanced by role.
// This does NOT cover all 128 full-factorial combinations.
// Baseline 160; C-pre 160; AB 800; C-post 160. Total 1280 trials.
// Hue labels are nominal, not calibrated DKL coordinates.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CJSWindow from '../../components/gameWindow/cjsWindow/CJSWindow';
import CJSButton from '../../components/gameWindow/cjsWindow/cjsButton/CJSButton';
import moment from 'moment';
import { computeColorMetrics } from '../../scripts/colorMetrics';
import { Shuffle } from '../../scripts/shuffle';
import * as vismem from '../../scripts/vismemCC_simon';
import { saveJSONDataToClientDevice } from '../../uitls/offline';
import { getCalibration } from '../../scripts/calibration';

type Role = 'A' | 'B' | 'C';
type Segment = 'baseline' | 'C_pre' | 'AB' | 'C_post';
type AnalysisPhase = 'phase1' | 'phase2' | null;
type ShapeId = 0 | 1; // square, circle
type ColorIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type PairIdx = 0 | 1 | 2 | 3;
type SchedulePreset = 'extreme' | 'moderate';
type Target = { pairIdx: PairIdx; shape: ShapeId; color: ColorIdx; swapFlag: 0 | 1 };
type StimulusItem = { x: number; y: number; shape: 'square' | 'circle'; colorHex: string; isTarget: boolean };

type TrialRow = {
  segment: Segment;
  blockGlobal: number; // 1..16, one 80-trial unit per block
  blockInSegment: number; // baseline 1..2, C_pre 1..2, AB 1..10, C_post 1..2
  phase: AnalysisPhase;
  trialInBlock: number;
  role: Role;
  hasTarget: 0 | 1;
  programmedProbability: number;
};

type TrialLog = TrialRow & {
  index: number;
  trialIndexGlobal: number;
  participantId: number;
  experimentId: 'E1';
  taskVersion: string;
  schedulePreset: SchedulePreset;
  roleMeaning: 'ex' | 'new' | 'neutral';
  physicalTarget: { pairIdx: PairIdx; shape: 'square' | 'circle'; colorIdx: ColorIdx; colorHex: string };
  targetShape: 'square' | 'circle'; // the *searched-for* shape, even on absent trials
  targetColorHex: string; // searched-for color, even on absent trials
  targetXY: { x: number; y: number } | null;
  stimulusConfiguration: StimulusItem[];
  setSize: number;
  distractors: { sameShape_otherColor: number; otherShape_sameColor: number };
  respHasTarget: boolean;
  respCorrect: boolean;
  rtMs: number;
  startTime: string;
  answerTime: string;
  breakIndexBeforeTrial: number | null;
  trialAfterBreak: boolean;
  pageHiddenDuringTrial: boolean;
};

type BreakEvent = {
  breakIndex: number;
  afterTrial: number;
  beforeTrial: number;
  startedAt: string;
  endedAt: string;
  scheduledRestMs: number;
  actualRestMs: number;
  wasPageHidden: boolean;
  nextSegment: Segment;
  nextBlockGlobal: number;
  nextBlockInSegment: number;
};

const VERSION = 'FAST_E1_TR';
const EXPERIMENT_ID = 'E1' as const;
const PRESET: SchedulePreset = 'extreme'; // change to 'moderate' for 75/25 pilot
const SCHEDULES: Record<SchedulePreset, readonly number[]> = {
  extreme: [0.90, 0.70, 0.50, 0.30, 0.10],
  moderate: [0.75, 0.625, 0.50, 0.375, 0.25],
};
const BASELINE_TRIALS = 160; // A = 80, B = 80; 50% present for each
const TRIALS_PER_ROLE_PER_AB_BLOCK = 40;
const NUM_AB_BLOCKS = 10;
const CONTROL_TRIALS_PER_BLOCK = 80;
const CONTROL_BLOCKS_PRE = 2;
const CONTROL_BLOCKS_POST = 2;
const CONTROL_PROBABILITY = 0.5;
// Fixed, phase-blind breaks, aligned with every 80-trial global block boundary.
const BREAK_EVERY_N_TRIALS = 80;
const BREAK_REST_MS = 20_000;
const BREAK_COUNTDOWN_MS = 3_200; // existing visual countdown: 3, 2, 1


const CANVAS_W = 600, CANVAS_H = 600;
const GRID_COLS = 8, GRID_ROWS = 6;
const OBJ_SIZE = 45, RADIUS = OBJ_SIZE / 2, JITTER = 8;
const BG_COLOR = '#BCBCBC';
const DISTRACTOR_COUNT = 31;
// AB hues use the original 4-color palette. C uses its own independent 4-color palette.
// Pair indices 0-1 are exclusively A/B; 2-3 exclusively C.
// All pair separations are nominally 180 degrees.
const COLORS: readonly string[] = [
  '#76601D', // 45° AB
  '#1C7131', // 135° AB
  '#3359CC', // 225° AB
  '#AB2B8B', // 315° AB
  '#A83F3F', // 0° C
  '#446D1B', // 90° C
  '#296C6C', // 180° C
  '#8439CE', // 270° C
];
const NOMINAL_HUES = [45, 135, 225, 315, 0, 90, 180, 270] as const;
const COLOR_PAIRS: [ColorIdx, ColorIdx][] = [
  [0, 2], // AB 45° ↔ 225°
  [1, 3], // AB 135° ↔ 315°
  [4, 6], // C 0° ↔ 180°
  [5, 7], // C 90° ↔ 270°
];
const PAIR_LABEL = COLOR_PAIRS.map(([a, b]) => `${NOMINAL_HUES[a]}° ↔ ${NOMINAL_HUES[b]}°`);
const COUNTERBALANCE_CYCLE = 16;
const ROLE_MEANING = { A: 'ex', B: 'new', C: 'neutral' } as const;
const mean = (values: number[]) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
const nowISO = () => moment().format('YYYY-MM-DDTHH:mm:ss.SSS');
const shapeName = (shape: ShapeId): 'square' | 'circle' => shape === 1 ? 'circle' : 'square';
const otherShape = (shape: ShapeId): ShapeId => shape === 1 ? 0 : 1;
const otherColorInPair = (pair: PairIdx, color: ColorIdx): ColorIdx => {
  const [a, b] = COLOR_PAIRS[pair];
  if (color !== a && color !== b) throw new Error(`Color ${color} is not in pair ${pair}`);
  return color === a ? b : a;
};

type CBFlags = {
  abPairSwap: 0 | 1;
  A: 0 | 1;
  B: 0 | 1;
  cPair: 0 | 1;
  C: 0 | 1;
  shapeA: ShapeId;
  shapeC: ShapeId;
  cyclePosition: number;
};
// A/B retain the v13 fractional-factorial assignments unchanged.
// C TARGET is determined from the A/B target hues: the opposite midpoint of
// their SHORTER 90-degree arc. It is 135 degrees from each A/B target.
// C distractor remains the 180-degree opponent of C; its distance to A/B
// targets is 45 degrees, so the equidistance criterion applies to C TARGET.
// CB16 retains four C target hues x two C shapes, twice per 16-person cycle.
const CB_MASKS = {
  abPairSwap: 13,
  A: 11,
  B: 4,
  shapeA: 2,
  shapeC: 10,
} as const;
const parity = (value: number): 0 | 1 => {
  let x = value;
  let parityBit = 0;
  while (x) { parityBit ^= x & 1; x >>= 1; }
  return parityBit as 0 | 1;
};
const angularDistance = (a: number, b: number): number => {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
};
function cColorFromAB(aColor: ColorIdx, bColor: ColorIdx): ColorIdx {
  const aHue = NOMINAL_HUES[aColor];
  const bHue = NOMINAL_HUES[bColor];
  // Signed shortest arc (-180, 180]. With the A/B design this is always +/-90.
  const signedArc = ((bHue - aHue + 540) % 360) - 180;
  if (Math.abs(signedArc) !== 90) throw new Error(`A/B targets not 90° apart: ${aHue}, ${bHue}`);
  const targetCHue = (aHue + signedArc / 2 + 180 + 360) % 360;
  const index = NOMINAL_HUES.indexOf(targetCHue as typeof NOMINAL_HUES[number]);
  if (index < 4 || index > 7) throw new Error(`No C color for hue ${targetCHue}°`);
  return index as ColorIdx;
}
function counterbalanceFlags(userId: number): CBFlags {
  if (!Number.isInteger(userId) || userId < 1) throw new Error('FAST requires a positive integer participant ID');
  const cyclePosition = (userId - 1) % COUNTERBALANCE_CYCLE;
  const abPairSwap = parity(cyclePosition & CB_MASKS.abPairSwap);
  const A = parity(cyclePosition & CB_MASKS.A);
  const B = parity(cyclePosition & CB_MASKS.B);
  const aColor = COLOR_PAIRS[abPairSwap][A];
  const bColor = COLOR_PAIRS[1 - abPairSwap][B];
  const cColor = cColorFromAB(aColor, bColor);
  const cPair = (cColor === 4 || cColor === 6 ? 0 : 1) as 0 | 1;
  const C = (COLOR_PAIRS[2 + cPair][0] === cColor ? 0 : 1) as 0 | 1;
  return {
    abPairSwap, A, B,
    cPair, C, // derived from A/B; NOT independent counterbalance factors
    shapeA: parity(cyclePosition & CB_MASKS.shapeA),
    shapeC: parity(cyclePosition & CB_MASKS.shapeC),
    cyclePosition,
  };
}
function assignmentsFor(userId: number): Record<Role, Target> {
  const f = counterbalanceFlags(userId);
  const aPair = f.abPairSwap as PairIdx;
  const bPair = (1 - f.abPairSwap) as PairIdx;
  const cPair = (2 + f.cPair) as PairIdx;
  const targetFor = (pairIdx: PairIdx, swapFlag: 0 | 1, shape: ShapeId): Target => ({
    pairIdx, swapFlag, shape, color: COLOR_PAIRS[pairIdx][swapFlag],
  });
  return {
    A: targetFor(aPair, f.A, f.shapeA),
    B: targetFor(bPair, f.B, otherShape(f.shapeA)),
    C: targetFor(cPair, f.C, f.shapeC),
  };
}
function fixedTargetFor(userId: number, role: Role): Target {
  return assignmentsFor(userId)[role];
}
function validateCounterbalance(): void {
  const rows = Array.from({ length: COUNTERBALANCE_CYCLE }, (_, i) => {
    const userId = i + 1;
    const roles = assignmentsFor(userId);
    const flags = counterbalanceFlags(userId);
    if (roles.A.pairIdx === roles.B.pairIdx) throw new Error(`A/B share pair: participant ${userId}`);
    if (roles.A.pairIdx > 1 || roles.B.pairIdx > 1 || roles.C.pairIdx < 2) {
      throw new Error(`Color-set leakage: participant ${userId}`);
    }
    if (roles.A.shape === roles.B.shape) throw new Error(`A/B shapes not opposite: participant ${userId}`);
    if (new Set([roles.A.color, roles.B.color, roles.C.color]).size !== 3) {
      throw new Error(`Target colors duplicated: participant ${userId}`);
    }
    const aHue = NOMINAL_HUES[roles.A.color];
    const bHue = NOMINAL_HUES[roles.B.color];
    const cHue = NOMINAL_HUES[roles.C.color];
    if (angularDistance(aHue, bHue) !== 90 || angularDistance(aHue, cHue) !== 135 || angularDistance(bHue, cHue) !== 135) {
      throw new Error(`C is not equidistant/opposite midpoint: participant ${userId} (${aHue}, ${bHue}, ${cHue})`);
    }
    if (roles.C.color !== cColorFromAB(roles.A.color, roles.B.color)) {
      throw new Error(`Derived C identity mismatch: participant ${userId}`);
    }
    for (const role of ['A', 'B', 'C'] as const) {
      const t = roles[role];
      const other = otherColorInPair(t.pairIdx, t.color);
      if (angularDistance(NOMINAL_HUES[t.color], NOMINAL_HUES[other]) !== 180) {
        throw new Error(`Not opposite target/distractor hues: ${role}, participant ${userId}`);
      }
      if (t.swapFlag !== flags[role]) throw new Error(`Direction mismatch ${role}, participant ${userId}`);
    }
    return { roles, flags };
  });
  const assertCount = (name: string, n: number, expected: number) => {
    if (n !== expected) throw new Error(`Unbalanced ${name}: ${n} instead of ${expected}`);
  };
  // Only five independently assigned flags remain. cPair and C are derived.
  const flagNames = ['abPairSwap', 'A', 'B', 'shapeA', 'shapeC'] as const;
  const unique = new Set(rows.map(({ flags: f }) => flagNames.map(name => f[name]).join('/')));
  assertCount('unique fractional assignments', unique.size, COUNTERBALANCE_CYCLE);
  for (const flag of flagNames) {
    assertCount(`flag ${flag}=0`, rows.filter(({ flags }) => flags[flag] === 0).length, 8);
    for (const other of flagNames) {
      if (other === flag) continue;
      for (const v of [0, 1]) for (const w of [0, 1]) {
        assertCount(`${flag}=${v}, ${other}=${w}`,
          rows.filter(({ flags }) => flags[flag] === v && flags[other] === w).length, 4);
      }
    }
  }
  for (const role of ['A', 'B', 'C'] as const) {
    const palette = role === 'C' ? [4, 5, 6, 7] : [0, 1, 2, 3];
    for (const color of palette) for (const shape of [0, 1] as ShapeId[]) {
      assertCount(`${role} color ${color} shape ${shape}`, rows.filter(({ roles }) =>
        roles[role].color === color && roles[role].shape === shape).length, 2);
      assertCount(`${role} first eight color ${color} shape ${shape}`,
        rows.slice(0, 8).filter(({ roles }) => roles[role].color === color && roles[role].shape === shape).length, 1);
    }
  }
  const importantTriples: (readonly (keyof CBFlags)[])[] = [
    ['abPairSwap', 'A', 'shapeA'], ['abPairSwap', 'B', 'shapeA'], ['A', 'B', 'shapeC'],
  ];
  for (const triple of importantTriples) {
    const [a, b, c] = triple;
    for (const x of [0, 1]) for (const y of [0, 1]) for (const z of [0, 1]) {
      const matches = rows.filter(({ flags }) => flags[a] === x && flags[b] === y && flags[c] === z);
      assertCount(`${triple.join('/')}=${x}${y}${z}`, matches.length, 2);
      assertCount(`${triple.join('/')} first eight=${x}${y}${z}`,
        matches.filter(({ flags }) => flags.cyclePosition < 8).length, 1);
    }
  }
  assertCount('C shape matches A', rows.filter(({ roles }) => roles.C.shape === roles.A.shape).length, 8);
  assertCount('C shape matches B', rows.filter(({ roles }) => roles.C.shape === roles.B.shape).length, 8);
}

// Hex-only diagnostic; not a substitute for spectroradiometer-measured DKL.
const srgbChannelToLinear = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map(i => srgbChannelToLinear(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function colorDiagnostics() {
  const backgroundY = relativeLuminance(BG_COLOR);
  return COLORS.map((hex, index) => {
    const Y = relativeLuminance(hex);
    const contrastRatio = (Math.max(Y, backgroundY) + 0.05) / (Math.min(Y, backgroundY) + 0.05);
    return { index, hex, relativeLuminance: Y, contrastRatioVsBackground: contrastRatio };
  });
}

function abProbability(role: 'A' | 'B', blockInSegment: number, preset: SchedulePreset): number {
  const firstHalf = SCHEDULES[preset];
  const a = [...firstHalf, ...[...firstHalf].reverse()];
  const p = a[blockInSegment - 1];
  if (p === undefined) throw new Error(`Invalid A/B block ${blockInSegment}`);
  return role === 'A' ? p : 1 - p;
}

function makeExactTrials(role: Role, n: number, p: number, meta: Omit<TrialRow, 'role' | 'hasTarget' | 'programmedProbability' | 'trialInBlock'>): TrialRow[] {
  const exact = n * p;
  const present = Math.round(exact);
  if (Math.abs(exact - present) > 1e-9) throw new Error(`Non-integer present count: role ${role}, n=${n}, p=${p}`);
  return Array.from({ length: n }, (_, i) => ({ ...meta, role, hasTarget: (i < present ? 1 : 0) as 0 | 1, programmedProbability: p, trialInBlock: 0 }));
}

function shuffledBlock(rows: TrialRow[]): TrialRow[] {
  Shuffle(rows);
  return rows.map((row, i) => ({ ...row, trialInBlock: i + 1 }));
}

function buildSchedule(preset: SchedulePreset): TrialRow[] {
  const all: TrialRow[] = [];
  let blockGlobal = 0;
  const baselineEach = BASELINE_TRIALS / 2;
  if (!Number.isInteger(baselineEach)) throw new Error('Baseline count must be divisible by two');
  // Shuffle the 160 baseline trials ONCE, exactly as before; only label each
  // consecutive 80-trial chunk as a separate global/segment block.
  const baseline = shuffledBlock([
    ...makeExactTrials('A', baselineEach, 0.5, { blockGlobal: 1, blockInSegment: 1, segment: 'baseline', phase: null }),
    ...makeExactTrials('B', baselineEach, 0.5, { blockGlobal: 1, blockInSegment: 1, segment: 'baseline', phase: null }),
  ]);
  all.push(...baseline.map((row, index) => ({
    ...row, blockGlobal: Math.floor(index / BREAK_EVERY_N_TRIALS) + 1,
    blockInSegment: Math.floor(index / BREAK_EVERY_N_TRIALS) + 1,
    trialInBlock: (index % BREAK_EVERY_N_TRIALS) + 1,
  })));
  blockGlobal = 2;
  for (let i = 0; i < CONTROL_BLOCKS_PRE; i++) {
    blockGlobal++;
    all.push(...shuffledBlock(makeExactTrials('C', CONTROL_TRIALS_PER_BLOCK, CONTROL_PROBABILITY,
      { blockGlobal, blockInSegment: i + 1, segment: 'C_pre', phase: null })));
  }
  for (let blockInSegment = 1; blockInSegment <= NUM_AB_BLOCKS; blockInSegment++) {
    blockGlobal++;
    const phase: AnalysisPhase = blockInSegment <= 5 ? 'phase1' : 'phase2';
    const meta = { blockGlobal, segment: 'AB' as const, blockInSegment, phase };
    all.push(...shuffledBlock([
      ...makeExactTrials('A', TRIALS_PER_ROLE_PER_AB_BLOCK, abProbability('A', blockInSegment, preset), meta),
      ...makeExactTrials('B', TRIALS_PER_ROLE_PER_AB_BLOCK, abProbability('B', blockInSegment, preset), meta),
    ]));
  }
  for (let i = 0; i < CONTROL_BLOCKS_POST; i++) {
    blockGlobal++;
    all.push(...shuffledBlock(makeExactTrials('C', CONTROL_TRIALS_PER_BLOCK, CONTROL_PROBABILITY,
      { blockGlobal, blockInSegment: i + 1, segment: 'C_post', phase: null })));
  }
  validateSchedule(all, preset);
  return all;
}

function validateSchedule(rows: TrialRow[], preset: SchedulePreset): void {
  const expected = BASELINE_TRIALS + CONTROL_TRIALS_PER_BLOCK * (CONTROL_BLOCKS_PRE + CONTROL_BLOCKS_POST)
    + NUM_AB_BLOCKS * 2 * TRIALS_PER_ROLE_PER_AB_BLOCK;
  if (rows.length !== expected) throw new Error(`Expected ${expected} trials, found ${rows.length}`);
  const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(`FAST schedule: ${message}`); };
  for (let b = 1; b <= NUM_AB_BLOCKS; b++) {
    const block = rows.filter(r => r.segment === 'AB' && r.blockInSegment === b);
    assert(block.length === 80, `A/B block ${b} must have 80 trials`);
    for (const role of ['A', 'B'] as const) {
      const selected = block.filter(r => r.role === role);
      const p = abProbability(role, b, preset);
      assert(selected.length === 40, `A/B block ${b} ${role} must have 40 trials`);
      assert(selected.filter(r => r.hasTarget).length === Math.round(40 * p), `A/B block ${b} ${role} present count`);
      assert(selected.every(r => r.phase === (b <= 5 ? 'phase1' : 'phase2')), `A/B block ${b} phase`);
    }
  }
  for (const segment of ['C_pre', 'C_post'] as const) {
    const blocks = Array.from(new Set(rows.filter(r => r.segment === segment).map(r => r.blockGlobal)));
    assert(blocks.length === (segment === 'C_pre' ? CONTROL_BLOCKS_PRE : CONTROL_BLOCKS_POST), `${segment} block count`);
    for (const b of blocks) {
      const rs = rows.filter(r => r.blockGlobal === b);
      assert(rs.length === CONTROL_TRIALS_PER_BLOCK, `${segment} block ${b} length`);
      assert(rs.every(r => r.role === 'C' && r.blockInSegment >= 1 && r.phase === null), `${segment} labels`);
      assert(rs.filter(r => r.hasTarget).length === CONTROL_TRIALS_PER_BLOCK / 2, `${segment} present count`);
    }
  }
  const baseline = rows.filter(r => r.segment === 'baseline');
  assert(baseline.length === BASELINE_TRIALS, 'baseline length');
  for (const role of ['A', 'B'] as const) {
    const rs = baseline.filter(r => r.role === role);
    assert(rs.length === baselineEachCount(), `baseline ${role} count`);
    assert(rs.filter(r => r.hasTarget).length === rs.length / 2, `baseline ${role} presence`);
  }
  const expectedGlobalBlocks = expected / BREAK_EVERY_N_TRIALS;
  assert(Number.isInteger(expectedGlobalBlocks), 'global blocks must be integer');
  for (let i = 0; i < rows.length; i++) {
    assert(rows[i].blockGlobal === Math.floor(i / BREAK_EVERY_N_TRIALS) + 1, `global block at trial ${i + 1}`);
    assert(rows[i].trialInBlock === i % BREAK_EVERY_N_TRIALS + 1, `trialInBlock at trial ${i + 1}`);
  }
  assert(new Set(rows.map(r => r.blockGlobal)).size === expectedGlobalBlocks, 'global block count');
  for (const segment of ['baseline', 'C_pre', 'AB', 'C_post'] as Segment[]) {
    const blocks = Array.from(new Set(rows.filter(r => r.segment === segment).map(r => r.blockInSegment)));
    const n = segment === 'baseline' ? 2 : segment === 'C_pre' ? CONTROL_BLOCKS_PRE
      : segment === 'AB' ? NUM_AB_BLOCKS : CONTROL_BLOCKS_POST;
    assert(blocks.length === n && blocks.every((b, i) => b === i + 1), `${segment} local block numbering`);
  }
  console.info(`[${VERSION}] validated ${rows.length} trials`, { preset });
}
const baselineEachCount = () => BASELINE_TRIALS / 2;

// Kept at module level to match the original drawing utilities.
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let centerX = 0, centerY = 0;
let gridXs: number[] = [], gridYs: number[] = [];
let SCHEDULE: TrialRow[] = [];
let TRIAL_LOG: TrialLog[] = [];
let currTrial = 0, startTs = 0;
let lastItems: StimulusItem[] = [];
let lastTargetXY: { x: number; y: number } | null = null;
let lastDistractorCounts = { sameShape_otherColor: 0, otherShape_sameColor: 0 };
let startTime = '';
let timeouts: ReturnType<typeof setTimeout>[] = [];
const clearAllTimeouts = () => { timeouts.forEach(clearTimeout); timeouts = []; };

function makeGrid() {
  gridXs = Array.from({ length: GRID_COLS }, (_, col) => (col + 0.5) * CANVAS_W / GRID_COLS);
  gridYs = Array.from({ length: GRID_ROWS }, (_, row) => (row + 0.5) * CANVAS_H / GRID_ROWS);
}
function makeBackground() {
  vismem.makeRectangle('bg', centerX, centerY, CANVAS_W, CANVAS_H, false, BG_COLOR, BG_COLOR, 0, 0);
}
function clearScene() {
  vismem.erase(ctx); vismem.clear(); makeBackground(); vismem.drawObjects(ctx, vismem.objects);
}
function createTrialStimulus(hasTarget: 0 | 1, target: Target) {
  vismem.erase(ctx); vismem.clear(); makeBackground();
  const positions = Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => i);
  Shuffle(positions);
  const coords = positions.slice(0, DISTRACTOR_COUNT + 1).map(id => {
    // In this mapping, columns are the fast-changing coordinate.
    const col = id % GRID_COLS;
    const row = Math.floor(id / GRID_COLS);
    return { x: gridXs[col] + (Math.random() * 2 - 1) * JITTER,
      y: gridYs[row] + (Math.random() * 2 - 1) * JITTER };
  });
  const nA = Math.floor(DISTRACTOR_COUNT / 2);
  const nB = DISTRACTOR_COUNT - nA;
  const otherColor = otherColorInPair(target.pairIdx, target.color);
  const distractorTypes = [
    ...Array.from({ length: nA }, () => ({ shape: target.shape, color: otherColor })),
    ...Array.from({ length: nB }, () => ({ shape: otherShape(target.shape), color: target.color })),
  ];
  if (!hasTarget) {
    // 32nd element is another distractor: balancing the two distractor categories at 16/16.
    distractorTypes.push({ shape: target.shape, color: otherColor });
  }
  Shuffle(distractorTypes);
  lastItems = distractorTypes.map((item, i) => ({ ...coords[i], shape: shapeName(item.shape), colorHex: COLORS[item.color], isTarget: false }));
  if (hasTarget) {
    lastItems.push({ ...coords[DISTRACTOR_COUNT], shape: shapeName(target.shape), colorHex: COLORS[target.color], isTarget: true });
    lastTargetXY = { ...coords[DISTRACTOR_COUNT] };
  } else {
    lastTargetXY = null;
  }
  lastDistractorCounts = { sameShape_otherColor: nA + (hasTarget ? 0 : 1), otherShape_sameColor: nB };
  for (const item of lastItems) {
    if (item.shape === 'circle') vismem.makeCircle('c', item.x, item.y, RADIUS, false, 2, item.colorHex, item.colorHex);
    else vismem.makeRectangle('s', item.x, item.y, OBJ_SIZE, OBJ_SIZE, false, item.colorHex, item.colorHex, 0, 0);
  }
  vismem.drawObjects(ctx, vismem.objects);
}

// CSV files are intentionally FLAT: one row per trial for analysis and audit.
// The full nested stimulus configurations and design metadata remain in JSON.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Prevent spreadsheet formula injection if values are later opened in Excel.
  if (/^[\s]*[=+@\-]/.test(str) && typeof value === 'string') str = "'" + str;
  return '"' + str.replace(/"/g, '""') + '"';
}
function saveCsv(rows: Array<Record<string, unknown>>, columns: readonly string[], filename: string): void {
  const csv = [columns.map(csvCell).join(','),
    ...rows.map(row => columns.map(col => csvCell(row[col])).join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

type Outcome = 'hit' | 'miss' | 'false_alarm' | 'correct_rejection';
function trialOutcome(hasTarget: boolean | 0 | 1, responsePresent: boolean): Outcome {
  return hasTarget ? (responsePresent ? 'hit' : 'miss') : (responsePresent ? 'false_alarm' : 'correct_rejection');
}

// Canonical, flat, stable analysis schema; actual stimulus and response are distinct.
function trialAnalysisRow(row: TrialLog): Record<string, unknown> {
  return {
    participantId: row.participantId, experimentId: row.experimentId, taskVersion: row.taskVersion,
    schedulePreset: row.schedulePreset, trialIndexGlobal: row.trialIndexGlobal,
    blockGlobal: row.blockGlobal, segment: row.segment, blockInSegment: row.blockInSegment,
    phase: row.phase, trialInBlock: row.trialInBlock, role: row.role,
    programmedProbability: Number(row.programmedProbability.toFixed(4)),
    hasTarget: Boolean(row.hasTarget), responsePresent: row.respHasTarget,
    correct: row.respCorrect, outcome: trialOutcome(row.hasTarget, row.respHasTarget),
    rtMs: row.rtMs, targetShape: row.targetShape, targetColorHex: row.targetColorHex,
    startTime: row.startTime, answerTime: row.answerTime,
    trialAfterBreak: row.trialAfterBreak, breakIndexBeforeTrial: row.breakIndexBeforeTrial,
    pageHiddenDuringTrial: row.pageHiddenDuringTrial,
  };
}
const ANALYSIS_COLUMNS = [
  'participantId', 'experimentId', 'taskVersion', 'schedulePreset',
  'trialIndexGlobal', 'blockGlobal', 'segment', 'blockInSegment', 'phase',
  'trialInBlock', 'role', 'programmedProbability',
  'hasTarget', 'responsePresent', 'correct', 'outcome', 'rtMs',
  'targetShape', 'targetColorHex', 'startTime', 'answerTime',
  'trialAfterBreak', 'breakIndexBeforeTrial', 'pageHiddenDuringTrial',
] as const;

// Detailed actual stimuli, planned schedule, assignments and color measurements
// are deliberately retained in audit.json, not expanded into hundreds of CSV columns.
function auditActualTrial(row: TrialLog) {
  const target = fixedTargetFor(row.participantId, row.role);
  const other = otherColorInPair(target.pairIdx, target.color);
  return {
    ...trialAnalysisRow(row),
    legacyBlockFields: {
      sessionBlock: row.segment === 'baseline' ? 0 : row.blockGlobal - 2,
      abBlock: row.segment === 'AB' ? row.blockInSegment : null,
    },
    roleMeaning: row.roleMeaning,
    target: { pairIdx: target.pairIdx, nominalHue: NOMINAL_HUES[target.color],
      hex: COLORS[target.color], shape: shapeName(target.shape), colorIndex: target.color },
    otherColorDistractor: { nominalHue: NOMINAL_HUES[other], hex: COLORS[other], colorIndex: other },
    targetXY: row.targetXY,
    distractorCounts: row.distractors,
    stimulusConfiguration: row.stimulusConfiguration,
  };
}

function logScheduleDebug(schedule: TrialRow[], participantId: number): void {
  const assignments = assignmentsFor(participantId);
  console.group(`[${VERSION}] Participant ${participantId} | stimulus assignments`);
  console.table((['A', 'B', 'C'] as Role[]).map(role => {
    const t = assignments[role]; const d = otherColorInPair(t.pairIdx, t.color);
    return {
      role, shape: shapeName(t.shape), pairIdx: t.pairIdx, pair: PAIR_LABEL[t.pairIdx],
      targetHue: NOMINAL_HUES[t.color], targetHex: COLORS[t.color],
      distractorHue: NOMINAL_HUES[d], distractorHex: COLORS[d],
      targetLuminanceSrgb: relativeLuminance(COLORS[t.color]),
      distractorLuminanceSrgb: relativeLuminance(COLORS[d]),
      ...(role === 'C' ? { cDistanceToA: angularDistance(NOMINAL_HUES[t.color], NOMINAL_HUES[assignments.A.color]),
        cDistanceToB: angularDistance(NOMINAL_HUES[t.color], NOMINAL_HUES[assignments.B.color]) } : {}),
    };
  }));
  console.groupEnd();
  console.group(`[${VERSION}] Present/Absent per role and global block`);
  const blocks = Array.from(new Set(schedule.map(row => row.blockGlobal)));
  console.table(blocks.reduce<Array<Record<string, unknown>>>((out, block) => {
    const blockRows = schedule.filter(row => row.blockGlobal === block);
    for (const role of ['A', 'B', 'C'] as Role[]) {
      const selected = blockRows.filter(row => row.role === role);
      if (!selected.length) continue;
      out.push({ blockGlobal: block, segment: selected[0].segment,
        blockInSegment: selected[0].blockInSegment, phase: selected[0].phase, role,
        probability: `${(selected[0].programmedProbability * 100).toFixed(2).replace(/\.00$/, '')}%`,
        present: selected.filter(row => row.hasTarget === 1).length,
        absent: selected.filter(row => row.hasTarget === 0).length,
        nTrials: selected.length });
    }
    return out;
  }, []));
  console.groupEnd();
  const plannedTrials = schedule.map((row, index) => {
    const t = assignments[row.role], d = otherColorInPair(t.pairIdx, t.color);
    return {
      trial: index + 1, blockGlobal: row.blockGlobal,
      segment: row.segment, blockInSegment: row.blockInSegment, phase: row.phase,
      trialInBlock: row.trialInBlock, role: row.role,
      present: row.hasTarget === 1, probability: `${(row.programmedProbability * 100).toFixed(2).replace(/\.00$/, '')}%`,
      shape: shapeName(t.shape), targetHue: NOMINAL_HUES[t.color],
      targetHex: COLORS[t.color], distractorHex: COLORS[d],
    };
  });
  // Full schedule is kept as a global for easy debugging without flooding Console on startup.
  (window as any).__FAST_E1_TR_DEBUG__ = {
    participantId, version: VERSION, schedule, assignments,
    plannedTrials, colorDiagnostics: colorDiagnostics(),
    printAllTrials: () => console.table(plannedTrials),
    printBlock: (block: number) => console.table(plannedTrials.filter(row => row.blockGlobal === block)),
    printSegmentBlock: (segment: Segment, localBlock: number) =>
      console.table(plannedTrials.filter(row => row.segment === segment && row.blockInSegment === localBlock)),
    getCompletedTrials: () => TRIAL_LOG.map(trialAnalysisRow),
    printCompletedTrials: () => console.table(TRIAL_LOG.map(trialAnalysisRow)),
    getBreaks: () => breakEventsForDebug(),
  };
  console.info(`[${VERSION}] On-demand: __FAST_E1_TR_DEBUG__.printBlock(5), .printSegmentBlock("AB", 1), .printAllTrials(), .printCompletedTrials()`);
}
// Initialized by the mounted task; exposed through the debug object above.
let breakEventsForDebug: () => BreakEvent[] = () => [];

export default function FAST_E1_TR(props: { userId: number }) {
  const navigate = useNavigate();
  const [searchTarget, setSearchTarget] = useState<{ shape: ShapeId; col: ColorIdx }>();
  const [disabledButton, setDisabledButton] = useState(true);
  const [breakPrompt, setBreakPrompt] = useState(false);
  const [breakSecondsRemaining, setBreakSecondsRemaining] = useState(20);
  const breakStartEpoch = useRef<number | null>(null);
  const breakStartIso = useRef('');
  const breakWasHidden = useRef(false);
  const breakTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const breakEvents = useRef<BreakEvent[]>([]);
  const lastBreakIndex = useRef<number | null>(null);
  const breakTransitionLocked = useRef(false);
  const responseLocked = useRef(true); // synchronous double-keypress guard
  const trialPageHidden = useRef(false);
  const calibration = useMemo(() => getCalibration(), []);
  const searchTargetList = useMemo(() => ([
    COLORS.map((color, i) => ({
      description: `สี่เหลี่ยมสี ${NOMINAL_HUES[i]}°`,
      color,
      shape: 'square' as const,
    })),
    COLORS.map((color, i) => ({
      description: `วงกลมสี ${NOMINAL_HUES[i]}°`,
      color,
      shape: 'circle' as const,
    })),
  ]), []);

  useEffect(() => {
    document.body.style.cursor = 'none';
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    try { void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch(() => {}); } catch { /* optional */ }
    const found = document.getElementById('myCanvas') as HTMLCanvasElement | null;
    if (!found) { console.error('Canvas #myCanvas not found'); return; }
    canvas = found;
    const c = canvas.getContext('2d');
    if (!c) throw new Error('Cannot get canvas 2D context');
    ctx = c;
    centerX = canvas.width / 2; centerY = canvas.height / 2;
    makeGrid();
    validateCounterbalance();
    // Color-metric computation is stored in audit; startup shows concise tables only.
    const computedMetrics = computeColorMetrics([...COLORS], BG_COLOR, COLOR_PAIRS);
    console.table(colorDiagnostics());
    (window as any).__FAST_COLOR_METRICS__ = computedMetrics;
    currTrial = 0; TRIAL_LOG = []; responseLocked.current = true; SCHEDULE = buildSchedule(PRESET);
    breakEvents.current = []; lastBreakIndex.current = null; breakStartEpoch.current = null;
    breakEventsForDebug = () => breakEvents.current.map(event => ({ ...event }));
    breakTransitionLocked.current = false; breakWasHidden.current = false;
    logScheduleDebug(SCHEDULE, props.userId);
    nextTrial();
    return () => {
      document.body.style.cursor = 'default';
      clearAllTimeouts();
      if (breakTimer.current !== null) clearInterval(breakTimer.current);
      breakTimer.current = null;
      breakStartEpoch.current = null;
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
    };
    // Keep this component mounted during the task; changing userId requires remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser tabs can throttle timers. Never start a trial while the tab is hidden.
  // A visibility interruption is logged; a longer-than-planned break remains possible
  // when the participant leaves the task or the browser is backgrounded.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && !responseLocked.current) trialPageHidden.current = true;
      if (breakStartEpoch.current === null) return;
      if (document.hidden) {
        breakWasHidden.current = true;
      } else {
        checkBreakTimer();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function checkBreakTimer() {
    const started = breakStartEpoch.current;
    if (started === null || breakTransitionLocked.current) return;
    const elapsedMs = Date.now() - started;
    setBreakSecondsRemaining(Math.max(0, Math.ceil((BREAK_REST_MS - elapsedMs) / 1000)));
    if (elapsedMs < BREAK_REST_MS || document.hidden) return;

    breakTransitionLocked.current = true;
    if (breakTimer.current !== null) clearInterval(breakTimer.current);
    breakTimer.current = null;
    const index = Math.floor(currTrial / BREAK_EVERY_N_TRIALS);
    const next = SCHEDULE[currTrial];
    breakEvents.current.push({
      breakIndex: index,
      afterTrial: currTrial,
      beforeTrial: currTrial + 1,
      startedAt: breakStartIso.current,
      endedAt: nowISO(),
      scheduledRestMs: BREAK_REST_MS,
      actualRestMs: Date.now() - started,
      wasPageHidden: breakWasHidden.current,
      nextSegment: next.segment,
      nextBlockGlobal: next.blockGlobal,
      nextBlockInSegment: next.blockInSegment,
    });
    lastBreakIndex.current = index;
    breakStartEpoch.current = null;
    setBreakPrompt(false);
    showCountdownThen(() => runTrialAtIndex(currTrial));
  }

  function startFixedBreak() {
    responseLocked.current = true;
    setDisabledButton(true);
    setSearchTarget(undefined); // Blank target cue throughout the rest screen.
    clearScene();
    setBreakSecondsRemaining(BREAK_REST_MS / 1000);
    breakTransitionLocked.current = false;
    breakWasHidden.current = document.hidden;
    breakStartIso.current = nowISO();
    breakStartEpoch.current = Date.now();
    setBreakPrompt(true);
    if (breakTimer.current !== null) clearInterval(breakTimer.current);
    breakTimer.current = setInterval(checkBreakTimer, 100);
  }

  function showCountdownThen(callback: () => void) {
    responseLocked.current = true;
    setDisabledButton(true);
    setSearchTarget(undefined); // Don't reveal the next target during 3-2-1.
    clearScene();
    const draw = (value: string) => {
      ctx.font = '120px Sarabun';
      const width = ctx.measureText(value).width;
      vismem.drawText(ctx, vismem.makeText('t', centerX - width / 2, centerY + 36, value, 'Black', ctx.font));
    };
    timeouts.push(
      setTimeout(() => { clearScene(); draw('3'); }, 200),
      setTimeout(() => { clearScene(); draw('2'); }, 1200),
      setTimeout(() => { clearScene(); draw('1'); }, 2200),
      setTimeout(() => {
        clearScene();
        if (document.hidden) {
          // Browser backgrounding must not start a timed search trial unseen.
          const retryWhenVisible = () => {
            if (document.hidden) timeouts.push(setTimeout(retryWhenVisible, 250));
            else showCountdownThen(callback);
          };
          retryWhenVisible();
        } else callback();
      }, BREAK_COUNTDOWN_MS),
    );
  }

  function nextTrial() {
    if (currTrial >= SCHEDULE.length) { finish(); return; }
    // All 15 visible breaks occur after 80, 160, ... 1200 trials, including
    // one halfway through baseline and none after the final trial.
    if (currTrial > 0 && currTrial % BREAK_EVERY_N_TRIALS === 0) {
      startFixedBreak();
    } else if (currTrial === 0) {
      showCountdownThen(() => runTrialAtIndex(currTrial));
    } else {
      runTrialAtIndex(currTrial);
    }
  }

  function runTrialAtIndex(index: number) {
    const row = SCHEDULE[index];
    if (!row) throw new Error(`Missing trial ${index}`);
    const target = fixedTargetFor(props.userId, row.role);
    setSearchTarget({ shape: target.shape, col: target.color });
    createTrialStimulus(row.hasTarget, target);
    startTime = nowISO();
    startTs = performance.now();
    trialPageHidden.current = document.hidden;
    responseLocked.current = false;
    setDisabledButton(false);
  }

  function checkResp(answer: 0 | 1) {
    if (responseLocked.current || !SCHEDULE[currTrial]) return;
    responseLocked.current = true;
    const rt = Math.round(performance.now() - startTs);
    const row = SCHEDULE[currTrial];
    const target = fixedTargetFor(props.userId, row.role);
    const correct = row.hasTarget === answer;
    TRIAL_LOG.push({
      ...row, index: currTrial, trialIndexGlobal: currTrial + 1,
      participantId: props.userId, experimentId: EXPERIMENT_ID,
      taskVersion: VERSION, schedulePreset: PRESET,
      roleMeaning: ROLE_MEANING[row.role],
      physicalTarget: { pairIdx: target.pairIdx, shape: shapeName(target.shape), colorIdx: target.color, colorHex: COLORS[target.color] },
      targetShape: shapeName(target.shape), targetColorHex: COLORS[target.color], targetXY: lastTargetXY,
      stimulusConfiguration: lastItems.map(item => ({ ...item })), setSize: DISTRACTOR_COUNT + 1,
      distractors: { ...lastDistractorCounts }, respHasTarget: answer === 1, respCorrect: correct,
      rtMs: rt, startTime, answerTime: nowISO(),
      trialAfterBreak: currTrial > 0 && currTrial % BREAK_EVERY_N_TRIALS === 0,
      breakIndexBeforeTrial: currTrial > 0 && currTrial % BREAK_EVERY_N_TRIALS === 0 ? lastBreakIndex.current : null,
      pageHiddenDuringTrial: trialPageHidden.current,
    });
    setDisabledButton(true);
    clearScene();
    ctx.font = '120px Sarabun';
    const value = correct ? 'ถูก' : 'ผิด';
    const width = ctx.measureText(value).width;
    timeouts.push(
      setTimeout(() => { vismem.drawText(ctx, vismem.makeText('t', centerX - width / 2, centerY + 30, value, 'Black', ctx.font)); }, 100),
      setTimeout(() => clearScene(), 600),
      setTimeout(() => { currTrial++; nextTrial(); }, 900),
    );
  }

  function finish() {
    setDisabledButton(true);
    const summarise = (rows: TrialLog[]) => {
      const correct = rows.filter(r => r.respCorrect).map(r => r.rtMs);
      const incorrect = rows.filter(r => !r.respCorrect).map(r => r.rtMs);
      return { nTrials: rows.length, correct: correct.length, incorrect: incorrect.length,
        meanRtMs_correct: mean(correct), meanRtMs_wrong: mean(incorrect) };
    };
    const byBlockRole: Array<Record<string, unknown>> = [];
    const blockGlobals = Array.from(new Set(TRIAL_LOG.map(r => r.blockGlobal)));
    for (const block of blockGlobals) {
      for (const role of ['A', 'B', 'C'] as Role[]) {
        const subset = TRIAL_LOG.filter(r => r.blockGlobal === block && r.role === role);
        if (subset.length > 0) {
          byBlockRole.push({
            blockGlobal: block,
            blockInSegment: subset[0].blockInSegment,
            segment: subset[0].segment,
            role,
            ...summarise(subset),
          });
        }
      }
    }
    const assignment = Object.fromEntries((['A', 'B', 'C'] as Role[]).map(role => {
      const target = fixedTargetFor(props.userId, role);
      return [role, { pairIdx: target.pairIdx, swapFlag: target.swapFlag, shape: shapeName(target.shape), colorIdx: target.color, colorHex: COLORS[target.color], distractorColorIdx: otherColorInPair(target.pairIdx, target.color), distractorColorHex: COLORS[otherColorInPair(target.pairIdx, target.color)] }];
    }));
    const payload = {
      metadata: { experimentId: EXPERIMENT_ID, version: VERSION, schedulePreset: PRESET, date: nowISO(), userId: props.userId, calibration },
      design: {
        mode: 'conjunction', setSize: DISTRACTOR_COUNT + 1,
        baselineTrials: BASELINE_TRIALS, numABBlocks: NUM_AB_BLOCKS,
        trialsPerRolePerBlock: TRIALS_PER_ROLE_PER_AB_BLOCK,
        trialsPerABBlock: TRIALS_PER_ROLE_PER_AB_BLOCK * 2,
        controlBlocksPre: CONTROL_BLOCKS_PRE, controlBlocksPost: CONTROL_BLOCKS_POST,
        controlTrialsPerBlock: CONTROL_TRIALS_PER_BLOCK,
        controlProbability: CONTROL_PROBABILITY,
        blockSchema: {
          blockGlobal: '1..16: consecutive 80-trial units, aligned to break boundaries',
          blockInSegment: 'baseline 1..2, C_pre 1..2, AB 1..10, C_post 1..2',
          phase: 'phase1 AB 1..5, phase2 AB 6..10; null outside AB',
          legacyBlockFields: 'original v12 sessionBlock/abBlock labels available in audit trials only',
        },
        testingTrials: NUM_AB_BLOCKS * 2 * TRIALS_PER_ROLE_PER_AB_BLOCK,
        totalTrials: SCHEDULE.length,
        breakConfig: {
          everyNTrials: BREAK_EVERY_N_TRIALS, scheduledRestMs: BREAK_REST_MS,
          countdownMs: BREAK_COUNTDOWN_MS, autoResume: true,
          expectedBreaks: Math.floor((SCHEDULE.length - 1) / BREAK_EVERY_N_TRIALS),
          participantVisiblePhaseLabels: false,
        },
        colorPairs: COLOR_PAIRS.map(([a, b]) => [COLORS[a], COLORS[b]]),
        nominalHueAngles: NOMINAL_HUES,
        targetDistractorNominalSeparationDegrees: 180,
        counterbalanceCycleParticipants: COUNTERBALANCE_CYCLE,
        counterbalanceFlags: counterbalanceFlags(props.userId),
        counterbalanceCriterion: 'CB16: five independent A/B/shape flags balanced individually and pairwise. C target hue is DERIVED from A/B (opposite midpoint of shorter arc, 135 degrees from each). Each C target hue x shape combination occurs twice per 16-person cycle, once in the first eight IDs. C pair/direction are not independent factors.',
        counterbalanceMasks: CB_MASKS,
        colorOverlapNote: 'C TARGET hue is 135 nominal degrees from both A/B TARGET hues. C distractor is opposite to C target, hence 45 degrees from each A/B target. Nominal hue separation does not guarantee equal perceptual salience or no transfer; validate in pilot.',
        cTargetAssignmentRule: 'Opposite midpoint of shortest A/B target-hue arc; angular distance C target to A and B = 135 degrees each. C_pre and C_post use same target identity.',
        colorSets: { AB: [COLORS[0], COLORS[1], COLORS[2], COLORS[3]], C: [COLORS[4], COLORS[5], COLORS[6], COLORS[7]] },
        colorPairLabels: PAIR_LABEL,
        colorDiagnostics: colorDiagnostics(),
        colorCalibrationStatus: 'hex-only, nominal hue labels; monitor-specific DKL angles and cone contrast NOT verified',
        probabilitySchedule: Object.fromEntries(Array.from({ length: NUM_AB_BLOCKS }, (_, i) => [i + 1,
          { A: abProbability('A', i + 1, PRESET), B: abProbability('B', i + 1, PRESET) }])),
        presetCandidates: SCHEDULES,
        note: 'A/B baseline followed by 2 C-pre blocks, 10 A/B blocks, and 2 C-post blocks. C never mixed with A/B.',
      },
      assignment,
      plannedSchedule: SCHEDULE.map((row, index) => {
        const t = fixedTargetFor(props.userId, row.role);
        const d = otherColorInPair(t.pairIdx, t.color);
        return { trialIndexGlobal: index + 1, ...row,
          legacyBlockFields: { sessionBlock: row.segment === 'baseline' ? 0 : row.blockGlobal - 2,
            abBlock: row.segment === 'AB' ? row.blockInSegment : null },
          hasTarget: Boolean(row.hasTarget),
          targetShape: shapeName(t.shape), targetColorHex: COLORS[t.color],
          targetNominalHue: NOMINAL_HUES[t.color],
          distractorColorHex: COLORS[d], distractorNominalHue: NOMINAL_HUES[d] };
      }),
      actualTrials: TRIAL_LOG.map(auditActualTrial),
      colorMetrics: {
        srgbHexDiagnostics: colorDiagnostics(),
        projectUtility: computeColorMetrics([...COLORS], BG_COLOR, COLOR_PAIRS),
        note: 'Computed from hex; not physical monitor calibration or verified DKL chromatic contrast',
      },
      breaks: breakEvents.current,
      exportFormats: { analysisCsv: 'one row per completed trial; analysis-ready',
        auditJson: 'nested planned schedule, actual responses, stimulus configurations, breaks and color diagnostics' },
      summary: { overall: summarise(TRIAL_LOG), byBlockRole },
    };
    if (TRIAL_LOG.length !== SCHEDULE.length) throw new Error('Incomplete trial log');
    const expectedBreaks = Math.floor((SCHEDULE.length - 1) / BREAK_EVERY_N_TRIALS);
    if (breakEvents.current.length !== expectedBreaks) throw new Error(`Expected ${expectedBreaks} breaks, got ${breakEvents.current.length}`);
    const stem = `Subject${props.userId}_${VERSION}_${nowISO().replace(/:/g, '-')}`;
    // Tabular end-of-task summary appears once; trial logs stay queryable on demand.
    console.group(`[${VERSION}] Completed | Subject ${props.userId}`);
    console.table(byBlockRole);
    console.table((['A', 'B', 'C'] as Role[]).map(role => {
      const subset = TRIAL_LOG.filter(r => r.role === role);
      return { role, ...summarise(subset),
        hit: subset.filter(r => trialOutcome(r.hasTarget, r.respHasTarget) === 'hit').length,
        miss: subset.filter(r => trialOutcome(r.hasTarget, r.respHasTarget) === 'miss').length,
        falseAlarm: subset.filter(r => trialOutcome(r.hasTarget, r.respHasTarget) === 'false_alarm').length,
        correctRejection: subset.filter(r => trialOutcome(r.hasTarget, r.respHasTarget) === 'correct_rejection').length };
    }));
    console.groupEnd();
    saveCsv(TRIAL_LOG.map(trialAnalysisRow), ANALYSIS_COLUMNS, `${stem}_analysis.csv`);
    saveJSONDataToClientDevice(payload, `${stem}_audit.json`);
    console.info(`[${VERSION}] Exported 2 files: analysis CSV (${TRIAL_LOG.length} rows) and audit JSON.`, stem);
    navigate('/landing');
  }

  return (
    <div className="h-screen w-full bg-[#BCBCBC] flex flex-col">
      <div className="absolute top-4 right-6 text-md text-gray-700/70 select-none">
        {currTrial >= SCHEDULE.length && SCHEDULE.length ? 100 : SCHEDULE.length ? Math.min(99, Math.floor((currTrial / SCHEDULE.length) * 100)) : 0}%
      </div>
      <div className="flex justify-center items-center flex-grow p-5">
        <CJSWindow searchTarget={searchTarget} searchTargetList={searchTargetList}
          canvasWidth={CANVAS_W} canvasHeight={CANVAS_H} />
        <CJSButton searchTarget={searchTarget} disabledButton={disabledButton} checkResp={checkResp} />
      </div>
      {breakPrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#BCBCBC]">
          <div className="text-center p-8 text-gray-800 select-none" role="status" aria-live="off">
            <p className="text-2xl font-semibold mb-5">พักสายตาสักครู่</p>
            <p className="text-6xl font-bold tabular-nums mb-5">00:{String(breakSecondsRemaining).padStart(2, '0')}</p>
            <p className="text-lg">ระบบจะเริ่มต่อโดยอัตโนมัติ</p>
            <p className="text-sm mt-3 text-gray-600">กรุณาเตรียมตัวเมื่อใกล้ครบเวลา</p>
          </div>
        </div>
      )}
    </div>
  );
}
