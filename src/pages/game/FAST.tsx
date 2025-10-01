// FAST.tsx — refactored for readability + fixed-target per user + baseline/testing schedule
// - Baseline 240 trials (type ละ 80 = 40 present + 40 absent)
// - Testing 10 blocks = 480 trials (block ละ 48 = role ละ 16)
// - Ex: 0.9→0.1 (B1..B5), 0.1→0.9 (B6..B10)
//   New: 0.1→0.9 (B1..B5), 0.9→0.1 (B6..B10)
//   Neutral: 0.5 ทุกบล็อก
// - Countdown ที่ trial #1, #241, #481
// - Conjunction rule: target=(shape+color); distractors = same-shape+other-color & same-color+other-shape
// - Fixed target per user (shape+color per role) + counter-balance ครบใน 24 คน

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CJSWindow from '../../components/gameWindow/cjsWindow/CJSWindow';
import CJSButton from '../../components/gameWindow/cjsWindow/cjsButton/CJSButton';
import useSound from 'use-sound';
import clickSoundSrc from '../../assets/sound/click.mp3';
import combo2SoundSrc from '../../assets/sound/combo2.mp3';
import losingSoundSrc from '../../assets/sound/losingStreak.mp3';
import moment from 'moment';
import { Shuffle } from '../../scripts/shuffle';
import * as vismem from '../../scripts/vismemCC_simon';
import { saveJSONDataToClientDevice } from '../../uitls/offline';

// ===============================
// Types
// ===============================
type ShapeId = 0 | 1;      // 0 = square, 1 = circle
type ColorIdx = 0 | 1 | 2 | 3 | 4 | 5;
type PairIdx  = 0 | 1 | 2;
type Role = 'ex' | 'new' | 'neutral';

type TrialRow = {
  setSize: number;          // distractors count (target จะถูกเติมทีหลังเมื่อ present)
  hasTarget: 0 | 1;         // 1=present, 0=absent
  role: Role | 'baseline';  // baseline | ex | new | neutral
  pairIdx: PairIdx;         // คู่สีที่ใช้ (baseline ก็เก็บ pair ของบทบาทไว้)
  block: number;            // 0 = baseline, 1..10 = testing blocks
};

interface SearchTarget {
  shape: ShapeId;
  col: ColorIdx;
}

// ===============================
// Visual & Task Constants
// ===============================
const VERSION = 'FAST';

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

// 6 hues (60° apart), muted
const COLORS: string[] = [
  '#C15B5B', // 0 red (muted)
  '#7E7E30', // 1 olive
  '#358B35', // 2 green (soft)
  '#338686', // 3 teal/cyan
  '#7171C9', // 4 indigo/slate-blue
  '#BC4DBC', // 5 magenta/orchid
];

// Complementary pairs (180° apart)
const COLOR_PAIRS: [ColorIdx, ColorIdx][] = [
  [0, 3], // red ↔ teal
  [1, 4], // olive ↔ indigo
  [2, 5], // green ↔ magenta
];

const PAIR_LABEL: Record<number, string> = {
  0: 'red↔teal',
  1: 'olive↔indigo',
  2: 'green↔magenta',
};

// Probabilities (testing)
const PROB_HILO  = [0.9, 0.7, 0.5, 0.3, 0.1];       // High → Low
const PROB_LOHI  = [...PROB_HILO].reverse();        // Low → High
const PROB_CONST = [0.5, 0.5, 0.5, 0.5, 0.5];       // Constant

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
let correctCount = 0;
let incorrectCount = 0;

let change = NaN;                 // 1/0 actual present/absent on current trial
let allStartTime: string[] = [];
let allClickTime: string[] = [];
let allSetSizes: number[] = [];
let allModes: string[] = [];
let checkAns: ('right' | 'wrong' | 'late')[] = [];
let targetDataResult: any = null;

let timeouts: any[] = [];

// ===============================
// Utilities
// ===============================
function nowISO() {
  return moment().format('YYYY-MM-DDTkk:mm:ss.SSSSSS');
}

function clearAllTimeouts() {
  timeouts.forEach(clearTimeout);
  timeouts = [];
}

function makeGrid() {
  gridXs = [];
  gridYs = [];
  for (let cx = 0; cx < GRID_COLS; cx++) {
    gridXs.push(Math.round(TILE_W / 2) + TILE_W * cx - CANVAS_W / 2 + centerX);
  }
  for (let cy = 0; cy < GRID_ROWS; cy++) {
    gridYs.push(Math.round(TILE_H / 2) + TILE_H * cy - CANVAS_H / 2 + centerY);
  }
}

