// FAST_2R_15B_CC — 2 roles (ex/new), 15 testing blocks, 2 color-pairs (0°↔180°, 90°↔270°)
// - Baseline 160 trials (role ละ 80 = 40 present + 40 absent)
// - Testing 15 blocks = 480 trials (block ละ 32 = role ละ 16)
// - ex p per block:  [90,70,50,30,10,10,30,50,70,90,10,10,10,10,10]
//   new p per block: [10,10,10,10,10,10,30,50,70,90,90,70,50,30,10]
// - Countdown ที่ trial indices: 0, 160, 320, 480  (\n*หมายเหตุ*: 0=เริ่ม, 160=จบ baseline, +5 blocks=+160→320, +5 blocks=+160→480)
// - Conjunction rule: target=(shape+color); distractors = same-shape+other-color & same-color+other-shape
// - Fixed target per user (shape+color per role) + counter-balance 24 แบบ (ดูคอมเมนต์ด้านล่าง)

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
import { makeColorSet } from '../../scripts/contrastTuner';

// ==== Types (Lean schema) ====
type Phase = 'baseline' | 'testing';
type Role = 'ex' | 'new';

// รูปทรง: 0=square, 1=circle
type ShapeId = 0 | 1;

// index สี 0..3 ตาม COLORS
type ColorIdx = 0 | 1 | 2 | 3;

// คู่สี 0..1 ตาม COLOR_PAIRS
type PairIdx = 0 | 1;

type TrialRow = {
  setSize: number;               // จำนวน distractors (เราจะวาด setSize + 1 ตำแหน่ง)
  hasTarget: 0 | 1;
  role: 'baseline' | Role;       // baseline จะไม่ใช่ role ตรงๆ
  pairIdx: PairIdx;
  block: number;                 // 0=baseline, 1..15=testing
};

type TrialLog = {
  index: number;
  phase: Phase;                 // "baseline" | "testing"
  block: number;                // 0=baseline, 1..15=testing
  role: Role;                   // "ex" | "new"
  hasTarget: boolean;
  respHasTarget: boolean;
  respCorrect: boolean;
  rtMs: number;                 // เก็บทุก trial (ถูก/ผิด)
  startTime: string;            // ISO
  answerTime: string;           // ISO
  targetShape: 'square' | 'circle';
  targetColorHex: string | null;
  targetXY: { x: number, y: number } | null;
  distractors: { sameShape_otherColor: number; otherShape_sameColor: number };
};

// ==== Log container ====
let TRIAL_LOG: TrialLog[] = [];
const calibration = getCalibration();

// ===============================
// Visual & Task Constants
// ===============================
const VERSION = 'FAST_2R_15B_CC';

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

// จำนวน distractors ต่อ trial (เราจะสุ่มตำแหน่ง setSize + 1 เพื่อกันที่ให้ target)
const SET_SIZE = 31;

// 4 hues: 0°, 90°, 180°, 270° (muted)
//  - 0°   ~ muted red
//  - 90°  ~ yellow-green
//  - 180° ~ teal/cyan
//  - 270° ~ purple
const COLORS: string[] = [
  '#B72E2E', // 0° red (muted)
  '#446D1B', // 90° yellow-green/olive-ish
  '#1B6D6D', // 180° teal/cyan
  '#8439CE', // 270° purple
];

// Two complementary/opposed pairs per spec:
//  - Pair 0: 0° ↔ 180°  (indices 0,2)
//  - Pair 1: 90° ↔ 270° (indices 1,3)
const COLOR_PAIRS: [ColorIdx, ColorIdx][] = [
  [0, 2], // 0° ↔ 180°
  [1, 3], // 90° ↔ 270°
];

const PAIR_LABEL: Record<number, string> = {
  0: '0°↔180°',
  1: '90°↔270°',
};

// ==== Prob schedule arrays (length 15) ====
const EX_PROB = [0.9,0.7,0.5,0.3,0.1, 0.1,0.3,0.5,0.7,0.9, 0.1,0.1,0.1,0.1,0.1];
const NEW_PROB = [0.1,0.1,0.1,0.1,0.1, 0.1,0.3,0.5,0.7,0.9, 0.9,0.7,0.5,0.3,0.1];

