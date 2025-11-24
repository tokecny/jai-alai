// FAST_2R_15B_TC (alt prob + reversed mapping for same subject ids)
// - 2 roles (ex/new)
// - Baseline 160 trials (role ละ 80 = 40 present + 40 absent)
// - Testing 15 blocks = 480 trials (block ละ 32 = role ละ 16)
// - ex p per block:  [90,70,50,30,10,10,30,50,70,90,50,50,50,50,50]
//   new p per block: [10,30,50,70,90,90,70,50,30,10,50,50,50,50,50]
// - Countdown ที่ trial indices: 0, 160, 320, 480
// - Fixed target mapping: **reversed** จากเวอร์ชันก่อนหน้า (subject เดิมจะได้ pair/shape ของ ex สลับกับเดิม)
//   ↳ ex: pair สลับเป็นคู่ตรงข้ามของเวอร์ชันก่อนหน้า + shape สลับกับเดิม
// - สีชุดใหม่ (45°, 135°, 225°, 315°) จัดเป็น 2 คู่: (45°↔225°) และ (135°↔315°)
//   ปรับโทนให้ contrast ต่อ BG ~3.2 และ contrast ภายในคู่ ~1 (ใกล้เคียง)

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CJSWindow from '../../components/gameWindow/cjsWindow/CJSWindow';
import CJSButton from '../../components/gameWindow/cjsWindow/cjsButton/CJSButton';
import useSound from 'use-sound';
import clickSoundSrc from '../../assets/sound/click.mp3';
import combo2SoundSrc from '../../assets/sound/combo2.mp3';
import losingSoundSrc from '../../assets/sound/losingStreak.mp3';
import moment from 'moment';
import { computeColorMetrics } from '../../scripts/colorMetrics';
import { Shuffle } from '../../scripts/shuffle';
import * as vismem from '../../scripts/vismemCC_simon';
import { saveJSONDataToClientDevice } from '../../uitls/offline';
import { getCalibration } from "../../scripts/calibration";

// ==== Types ====
type Phase = 'baseline' | 'testing';
type Role = 'ex' | 'new';

type ShapeId = 0 | 1; // 0=square, 1=circle

type ColorIdx = 0 | 1 | 2 | 3; // index ใน COLORS

type PairIdx = 0 | 1; // index ใน COLOR_PAIRS

type TrialRow = {
  setSize: number;
  hasTarget: 0 | 1;
  role: 'baseline' | Role;
  pairIdx: PairIdx;
  block: number; // 0=baseline, 1..15=testing
};

type TrialLog = {
  index: number;
  phase: Phase;
  block: number; // 0..15
  role: Role;
  hasTarget: boolean;
  respHasTarget: boolean;
  respCorrect: boolean;
  rtMs: number;
  startTime: string;
  answerTime: string;
  targetShape: 'square' | 'circle';
  targetColorHex: string | null;
  targetXY: { x: number, y: number } | null;
  distractors: { sameShape_otherColor: number; otherShape_sameColor: number };
};

let TRIAL_LOG: TrialLog[] = [];
const calibration = getCalibration();

// ===============================
// Visual & Task Constants
// ===============================
const VERSION = 'FAST_2R_15B_TC';

const CANVAS_W = 600;
const CANVAS_H = 600;
const GRID_COLS = 8;
const GRID_ROWS = 6;
const TILE_W = CANVAS_W / GRID_COLS;
const TILE_H = CANVAS_H / GRID_ROWS;

const OBJ_SIZE = 45;
const RADIUS = OBJ_SIZE / 2;
const JITTER = 8;
const BG_COLOR = '#BCBCBC';

const SET_SIZE = 31; // distractors ต่อ trial (จะวาด setSize + 1 ตำแหน่ง)