function otherColorInPair(pairIdx: PairIdx, color: ColorIdx): ColorIdx {
  const [a, b] = COLOR_PAIRS[pairIdx];
  return (color === a ? b : a) as ColorIdx;
}

// ===============================
// Fixed target per user (counter-balance across 24)
// ===============================
// รูปทรงตามตำแหน่งในบล็อก 4 คน (group*4 + k)
const SHAPE_SEQ_EX:  ShapeId[] = [0, 0, 1, 1]; // square,square,circle,circle
const SHAPE_SEQ_NEW: ShapeId[] = [1, 1, 0, 0]; // circle,circle,square,square
const SHAPE_SEQ_NEU_A: ShapeId[] = [0, 0, 1, 1]; // สำหรับ group 0..2
const SHAPE_SEQ_NEU_B: ShapeId[] = [1, 1, 0, 0]; // สำหรับ group 3..5

function fixedTargetFor(userId: number, role: Role) {
  const zero = Math.max(0, Math.floor(userId - 1)); // 0-based
  const group = Math.floor(zero / 4) % 6;           // 0..5 (24 คน = 6 กลุ่ม × 4 คน)
  const k = zero % 4;                               // 0..3 (ตำแหน่งในกลุ่ม)

  const basePairIdx = (group % 3) as PairIdx;
  const pairIdx: PairIdx =
    role === 'ex'      ? basePairIdx
  : role === 'new'     ? ((basePairIdx + 1) % 3) as PairIdx
                       : ((basePairIdx + 2) % 3) as PairIdx;

  const [A, B] = COLOR_PAIRS[pairIdx];
  const color: ColorIdx = (k % 2 === 0 ? A : B);

  let shape: ShapeId;
  if (role === 'ex') shape = SHAPE_SEQ_EX[k];
  else if (role === 'new') shape = SHAPE_SEQ_NEW[k];
  else shape = (group < 3 ? SHAPE_SEQ_NEU_A[k] : SHAPE_SEQ_NEU_B[k]);

  return { pairIdx, shape, color };
}

function roleFromPairIdx(userId: number, pairIdx: PairIdx): Role {
  const roles: Role[] = ['ex', 'new', 'neutral'];
  for (const r of roles) {
    if (fixedTargetFor(userId, r).pairIdx === pairIdx) return r;
  }
  return 'ex';
}