// ==== Prob schedule (เพื่อใส่ใน payload.design.probSchedule) ====
const PROB_SCHEDULE: Record<number, { ex: number; new: number }> = (() => {
  const out: Record<number, any> = {};
  for (let b = 1; b <= 15; b++) out[b] = { ex: EX_PROB[b-1], new: NEW_PROB[b-1] };
  return out;
})();

// ---- Derived trial-count landmarks for countdown ----
const BASELINE_PER_ROLE = 80;
const ROLES: Role[] = ['ex','new'];
const ROLES_COUNT = ROLES.length; // 2
const BASELINE_TOTAL = BASELINE_PER_ROLE * ROLES_COUNT; // 160
const TEST_TRIALS_PER_ROLE_PER_BLOCK = 16;
const TEST_TRIALS_PER_BLOCK = TEST_TRIALS_PER_ROLE_PER_BLOCK * ROLES_COUNT; // 32
// Landmarks: start, end-of-baseline, end-of-5-blocks, end-of-10-blocks
const COUNTDOWN_AT = [0, BASELINE_TOTAL, BASELINE_TOTAL + 5*TEST_TRIALS_PER_BLOCK, BASELINE_TOTAL + 10*TEST_TRIALS_PER_BLOCK];

// ==== Helpers ====
const mean = (arr: number[]) =>
  arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

function toPhase(block: number): Phase { return block === 0 ? 'baseline' : 'testing'; }

interface SearchTarget { shape: ShapeId; col: ColorIdx; }

// ===============================
// Globals (render-agnostic)
// ===============================
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

let change = NaN;                 // 1/0 actual present/absent on current trial
let allStartTime: string[] = [];
let allClickTime: string[] = [];
let allSetSizes: number[] = [];
let allModes: string[] = [];
let checkAns: ('right' | 'wrong' | 'late')[] = [];

let timeouts: any[] = [];

// --- เก็บสถานะล่าสุดของสิ่งเร้าที่จำเป็นต้องใช้ตอนบันทึกผล ---
let lastTargetShape: ShapeId | null = null;
let lastTargetColorIdx: ColorIdx | null = null;
let lastTargetXY: { x: number; y: number } | null = null;
let lastDistractorCounts = { sameShape_otherColor: 0, otherShape_sameColor: 0 };

let COLOR_METRICS: any = null; // สำหรับดีบักดูค่าความต่างสี/ความสว่าง

// ===============================
// Utilities
// ===============================
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
// Fixed target per user (counter-balance across 24)
// ===============================
// รูปทรงตามตำแหน่งในบล็อก 4 คน (group*4 + k)
const SHAPE_SEQ_EX:  ShapeId[] = [1, 1, 0, 0]; // circle,circle,square,square (ตามตัวอย่าง: 001 เริ่มที่วงกลมเป็น ex)
const SHAPE_SEQ_NEW: ShapeId[] = [0, 0, 1, 1]; // square,square,circle,circle (new สลับกับ ex)

// การแม็พตามที่ผู้ใช้ต้องการ:
//  - ใช้ subject id (1-based) กำหนดทั้ง shape และ pair
//  - ex: pair สลับทุก subject (1→pair0, 2→pair1, 3→pair0, 4→pair1, ...)
//       shape วงกลม,วงกลม,สี่เหลี่ยม,สี่เหลี่ยม วนซ้ำ (k=0..3)
//  - new: ใช้คู่สีตรงข้ามกับ ex และ shape ตรงข้ามกับ ex ใน k เดียวกัน
//  - ภายใน pair เลือกสีฝั่ง A/B ตาม k parity (k คู่→A, k คี่→B)
//  - วนไปจะกระจายครบทุก combination อย่างสมดุลภายใน 24 คน
function fixedTargetFor(userId: number, role: Role) {
  const zero = Math.max(0, Math.floor(userId - 1)); // 0-based
  const k = zero % 4;                               // 0..3 (ตำแหน่งในรอบ 4 คน)

  // คู่สีของ ex สลับทุก subject: id คี่→pair 0 (0°↔180°), id คู่→pair 1 (90°↔270°)
  const exPairIdx: PairIdx = (zero % 2 === 0) ? 0 : 1;
  const newPairIdx: PairIdx = (exPairIdx === 0 ? 1 : 0);
  const pairIdx: PairIdx = (role === 'ex' ? exPairIdx : newPairIdx);

  // shape ตามลำดับที่กำหนด: ex=[1,1,0,0], new=[0,0,1,1]
  const shape: ShapeId = (role === 'ex') ? SHAPE_SEQ_EX[k] : SHAPE_SEQ_NEW[k];

  // สีภายในคู่: k parity เป็นตัวเลือกฝั่งสี A/B
  const [A, B] = COLOR_PAIRS[pairIdx];
  const color: ColorIdx = (k % 2 === 0 ? A : B);

  return { pairIdx, shape, color };
}