// ===============================
// New Color Set (≈45°, 135°, 225°, 315°)
// ปรับโทนให้ contrast ต่อ BG ≈ 3.2 และภายในคู่ ~1
//   45°  ~ brown
//   135° ~ green
//   225° ~ blue
//   315° ~ magenta
// **หมายเหตุ**: หากต้องการปรับละเอียด สามารถปรับ HEX และดูผลได้จาก computeColorMetrics()
const COLORS: string[] = [
  '#76601D', // ~45°
  '#1C7131', // ~135°
  '#3359CC', // ~225°
  '#AB2B8B', // ~315°
];

// Two pairs:
//  - Pair 0: 45° ↔ 225°  (indices 0,2)
//  - Pair 1: 135° ↔ 315° (indices 1,3)
const COLOR_PAIRS: [ColorIdx, ColorIdx][] = [
  [0, 2],
  [1, 3],
];

const PAIR_LABEL: Record<number, string> = {
  0: '45° ↔ 225° ',
  1: '135° ↔ 315°',
};

// ==== Prob schedule arrays (length 15) ====
const EX_PROB = [0.9,0.7,0.5,0.3,0.1, 0.1,0.3,0.5,0.7,0.9, 0.5,0.5,0.5,0.5,0.5];
const NEW_PROB = [0.1,0.3,0.5,0.7,0.9, 0.9,0.7,0.5,0.3,0.1, 0.5,0.5,0.5,0.5,0.5];

const PROB_SCHEDULE: Record<number, { ex: number; new: number }> = (() => {
  const out: Record<number, any> = {};
  for (let b = 1; b <= 15; b++) out[b] = { ex: EX_PROB[b-1], new: NEW_PROB[b-1] };
  return out;
})();

// ---- Landmarks for countdown ----
const BASELINE_PER_ROLE = 80;
const ROLES: Role[] = ['ex','new'];
const ROLES_COUNT = ROLES.length; // 2
const BASELINE_TOTAL = BASELINE_PER_ROLE * ROLES_COUNT; // 160
const TEST_TRIALS_PER_ROLE_PER_BLOCK = 16;
const TEST_TRIALS_PER_BLOCK = TEST_TRIALS_PER_ROLE_PER_BLOCK * ROLES_COUNT; // 32
const COUNTDOWN_AT = [0, BASELINE_TOTAL, BASELINE_TOTAL + 5*TEST_TRIALS_PER_BLOCK, BASELINE_TOTAL + 10*TEST_TRIALS_PER_BLOCK];

// ===============================
// Helpers
// ===============================
const mean = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
const toPhase = (block: number): Phase => (block === 0 ? 'baseline' : 'testing');

interface SearchTarget { shape: ShapeId; col: ColorIdx; }

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let centerX = 0;
let centerY = 0;
let gridXs: number[] = [];
let gridYs: number[] = [];

let SCHEDULE: TrialRow[] = [];
let TRIAL_COUNT = 0;

let currTrial = 0;
let startTs = 0;

let hitRt: number[] = [];
let allRt: number[] = [];

let change = NaN;
let allStartTime: string[] = [];
let allClickTime: string[] = [];
let allSetSizes: number[] = [];
let allModes: string[] = [];
let checkAns: ('right' | 'wrong' | 'late')[] = [];

let timeouts: any[] = [];

let lastTargetShape: ShapeId | null = null;
let lastTargetColorIdx: ColorIdx | null = null;
let lastTargetXY: { x: number; y: number } | null = null;
let lastDistractorCounts = { sameShape_otherColor: 0, otherShape_sameColor: 0 };

let COLOR_METRICS: any = null;

function nowISO() { return moment().format('YYYY-MM-DDTkk:mm:ss.SSSSSS'); }
function clearAllTimeouts() { timeouts.forEach(clearTimeout); timeouts = []; }
function makeGrid() {
  gridXs = []; gridYs = [];
  for (let cx = 0; cx < GRID_COLS; cx++) gridXs.push(Math.round(TILE_W/2) + TILE_W*cx - CANVAS_W/2 + centerX);
  for (let cy = 0; cy < GRID_ROWS; cy++) gridYs.push(Math.round(TILE_H/2) + TILE_H*cy - CANVAS_H/2 + centerY);
}
function otherColorInPair(pairIdx: PairIdx, color: ColorIdx): ColorIdx {
  const [a,b] = COLOR_PAIRS[pairIdx];
  return (color === a ? b : a) as ColorIdx;
}