function logCounterbalanceDebug(schedule: TrialRow[], userId: number) {
  console.group(`[FAST DEBUG] Counter-balance | userId=${userId}`);
  console.log('userId =', userId);

  // --- Fixed targets per role ---
  const fixedRows = (['ex','new','neutral'] as Role[]).map((r) => {
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
  const baseSummary = (['ex','new','neutral'] as Role[]).map((r) => {
    const pIdx = fixedTargetFor(userId, r).pairIdx;
    const present = baseline.filter(x => x.pairIdx === pIdx && x.hasTarget === 1).length;
    const absent  = baseline.filter(x => x.pairIdx === pIdx && x.hasTarget === 0).length;
    return { phase: 'baseline', role: r, pairIdx: pIdx, pair: PAIR_LABEL[pIdx], present, absent, total: present + absent };
  });
  console.table(baseSummary);

  // --- Testing summary per block (1..10) ---
  for (let b = 1; b <= 10; b++) {
    const rows = schedule.filter(r => r.block === b);
    const perBlock = (['ex','new','neutral'] as Role[]).map((r) => {
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

  // เผื่ออยากสำรวจบนคอนโซล
  (window as any).__FAST_DEBUG__ = { userId, schedule };
  console.groupEnd();
}

// ===============================
// Schedule Builder (Baseline + 10 Testing Blocks)
// ===============================
function buildSchedule(userId: number): TrialRow[] {
  const SET_SIZE = 31;

  // ---- Baseline 240 ----
  // role ละ 80 = 40 present + 40 absent
  const baseline: TrialRow[] = [];
  (['ex', 'new', 'neutral'] as Role[]).forEach(role => {
    const { pairIdx } = fixedTargetFor(userId, role);
    for (let i = 0; i < 40; i++) baseline.push({ setSize: SET_SIZE, hasTarget: 1, role: 'baseline', pairIdx, block: 0 });
    for (let i = 0; i < 40; i++) baseline.push({ setSize: SET_SIZE, hasTarget: 0, role: 'baseline', pairIdx, block: 0 });
  });
  Shuffle(baseline); // ข้อ 4: random ใน baseline ทั้งก้อน

  // ---- Testing 10 blocks = 480 ----
  // บล็อกละ 48 = role ละ 16 (present : absent ตาม p)
  const testing: TrialRow[] = [];
  const probsFirst  = PROB_HILO;            // [0.9,0.7,0.5,0.3,0.1]
  const probsSecond = PROB_LOHI;            // [0.1..0.9]

  for (let bi = 1; bi <= 10; bi++) {
    const pEx  = bi <= 5 ? probsFirst [bi-1] : probsSecond[bi-6];
    const pNew = bi <= 5 ? probsSecond[bi-1] : probsFirst [bi-6];
    const pNeu = 0.5;

    const roles: Role[] = ['ex', 'new', 'neutral'];
    let blockRows: TrialRow[] = [];

    for (const role of roles) {
      const { pairIdx } = fixedTargetFor(userId, role);
      const trialsPerType = 16; // ต่อ role ต่อ block
      const p = role === 'ex' ? pEx : role === 'new' ? pNew : pNeu;

      const presentN = Math.round(trialsPerType * p);
      const absentN  = trialsPerType - presentN;

      for (let i = 0; i < presentN; i++) blockRows.push({ setSize: SET_SIZE, hasTarget: 1, role, pairIdx, block: bi });
      for (let i = 0; i < absentN;  i++) blockRows.push({ setSize: SET_SIZE, hasTarget: 0, role, pairIdx, block: bi });
    }

    Shuffle(blockRows); // ข้อ 4: “pure random” ในบล็อก
    testing.push(...blockRows);
  }

  return [...baseline, ...testing]; // รวม 720 trials
}

// ===============================
// React Component
// ===============================
function FAST(props: { userId: number }) {
  const navigate = useNavigate();
  // เสียง (ถ้าอยากเปิด คอมเมนต์กลับ)
  const [clickSound] = useSound(clickSoundSrc);
  const [combo2Sound] = useSound(combo2SoundSrc);
  const [losingSound] = useSound(losingSoundSrc);

  const [searchTarget, setSearchTarget] = useState<SearchTarget>();
  const [disabledButton, setDisabledButton] = useState(false);

  // สำหรับแสดง legend/ตัวอย่างบน UI
  const searchTargetList = useMemo(() => ([
    [
      { description: 'สี่เหลี่ยมสีแดง', color: COLORS[0], shape: 'square' },
      { description: 'สี่เหลี่ยมสีเขียวมะกอก', color: COLORS[1], shape: 'square' },
      { description: 'สี่เหลี่ยมสีเขียว', color: COLORS[2], shape: 'square' },
      { description: 'สี่เหลี่ยมสีฟ้า', color: COLORS[3], shape: 'square' },
      { description: 'สี่เหลี่ยมสีน้ำเงินอมม่วง', color: COLORS[4], shape: 'square' },
      { description: 'สี่เหลี่ยมสีม่วงชมพู', color: COLORS[5], shape: 'square' },
    ],
    [
      { description: 'วงกลมสีแดง', color: COLORS[0], shape: 'circle' },
      { description: 'วงกลมสีเขียวมะกอก', color: COLORS[1], shape: 'circle' },
      { description: 'วงกลมสีเขียว', color: COLORS[2], shape: 'circle' },
      { description: 'วงกลมสีฟ้า', color: COLORS[3], shape: 'circle' },
      { description: 'วงกลมสีน้ำเงินอมม่วง', color: COLORS[4], shape: 'circle' },
      { description: 'วงกลมสีม่วงชมพู', color: COLORS[5], shape: 'circle' },
    ],
  ]), []);

  // -------------------------------
  // Mount
  // -------------------------------
  useEffect(() => {
    initState();
    createCanvas();

    SCHEDULE = buildSchedule(props.userId);
    TRIAL_COUNT = SCHEDULE.length; // 720

    // ✅ Log สรุป counter-balance สำหรับ user นี้
    logCounterbalanceDebug(SCHEDULE, props.userId);

    // ให้ nextTrial() จัดการ countdown เอง (trial 0, 240, 480)
    nextTrial();

    return () => clearAllTimeouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------
  // State init & canvas
  // -------------------------------
  function initState() {
    currTrial = 0;
    startTs = 0;

    hitRt = [];
    allRt = [];
    correctCount = 0;
    incorrectCount = 0;

    change = NaN;
    allStartTime = [];
    allClickTime = [];
    allSetSizes = [];
    allModes = [];
    checkAns = [];
    targetDataResult = null;
  }

  function createCanvas() {
    canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
    ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    makeGrid();
  }

  // -------------------------------
  // Countdown (ใช้ที่ trial #1, #241, #481)
  // -------------------------------
  function showCountdownThen(cb: () => void) {
    setDisabledButton(true);
    vismem.erase(ctx);
    vismem.clear();
    makeBackground();
    vismem.drawObjects(ctx, vismem.objects);

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

    // countdown จุดเปลี่ยนตามสเปค
    if (currTrial === 0 || currTrial === 240 || currTrial === 480) {
      showCountdownThen(() => runTrialAtIndex(currTrial));
    } else {
      runTrialAtIndex(currTrial);
    }
  }

  function runTrialAtIndex(idx: number) {
    // ✅ ปลดล็อกอินพุต (หลัง countdown)
    setDisabledButton(false);
    const row = SCHEDULE[idx];
    const { setSize, hasTarget } = row;
    const roleResolved = row.role === 'baseline' ? roleFromPairIdx(props.userId, row.pairIdx) : row.role;

    console.log(
    `[FAST trial ${idx}] block=${row.block} role=${roleResolved} pair=${row.pairIdx}:${PAIR_LABEL[row.pairIdx]} setSize=${row.setSize+1} hasTarget=${row.hasTarget}`
    );

    // map บทบาท → fixed target (shape,color,pair) สำหรับ user นี้
    let targetShape: ShapeId;
    let targetColorIdx: ColorIdx;
    let pairIdx: PairIdx;

    if (row.role === 'baseline') {
      // baseline บันทึก pairIdx มาจากบทบาทต้นทางไว้แล้ว
      // หา role ที่ pairIdx นี้แมตช์สำหรับ user นี้ แล้วใช้ fixedTargetFor(role)
      const roles: Role[] = ['ex', 'new', 'neutral'];
      const pick = roles.map(r => ({ r, ft: fixedTargetFor(props.userId, r) }))
                        .find(x => x.ft.pairIdx === row.pairIdx);
      const ft = pick ? pick.ft : fixedTargetFor(props.userId, 'ex');
      targetShape = ft.shape; targetColorIdx = ft.color; pairIdx = ft.pairIdx;
    } else {
      const ft = fixedTargetFor(props.userId, row.role);
      targetShape = ft.shape; targetColorIdx = ft.color; pairIdx = ft.pairIdx;
    }

    // label mode + อัปเดต prompt บน UI
    allModes.push('conjunction search');
    setSearchTarget({ shape: targetShape, col: targetColorIdx });

    // วาดสิ่งเร้าตาม conjunction rule
    createTrialStimulus(setSize, hasTarget, pairIdx, targetShape, targetColorIdx);

    // mark start time
    startTs = Date.now();
    allStartTime.push(nowISO());
  }

  // -------------------------------
  // Stimulus drawing (conjunction)
  // -------------------------------
  function makeBackground() {
    vismem.makeRectangle('bg', centerX, centerY, CANVAS_W, CANVAS_H, false, BG_COLOR, BG_COLOR);
  }

  function createTrialStimulus(
    setSize: number,
    hasTarget: 0 | 1,
    pairIdx: PairIdx,
    targetShape: ShapeId,
    targetColorIdx: ColorIdx
  ) {
    vismem.erase(ctx);
    vismem.clear();
    makeBackground();

    // เตรียมตำแหน่งบนกริดแบบสุ่ม
    const posIds: number[] = [];
    let pid = 0;
    for (let gx = 0; gx < GRID_COLS; gx++) {
      for (let gy = 0; gy < GRID_ROWS; gy++) {
        posIds.push(pid++);
      }
    }
    Shuffle(posIds);

    const X: number[] = [];
    const Y: number[] = [];
    for (let i = 0; i < setSize + 1; i++) {
      const iPid = posIds[i];
      const cx = gridXs[iPid % GRID_COLS];
      const cy = gridYs[Math.floor(iPid / GRID_COLS)];
      X.push(cx);
      Y.push(cy);
    }

    // distractor 2 ชนิด
    const otherColorIdx = otherColorInPair(pairIdx, targetColorIdx);
    const otherShape: ShapeId = targetShape === 1 ? 0 : 1;

    const nA = Math.floor(setSize / 2); // same-shape + other-color
    const nB = setSize - nA;            // same-color + other-shape

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
      if (dShapes[i] === 1) {
        vismem.makeCircle('c', rx, ry, RADIUS, false, 2, colHex, colHex);
      } else {
        vismem.makeRectangle('s', rx, ry, OBJ_SIZE, OBJ_SIZE, false, colHex, colHex, 0, 0);
      }
    }

    // target present/absent
    allSetSizes.push(setSize + 1);

    if (hasTarget === 1) {
      const tx = X[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      const ty = Y[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      const tHex = COLORS[targetColorIdx];
      if (targetShape === 1) {
        vismem.makeCircle('c', tx, ty, RADIUS, false, 2, tHex, tHex);
      } else {
        vismem.makeRectangle('s', tx, ty, OBJ_SIZE, OBJ_SIZE, false, tHex, tHex, 0, 0);
      }
      change = 1;
      targetDataResult = {
        shape: targetShape === 1 ? 'circle' : 'square',
        shapeParams: { parameterName: targetShape ? 'radius' : 'width', value: targetShape ? RADIUS : OBJ_SIZE, unit: 'px' },
        color: tHex,
      };
    } else {
      // absent → เติม distractor อีก 1 ตัว สลับชนิด A/B เพื่อบาลานซ์
      const useA = setSize % 2 === 0;
      const dShape = useA ? targetShape : otherShape;
      const dHex   = useA ? COLORS[otherColorIdx] : COLORS[targetColorIdx];

      const rx = X[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      const ry = Y[setSize] + (Math.random() - 0.5) * 2 * JITTER;
      if (dShape === 1) {
        vismem.makeCircle('c', rx, ry, RADIUS, false, 2, dHex, dHex);
      } else {
        vismem.makeRectangle('s', rx, ry, OBJ_SIZE, OBJ_SIZE, false, dHex, dHex, 0, 0);
      }
      change = 0;
      targetDataResult = null;
    }

    vismem.drawObjects(ctx, vismem.objects);
  }

  // -------------------------------
  // Response & feedback
  // -------------------------------
  function checkResp(answerChange: 0 | 1) {
    // clickSound(); // เปิดเสียงได้ถ้าต้องการ
    const rt = Date.now() - startTs;
    allRt.push(rt);
    allClickTime.push(nowISO());

    if (change === answerChange) {
      // combo2Sound();
      checkAns.push('right');
      hitRt.push(rt);
      correctCount++;
    } else {
      // losingSound();
      checkAns.push('wrong');
      incorrectCount++;
    }

    // feedback สั้น ๆ แล้วไปต่อ
    feedbackThenNext(checkAns[checkAns.length - 1]);
  }

  function feedbackThenNext(result: 'right' | 'wrong' | 'late') {
    vismem.erase(ctx);
    vismem.clear();
    makeBackground();
    vismem.drawObjects(ctx, vismem.objects);

    setDisabledButton(true);
    const text = result === 'wrong' ? 'ผิด' : 'ถูก';
    const dy = result === 'wrong' ? 36 : 20;

    ctx.font = '120px Sarabun';
    const w = ctx.measureText(text).width;

    timeouts.push(
      setTimeout(() => {
        const t = vismem.makeText('t', centerX - w / 2, centerY + dy, text, 'Black', ctx.font);
        vismem.drawText(ctx, t);
      }, 100),
      setTimeout(() => {
        vismem.erase(ctx);
        vismem.clear();
        makeBackground();
        vismem.drawObjects(ctx, vismem.objects);
      }, 600),
      setTimeout(() => {
        currTrial += 1;
        setDisabledButton(false);
        nextTrial();
      }, 900),
    );
  }

  // -------------------------------
  // Finish & save
  // -------------------------------
  function finish() {
    const payload = {
      date: nowISO(),
      userId: props.userId,
      userSession: VERSION,
      target: targetDataResult,
      trialData: {
        allRt,
        hitRt,
        correctCount,
        incorrectCount,
        allStartTime,
        allClickTime,
        allSetSizes,
        allModes,
        checkAns,
      },
    };
    saveJSONDataToClientDevice(payload, `Subject${props.userId}_${VERSION}_${nowISO()}`);
    navigate('/landing');
  }

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <div className="h-screen w-full bg-[#BCBCBC] flex flex-col">
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

export default FAST;