function roleFromPairIdx(userId: number, pairIdx: PairIdx): Role {
  // baseline: pairIdx จะบอก role ของ user นี้ (ex ใช้ pairIdx ที่กำหนดในกลุ่ม, new อีกคู่)
  const exPair = fixedTargetFor(userId, 'ex').pairIdx;
  return (pairIdx === exPair) ? 'ex' : 'new';
}

function logCounterbalanceDebug(schedule: TrialRow[], userId: number) {
  console.group(`[FAST_2R_15B_CC DEBUG] Counter-balance | userId=${userId}`);
  console.log('userId =', userId);

  // --- Fixed targets per role ---
  const fixedRows = (ROLES as Role[]).map((r) => {
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

  // --- Baseline summary (block 0) ---
  const baseline = schedule.filter(r => r.block === 0);
  const baseSummary = (ROLES as Role[]).map((r) => {
    const pIdx = fixedTargetFor(userId, r).pairIdx;
    const present = baseline.filter(x => x.pairIdx === pIdx && x.hasTarget === 1).length;
    const absent  = baseline.filter(x => x.pairIdx === pIdx && x.hasTarget === 0).length;
    return { phase: 'baseline', role: r, pairIdx: pIdx, pair: PAIR_LABEL[pIdx], present, absent, total: present + absent };
  });
  console.table(baseSummary);

  // --- Testing summary per block (1..15) ---
  for (let b = 1; b <= 15; b++) {
    const rows = schedule.filter(r => r.block === b);
    const perBlock = (ROLES as Role[]).map((r) => {
      const pIdx = fixedTargetFor(userId, r).pairIdx;
      const present = rows.filter(x => x.role === r && x.pairIdx === pIdx && x.hasTarget === 1).length;
      const absent  = rows.filter(x => x.role === r && x.pairIdx === pIdx && x.hasTarget === 0).length;
      const p = present + absent ? Number((present / (present + absent)).toFixed(2)) : 0;
      return { block: b, role: r, pairIdx: pIdx, pair: PAIR_LABEL[pIdx], present, absent, p };
    });
    console.table(perBlock);
  }

  // --- Preview 24 แรก (ช่วยดูลำดับตอนปิด Shuffle) ---
  console.table(schedule.slice(0, 24).map((r, i) => {
    const roleResolved = r.role === 'baseline' ? roleFromPairIdx(userId, r.pairIdx) : r.role;
    return {
      idx: i,
      block: r.block,
      role: roleResolved,
      pairIdx: r.pairIdx,
      pair: PAIR_LABEL[r.pairIdx],
      setSize: r.setSize + 1,
      hasTarget: r.hasTarget,
    };
  }));

  (window as any).__FAST_2R_15B_CC_DEBUG__ = { userId, schedule };
  console.groupEnd();
}

// ===============================
// Schedule Builder (Baseline + 15 Testing Blocks)
// ===============================
function buildSchedule(userId: number): TrialRow[] {
  // ---- Baseline 160 ----
  // role ละ 80 = 40 present + 40 absent
  const baseline: TrialRow[] = [];
  (ROLES as Role[]).forEach(role => {
    const { pairIdx } = fixedTargetFor(userId, role);
    for (let i = 0; i < 40; i++) baseline.push({ setSize: SET_SIZE, hasTarget: 1, role: 'baseline', pairIdx, block: 0 });
    for (let i = 0; i < 40; i++) baseline.push({ setSize: SET_SIZE, hasTarget: 0, role: 'baseline', pairIdx, block: 0 });
  });
  Shuffle(baseline);

  // ---- Testing 15 blocks = 480 ----
  // บล็อกละ 32 = role ละ 16 (present : absent ตาม p)
  const testing: TrialRow[] = [];
  for (let bi = 1; bi <= 15; bi++) {
    let blockRows: TrialRow[] = [];
    for (const role of ROLES) {
      const { pairIdx } = fixedTargetFor(userId, role);
      const trialsPerRole = TEST_TRIALS_PER_ROLE_PER_BLOCK; // 16
      const p = (role === 'ex') ? EX_PROB[bi-1] : NEW_PROB[bi-1];
      const presentN = Math.round(trialsPerRole * p);
      const absentN  = trialsPerRole - presentN;
      for (let i = 0; i < presentN; i++) blockRows.push({ setSize: SET_SIZE, hasTarget: 1, role, pairIdx, block: bi });
      for (let i = 0; i < absentN;  i++) blockRows.push({ setSize: SET_SIZE, hasTarget: 0, role, pairIdx, block: bi });
    }
    Shuffle(blockRows); // "pure random" ในบล็อก
    testing.push(...blockRows);
  }

  return [...baseline, ...testing]; // รวม 640 trials
}

// ===============================
// React Component
// ===============================
function FAST_2R_15B_CC(props: { userId: number }) {
  const navigate = useNavigate();
  const [clickSound] = useSound(clickSoundSrc);
  const [combo2Sound] = useSound(combo2SoundSrc);
  const [losingSound] = useSound(losingSoundSrc);

  const [searchTarget, setSearchTarget] = useState<SearchTarget>();
  const [disabledButton, setDisabledButton] = useState(false);

  // สำหรับแสดง legend/ตัวอย่างบน UI
  const searchTargetList = useMemo(() => ([
    [
      { description: 'สี่เหลี่ยมสีแดง', color: COLORS[0], shape: 'square' },
      { description: 'สี่เหลี่ยมสีเขียว', color: COLORS[1], shape: 'square' },
      { description: 'สี่เหลี่ยมสีฟ้า', color: COLORS[2], shape: 'square' },
      { description: 'สี่เหลี่ยมสีม่วง', color: COLORS[3], shape: 'square' },
    ],
    [
      { description: 'วงกลมสีแดง', color: COLORS[0], shape: 'circle' },
      { description: 'วงกลมสีเขียว', color: COLORS[1], shape: 'circle' },
      { description: 'วงกลมสีฟ้า', color: COLORS[2], shape: 'circle' },
      { description: 'วงกลมสีม่วง', color: COLORS[3], shape: 'circle' },
    ],
  ]), []);

  useEffect(() => {
    document.body.style.cursor = "none"
    tryEnterFullscreen();
    initState();
    createCanvas();
    COLOR_METRICS = computeColorMetrics(COLORS, BG_COLOR, COLOR_PAIRS);
    console.log('Color Metrics:', COLOR_METRICS);
    SCHEDULE = buildSchedule(props.userId);
    TRIAL_COUNT = SCHEDULE.length; // 640

    // ✅ Log สรุป counter-balance สำหรับ user นี้
    logCounterbalanceDebug(SCHEDULE, props.userId);

    // ให้ nextTrial() จัดการ countdown เอง ตาม COUNTDOWN_AT
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
      ctx.font = font;
      const w = ctx.measureText(t).width;
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

    console.log(`[FAST_2R_15B_CC trial ${idx}] block=${row.block} role=${roleResolved} pair=${row.pairIdx}:${PAIR_LABEL[row.pairIdx]} setSize=${row.setSize+1} hasTarget=${row.hasTarget}`);

    // map บทบาท → fixed target (shape,color,pair) สำหรับ user นี้
    let targetShape: ShapeId;
    let targetColorIdx: ColorIdx;
    let pairIdx: PairIdx;

    if (row.role === 'baseline') {
      const roles: Role[] = ROLES;
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
    startTs = Date.now();
    allStartTime.push(nowISO());
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

    // เตรียมตำแหน่งบนกริดแบบสุ่ม
    const posIds: number[] = [];
    let pid = 0;
    for (let gx = 0; gx < GRID_COLS; gx++) {
      for (let gy = 0; gy < GRID_ROWS; gy++) { posIds.push(pid++); }
    }
    Shuffle(posIds);

    const X: number[] = []; const Y: number[] = [];
    for (let i = 0; i < setSize + 1; i++) {
      const iPid = posIds[i];
      const cx = gridXs[iPid % GRID_COLS];
      const cy = gridYs[Math.floor(iPid / GRID_COLS)];
      X.push(cx); Y.push(cy);
    }

    // distractor 2 ชนิด
    const otherColorIdx = otherColorInPair(pairIdx, targetColorIdx);
    const otherShape: ShapeId = targetShape === 1 ? 0 : 1;

    const nA = Math.floor(setSize / 2); // same-shape + other-color
    const nB = setSize - nA;            // same-color + other-shape
    lastDistractorCounts = { sameShape_otherColor: nA, otherShape_sameColor: nB };

    const dShapes: ShapeId[] = [...Array(nA).fill(targetShape), ...Array(nB).fill(otherShape)];
    const dHexes: string[]  = [...Array(nA).fill(COLORS[otherColorIdx]), ...Array(nB).fill(COLORS[targetColorIdx])];

    const order = Array.from({ length: setSize }, (_, i) => i);
    Shuffle(order);

    // วาด distractors
    for (let ii = 0; ii < setSize; ii++) {
      const i = order[ii];
      const rx = X[ii] + (Math.random() - 0.5) * 2 * JITTER;
      const ry = Y[ii] + (Math.random() - 0.5) * 2 * JITTER;
      const colHex = dHexes[i];
      if (dShapes[i] === 1) { vismem.makeCircle('c', rx, ry, RADIUS, false, 2, colHex, colHex); }
      else { vismem.makeRectangle('s', rx, ry, OBJ_SIZE, OBJ_SIZE, false, colHex, colHex, 0, 0); }
    }

    // target present/absent
    allSetSizes.push(setSize + 1);

    if (hasTarget === 1) {
      const tx = X[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      const ty = Y[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      const tHex = COLORS[targetColorIdx];
      if (targetShape === 1) { vismem.makeCircle('c', tx, ty, RADIUS, false, 2, tHex, tHex); }
      else { vismem.makeRectangle('s', tx, ty, OBJ_SIZE, OBJ_SIZE, false, tHex, tHex, 0, 0); }
      change = 1; lastTargetShape = targetShape; lastTargetColorIdx = targetColorIdx; lastTargetXY = { x: X[setSize], y: Y[setSize] };
    } else {
      const useA = setSize % 2 === 0;
      const dShape = useA ? targetShape : otherShape;
      const dHex   = useA ? COLORS[otherColorIdx] : COLORS[targetColorIdx];
      const rx = X[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      const ry = Y[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      if (dShape === 1) { vismem.makeCircle('c', rx, ry, RADIUS, false, 2, dHex, dHex); }
      else { vismem.makeRectangle('s', rx, ry, OBJ_SIZE, OBJ_SIZE, false, dHex, dHex, 0, 0); }
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
    if (isCorrect) { checkAns.push('right'); hitRt.push(rt); /* combo2Sound(); */ }
    else { checkAns.push('wrong'); /* losingSound(); */ }

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

    // byPhaseRole
    const byPhaseRole: any[] = [];
    (['baseline','testing'] as Phase[]).forEach(phase => {
      (ROLES as Role[]).forEach(role => {
        const subset = TRIAL_LOG.filter(t => t.phase === phase && t.role === role);
        if (!subset.length) return;
        const corr = subset.filter(t => t.respCorrect).map(t => t.rtMs);
        const wrng = subset.filter(t => !t.respCorrect).map(t => t.rtMs);
        byPhaseRole.push({ phase, role, nTrials: subset.length, correct: corr.length, incorrect: wrng.length, meanRtMs_correct: mean(corr), meanRtMs_wrong: mean(wrng) });
      });
    });

    // byBlockRole (block 0 = baseline)
    const byBlockRole: any[] = [];
    for (let b = 0; b <= 15; b++) {
      (ROLES as Role[]).forEach(role => {
        const subset = TRIAL_LOG.filter(t => t.block === b && t.role === role);
        if (!subset.length) return;
        const corr = subset.filter(t => t.respCorrect).map(t => t.rtMs);
        const wrng = subset.filter(t => !t.respCorrect).map(t => t.rtMs);
        byBlockRole.push({ block: b, role, nTrials: subset.length, correct: corr.length, incorrect: wrng.length, meanRtMs_correct: mean(corr), meanRtMs_wrong: mean(wrng) });
      });
    }

    const fx = { ex: fixedTargetFor(props.userId, 'ex'), new: fixedTargetFor(props.userId, 'new') };

    const payload = {
      meta: { version: VERSION, date: nowISO(), userId: props.userId, calibration, },
      design: {
        setSize: SET_SIZE + 1,
        blocks: 15,
        baselineTrials: BASELINE_TOTAL,
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

export default FAST_2R_15B_CC;