// ===============================
// Fixed target per user (Reversed mapping vs previous version)
// ===============================
// Shape sequences (reversed vs previous):
//  - ex: square,square,circle,circle (k=0..3)
//  - new: circle,circle,square,square
const SHAPE_SEQ_EX:  ShapeId[] = [0, 0, 1, 1];
const SHAPE_SEQ_NEW: ShapeId[] = [1, 1, 0, 0];

function fixedTargetFor(userId: number, role: Role) {
  const zero = Math.max(0, Math.floor(userId - 1)); // 0-based
  const k = zero % 4;                               // 0..3

  // Pair of ex: **reverse** จากเวอร์ชันก่อนหน้า
  //   - เดิม: id คี่→pair0, id คู่→pair1
  //   - ใหม่: id คี่→pair1, id คู่→pair0  (สลับ)
  const exPairIdx: PairIdx = (zero % 2 === 0) ? 1 : 0;
  const newPairIdx: PairIdx = (exPairIdx === 0 ? 1 : 0);
  const pairIdx: PairIdx = (role === 'ex' ? exPairIdx : newPairIdx);

  // Shape ตามลำดับใหม่ (สลับกับเดิม): ex ใช้ [0,0,1,1], new ใช้ [1,1,0,0]
  const shape: ShapeId = (role === 'ex') ? SHAPE_SEQ_EX[k] : SHAPE_SEQ_NEW[k];

  // สีในคู่: ใช้ k parity เลือก A/B ให้กระจายเท่ากันเมื่อมองข้าม subject
  const [A, B] = COLOR_PAIRS[pairIdx];
  const color: ColorIdx = (k % 2 === 0 ? A : B);

  return { pairIdx, shape, color };
}

function roleFromPairIdx(userId: number, pairIdx: PairIdx): Role {
  const exPair = fixedTargetFor(userId, 'ex').pairIdx;
  return (pairIdx === exPair) ? 'ex' : 'new';
}

function logCounterbalanceDebug(schedule: TrialRow[], userId: number) {
  console.group(`[FAST_2R_15B_TC DEBUG] Counter-balance | userId=${userId}`);
  const fixedRows = (['ex','new'] as Role[]).map((r) => {
    const ft = fixedTargetFor(userId, r);
    const alt = otherColorInPair(ft.pairIdx, ft.color);
    return {
      role: r,
      pairIdx: ft.pairIdx,
      pair: PAIR_LABEL[ft.pairIdx],
      shape: ft.shape === 1 ? 'circle' : 'square',
      colorIdx: ft.color,
      colorHex: COLORS[ft.color],
      otherColorIdx: alt,
      otherColorHex: COLORS[alt],
    };
  });
  console.table(fixedRows);

  const baseline = schedule.filter(r => r.block === 0);
  const baseSummary = (['ex','new'] as Role[]).map((r) => {
    const pIdx = fixedTargetFor(userId, r).pairIdx;
    const present = baseline.filter(x => x.pairIdx === pIdx && x.hasTarget === 1).length;
    const absent  = baseline.filter(x => x.pairIdx === pIdx && x.hasTarget === 0).length;
    return { phase: 'baseline', role: r, pairIdx: pIdx, pair: PAIR_LABEL[pIdx], present, absent, total: present + absent };
  });
  console.table(baseSummary);

  for (let b = 1; b <= 15; b++) {
    const rows = schedule.filter(r => r.block === b);
    const perBlock = (['ex','new'] as Role[]).map((r) => {
      const pIdx = fixedTargetFor(userId, r).pairIdx;
      const present = rows.filter(x => x.role === r && x.pairIdx === pIdx && x.hasTarget === 1).length;
      const absent  = rows.filter(x => x.role === r && x.pairIdx === pIdx && x.hasTarget === 0).length;
      const p = present + absent ? Number((present / (present + absent)).toFixed(2)) : 0;
      return { block: b, role: r, pairIdx: pIdx, pair: PAIR_LABEL[pIdx], present, absent, p };
    });
    console.table(perBlock);
  }

  console.table(schedule.slice(0, 24).map((r, i) => {
    const roleResolved = r.role === 'baseline' ? roleFromPairIdx(userId, r.pairIdx) : r.role;
    return { idx: i, block: r.block, role: roleResolved, pairIdx: r.pairIdx, pair: PAIR_LABEL[r.pairIdx], setSize: r.setSize + 1, hasTarget: r.hasTarget };
  }));

  (window as any).__FAST_2R_15B_TC_DEBUG__ = { userId, schedule };
  console.groupEnd();
}

// ===============================
// Schedule Builder
// ===============================
function buildSchedule(userId: number): TrialRow[] {
  // Baseline 160
  const baseline: TrialRow[] = [];
  (['ex','new'] as Role[]).forEach(role => {
    const { pairIdx } = fixedTargetFor(userId, role);
    for (let i = 0; i < 40; i++) baseline.push({ setSize: SET_SIZE, hasTarget: 1, role: 'baseline', pairIdx, block: 0 });
    for (let i = 0; i < 40; i++) baseline.push({ setSize: SET_SIZE, hasTarget: 0, role: 'baseline', pairIdx, block: 0 });
  });
  Shuffle(baseline);

  // Testing 15 blocks (32 ต่อบล็อก = role ละ 16)
  const testing: TrialRow[] = [];
  for (let bi = 1; bi <= 15; bi++) {
    let blockRows: TrialRow[] = [];
    for (const role of (['ex','new'] as Role[])) {
      const { pairIdx } = fixedTargetFor(userId, role);
      const trialsPerRole = 16;
      const p = (role === 'ex') ? EX_PROB[bi-1] : NEW_PROB[bi-1];
      const presentN = Math.round(trialsPerRole * p);
      const absentN  = trialsPerRole - presentN;
      for (let i = 0; i < presentN; i++) blockRows.push({ setSize: SET_SIZE, hasTarget: 1, role, pairIdx, block: bi });
      for (let i = 0; i < absentN;  i++) blockRows.push({ setSize: SET_SIZE, hasTarget: 0, role, pairIdx, block: bi });
    }
    Shuffle(blockRows);
    testing.push(...blockRows);
  }

  return [...baseline, ...testing];
}

// ===============================
// React Component
// ===============================
function FAST_2R_15B_TC(props: { userId: number }) {
  const navigate = useNavigate();
  const [clickSound] = useSound(clickSoundSrc);
  const [combo2Sound] = useSound(combo2SoundSrc);
  const [losingSound] = useSound(losingSoundSrc);

  const [searchTarget, setSearchTarget] = useState<SearchTarget>();
  const [disabledButton, setDisabledButton] = useState(false);

  const searchTargetList = useMemo(() => ([
    [
      { description: 'สี่เหลี่ยมสีน้ำตาล', color: COLORS[0], shape: 'square' },
      { description: 'สี่เหลี่ยมสีเขียว', color: COLORS[1], shape: 'square' },
      { description: 'สี่เหลี่ยมสีน้ำเงิน', color: COLORS[2], shape: 'square' },
      { description: 'สี่เหลี่ยมสีชมพู', color: COLORS[3], shape: 'square' },
    ],
    [
      { description: 'วงกลมสีน้ำตาล', color: COLORS[0], shape: 'circle' },
      { description: 'วงกลมสีเขียว', color: COLORS[1], shape: 'circle' },
      { description: 'วงกลมสีน้ำเงิน', color: COLORS[2], shape: 'circle' },
      { description: 'วงกลมสีชมพู', color: COLORS[3], shape: 'circle' },
    ],
  ]), []);

  useEffect(() => {
    document.body.style.cursor = "none"
    tryEnterFullscreen();
    initState();
    createCanvas();
    COLOR_METRICS = computeColorMetrics(COLORS, BG_COLOR, COLOR_PAIRS);
    console.log('Color Metrics (alt):', COLOR_METRICS);
    SCHEDULE = buildSchedule(props.userId);
    TRIAL_COUNT = SCHEDULE.length; // 640

    logCounterbalanceDebug(SCHEDULE, props.userId);
    nextTrial();

    return () => {
      document.body.style.cursor = "default"
      clearAllTimeouts();
      if (document.fullscreenElement) { tryExitFullscreen(); }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, []);

  function tryEnterFullscreen() {
    const el = document.documentElement;
    const anyEl = el as any;
    const fn = el.requestFullscreen || anyEl.webkitRequestFullscreen || anyEl.msRequestFullscreen;
    try { fn?.call(el); } catch {}
  }

  function tryExitFullscreen() {
    const d: any = document;
    const fn = document.exitFullscreen || d.webkitExitFullscreen || d.msExitFullscreen;
    try { fn?.call(document); } catch {}
  }

  // -------------------------------
  // State init & canvas
  // -------------------------------
  function initState() {
    currTrial = 0; startTs = 0; hitRt = []; allRt = [];
    change = NaN; allStartTime = []; allClickTime = []; allSetSizes = []; allModes = []; checkAns = [];
    lastTargetShape = null; lastTargetColorIdx = null; lastTargetXY = null;
    lastDistractorCounts = { sameShape_otherColor: 0, otherShape_sameColor: 0 };
  }

  function createCanvas() {
    const el = document.getElementById('myCanvas') as HTMLCanvasElement | null;
    if (!el) { console.warn('Canvas element #myCanvas not found at mount time.'); return; }
    canvas = el; const _ctx = canvas.getContext('2d'); if (!_ctx) throw new Error('Cannot get 2D context from canvas.');
    ctx = _ctx as CanvasRenderingContext2D; centerX = canvas.width / 2; centerY = canvas.height / 2; makeGrid();
  }

  // -------------------------------
  // Countdown
  // -------------------------------
  function showCountdownThen(cb: () => void) {
    setDisabledButton(true);
    vismem.erase(ctx); vismem.clear(); makeBackground(); vismem.drawObjects(ctx, vismem.objects);

    const draw = (t: string) => {
      const font = '120px Sarabun';
      ctx.font = font; const w = ctx.measureText(t).width;
      const text = vismem.makeText('t', centerX - w / 2, centerY + 36, t, 'Black', font);
      vismem.drawText(ctx, text);
    };

    timeouts.push(
      setTimeout(() => { vismem.erase(ctx); vismem.clear(); makeBackground(); draw('3'); }, 200),
      setTimeout(() => { vismem.erase(ctx); vismem.clear(); makeBackground(); }, 900),
      setTimeout(() => { draw('2'); }, 1200),
      setTimeout(() => { vismem.erase(ctx); vismem.clear(); makeBackground(); }, 1900),
      setTimeout(() => { draw('1'); }, 2200),
      setTimeout(() => { vismem.erase(ctx); vismem.clear(); makeBackground(); }, 2900),
      setTimeout(() => { cb(); }, 3200),
    );
  }

  // -------------------------------
  // Trial loop
  // -------------------------------
  function nextTrial() {
    if (currTrial >= TRIAL_COUNT) { finish(); return; }
    if (COUNTDOWN_AT.includes(currTrial)) { showCountdownThen(() => runTrialAtIndex(currTrial)); }
    else { runTrialAtIndex(currTrial); }
  }

  function runTrialAtIndex(idx: number) {
    setDisabledButton(false);
    const row = SCHEDULE[idx];
    const { setSize, hasTarget } = row;
    const roleResolved = row.role === 'baseline' ? roleFromPairIdx(props.userId, row.pairIdx) : row.role;

    console.log(`[FAST_2R_15B_TC trial ${idx}] block=${row.block} role=${roleResolved} pair=${row.pairIdx}:${PAIR_LABEL[row.pairIdx]} setSize=${row.setSize+1} hasTarget=${row.hasTarget}`);

    let targetShape: ShapeId; let targetColorIdx: ColorIdx; let pairIdx: PairIdx;

    if (row.role === 'baseline') {
      const roles: Role[] = ['ex','new'];
      const pick = roles.map(r => ({ r, ft: fixedTargetFor(props.userId, r) }))
                        .find(x => x.ft.pairIdx === row.pairIdx);
      const ft = pick ? pick.ft : fixedTargetFor(props.userId, 'ex');
      targetShape = ft.shape; targetColorIdx = ft.color; pairIdx = ft.pairIdx;
    } else {
      const ft = fixedTargetFor(props.userId, row.role as Role);
      targetShape = ft.shape; targetColorIdx = ft.color; pairIdx = ft.pairIdx;
    }

    allModes.push('conjunction search');
    setSearchTarget({ shape: targetShape, col: targetColorIdx });

    createTrialStimulus(setSize, hasTarget as 0 | 1, pairIdx, targetShape, targetColorIdx);
    startTs = Date.now(); allStartTime.push(nowISO());
  }

  // -------------------------------
  // Stimulus drawing (conjunction)
  // -------------------------------
  function makeBackground() {
    vismem.makeRectangle('bg', centerX, centerY, CANVAS_W, CANVAS_H, false, BG_COLOR, BG_COLOR, 0, 0);
  }

  function createTrialStimulus(
    setSize: number,
    hasTarget: 0 | 1,
    pairIdx: PairIdx,
    targetShape: ShapeId,
    targetColorIdx: ColorIdx
  ) {
    vismem.erase(ctx); vismem.clear(); makeBackground();

    const posIds: number[] = [];
    let pid = 0;
    for (let gx = 0; gx < GRID_COLS; gx++) for (let gy = 0; gy < GRID_ROWS; gy++) posIds.push(pid++);
    Shuffle(posIds);

    const X: number[] = [], Y: number[] = [];
    for (let i = 0; i < setSize + 1; i++) {
      const iPid = posIds[i];
      const cx = gridXs[iPid % GRID_COLS];
      const cy = gridYs[Math.floor(iPid / GRID_COLS)];
      X.push(cx); Y.push(cy);
    }

    const otherColorIdx = otherColorInPair(pairIdx, targetColorIdx);
    const otherShape: ShapeId = (targetShape === 1 ? 0 : 1);

    const nA = Math.floor(setSize / 2);
    const nB = setSize - nA;
    lastDistractorCounts = { sameShape_otherColor: nA, otherShape_sameColor: nB };

    const dShapes: ShapeId[] = [...Array(nA).fill(targetShape), ...Array(nB).fill(otherShape)];
    const dHexes: string[]  = [...Array(nA).fill(COLORS[otherColorIdx]), ...Array(nB).fill(COLORS[targetColorIdx])];

    const order = Array.from({ length: setSize }, (_, i) => i);
    Shuffle(order);

    for (let ii = 0; ii < setSize; ii++) {
      const i = order[ii];
      const rx = X[ii] + (Math.random() - 0.5) * 2 * JITTER;
      const ry = Y[ii] + (Math.random() - 0.5) * 2 * JITTER;
      const colHex = dHexes[i];
      if (dShapes[i] === 1) vismem.makeCircle('c', rx, ry, RADIUS, false, 2, colHex, colHex);
      else vismem.makeRectangle('s', rx, ry, OBJ_SIZE, OBJ_SIZE, false, colHex, colHex, 0, 0);
    }

    allSetSizes.push(setSize + 1);

    if (hasTarget === 1) {
      const tx = X[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      const ty = Y[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      const tHex = COLORS[targetColorIdx];
      if (targetShape === 1) vismem.makeCircle('c', tx, ty, RADIUS, false, 2, tHex, tHex);
      else vismem.makeRectangle('s', tx, ty, OBJ_SIZE, OBJ_SIZE, false, tHex, tHex, 0, 0);
      change = 1; lastTargetShape = targetShape; lastTargetColorIdx = targetColorIdx; lastTargetXY = { x: X[setSize], y: Y[setSize] };
    } else {
      const useA = setSize % 2 === 0;
      const dShape = useA ? targetShape : otherShape;
      const dHex   = useA ? COLORS[otherColorIdx] : COLORS[targetColorIdx];
      const rx = X[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      const ry = Y[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      if (dShape === 1) vismem.makeCircle('c', rx, ry, RADIUS, false, 2, dHex, dHex);
      else vismem.makeRectangle('s', rx, ry, OBJ_SIZE, OBJ_SIZE, false, dHex, dHex, 0, 0);
      change = 0; lastTargetShape = null; lastTargetColorIdx = null; lastTargetXY = null;
    }

    vismem.drawObjects(ctx, vismem.objects);
  }

  // -------------------------------
  // Response & feedback
  // -------------------------------
  function checkResp(answerChange: 0 | 1) {
    const rt = Date.now() - startTs; allRt.push(rt);
    const ansISO = nowISO(); allClickTime.push(ansISO);
    const isCorrect = (change === answerChange);
    if (isCorrect) { checkAns.push('right'); hitRt.push(rt); }
    else { checkAns.push('wrong'); }

    const row = SCHEDULE[currTrial];
    const block = row.block; const phase = toPhase(block);
    const role: Role = (row.role === 'baseline' ? roleFromPairIdx(props.userId, row.pairIdx) : row.role) as Role;

    const targetShapeName: 'circle' | 'square' = (lastTargetShape === 1 ? 'circle' : 'square');
    const targetColorHex = (row.hasTarget && lastTargetColorIdx !== null) ? COLORS[lastTargetColorIdx] : null;
    const stISO = allStartTime[allStartTime.length - 1];

    TRIAL_LOG.push({
      index: currTrial,
      phase, block, role,
      hasTarget: (change === 1),
      respHasTarget: (answerChange === 1),
      respCorrect: isCorrect,
      rtMs: rt,
      startTime: stISO,
      answerTime: ansISO,
      targetShape: targetShapeName,
      targetColorHex,
      targetXY: lastTargetXY,
      distractors: { sameShape_otherColor: lastDistractorCounts.sameShape_otherColor, otherShape_sameColor: lastDistractorCounts.otherShape_sameColor }
    });

    feedbackThenNext(isCorrect ? 'right' : 'wrong');
  }

  function feedbackThenNext(result: 'right' | 'wrong' | 'late') {
    vismem.erase(ctx); vismem.clear(); makeBackground(); vismem.drawObjects(ctx, vismem.objects);

    setDisabledButton(true);
    const text = result === 'wrong' ? 'ผิด' : 'ถูก';
    const dy = result === 'wrong' ? 36 : 20;

    ctx.font = '120px Sarabun';
    const w = ctx.measureText(text).width;

    timeouts.push(
      setTimeout(() => { const t = vismem.makeText('t', centerX - w / 2, centerY + dy, text, 'Black', ctx.font); vismem.drawText(ctx, t); }, 100),
      setTimeout(() => { vismem.erase(ctx); vismem.clear(); makeBackground(); vismem.drawObjects(ctx, vismem.objects); }, 600),
      setTimeout(() => { currTrial += 1; setDisabledButton(false); nextTrial(); }, 900),
    );
  }

  // -------------------------------
  // Finish & save
  // -------------------------------
  function finish() {
    const overallCorrectRTs = TRIAL_LOG.filter(t => t.respCorrect).map(t => t.rtMs);
    const overallWrongRTs   = TRIAL_LOG.filter(t => !t.respCorrect).map(t => t.rtMs);

    const overall = { correct: overallCorrectRTs.length, incorrect: overallWrongRTs.length, meanRtMs_correct: mean(overallCorrectRTs), meanRtMs_wrong: mean(overallWrongRTs) };

    const byPhaseRole: any[] = [];
    (['baseline','testing'] as Phase[]).forEach(phase => {
      (['ex','new'] as Role[]).forEach(role => {
        const subset = TRIAL_LOG.filter(t => t.phase === phase && t.role === role);
        if (!subset.length) return;
        const corr = subset.filter(t => t.respCorrect).map(t => t.rtMs);
        const wrng = subset.filter(t => !t.respCorrect).map(t => t.rtMs);
        byPhaseRole.push({ phase, role, nTrials: subset.length, correct: corr.length, incorrect: wrng.length, meanRtMs_correct: mean(corr), meanRtMs_wrong: mean(wrng) });
      });
    });

    const byBlockRole: any[] = [];
    for (let b = 0; b <= 15; b++) {
      (['ex','new'] as Role[]).forEach(role => {
        const subset = TRIAL_LOG.filter(t => t.block === b && t.role === role);
        if (!subset.length) return;
        const corr = subset.filter(t => t.respCorrect).map(t => t.rtMs);
        const wrng = subset.filter(t => !t.respCorrect).map(t => t.rtMs);
        byBlockRole.push({ block: b, role, nTrials: subset.length, correct: corr.length, incorrect: wrng.length, meanRtMs_correct: mean(corr), meanRtMs_wrong: mean(wrng) });
      });
    }

    const fx = { ex: fixedTargetFor(props.userId, 'ex'), new: fixedTargetFor(props.userId, 'new') };

    const payload = {
      meta: { version: VERSION, date: nowISO(), userId: props.userId, calibration },
      design: {
        setSize: SET_SIZE + 1,
        blocks: 15,
        baselineTrials: 160,
        testingTrials: 480,
        mode: 'conjunction',
        colorPairs: COLOR_PAIRS.map(([a,b]) => [COLORS[a], COLORS[b]]),
        probSchedule: PROB_SCHEDULE,
      },
      assignment: {
        ex:  { pairIdx: fx.ex.pairIdx,  shape: fx.ex.shape === 1 ? 'circle' : 'square',  colorHex: COLORS[fx.ex.color] },
        new: { pairIdx: fx.new.pairIdx, shape: fx.new.shape === 1 ? 'circle' : 'square', colorHex: COLORS[fx.new.color] },
      },
      trials: TRIAL_LOG,
      summary: { overall, byPhaseRole, byBlockRole }
    };

    saveJSONDataToClientDevice(payload, `Subject${props.userId}_${VERSION}_${nowISO()}.json`);
    navigate('/landing');
  }

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div className="h-screen w-full bg-[#BCBCBC] flex flex-col">
      <div className="absolute top-4 right-6 text-md text-gray-700/70 select-none">
         {currTrial >= TRIAL_COUNT ? 100 : Math.min(99, Math.floor((currTrial / TRIAL_COUNT) * 100))}%
      </div>
      <div className="flex justify-center items-center flex-grow p-5">
        <CJSWindow
          searchTarget={searchTarget}
          searchTargetList={searchTargetList}
          canvasWidth={CANVAS_W}
          canvasHeight={CANVAS_H}
        />
        <CJSButton
          searchTarget={searchTarget}
          disabledButton={disabledButton}
          checkResp={checkResp}
        />
      </div>
    </div>
  );
}

export default FAST_2R_15B_TC;
