/**
 * FAST_Practice — shared practice for FAST_E1_TR and FAST_E2_EB.
 *
 * Placement: src/pages/game/FAST_Practice.tsx
 * This component uses the same CJSWindow, CJSButton, and vismem drawing API as E1.
 * Practice NEVER contributes to E1/E2 baseline/testing data.
 *
 * Default practice: 8 trials; 2 practice-only conjunction targets (4 trials each,
 * 2 present / 2 absent), randomized within practice; no frequency manipulation.
 * This is a practice-only stimulus palette, not part of the experimental DKL set.
 *
 * The parent must provide nextPath (or onComplete) to advance to the chosen task.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CJSWindow from '../../components/gameWindow/cjsWindow/CJSWindow';
import CJSButton from '../../components/gameWindow/cjsWindow/cjsButton/CJSButton';
import * as vismem from '../../scripts/vismemCC_simon';
import { Shuffle } from '../../scripts/shuffle';

type ShapeId = 0 | 1; // 0 = square, 1 = circle
type ColorIdx = 0 | 1;
type PracticeTarget = { shape: ShapeId; color: ColorIdx };
type PracticeTrial = {
  role: 0 | 1;
  hasTarget: 0 | 1;
};
type PracticeResult = {
  index: number;
  role: 0 | 1;
  hasTarget: boolean;
  responsePresent: boolean;
  correct: boolean;
  rtMs: number;
};

type FASTPracticeProps = {
  /** Experiment to run next; for display/parent routing only. */
  experimentId?: 'E1' | 'E2';
  /** Route already defined in your project's router (do not assume its name). */
  nextPath?: string;
  /** Optional alternative to nextPath, e.g. parent controls transition. */
  onComplete?: (results: PracticeResult[]) => void;
};

const CANVAS_W = 600;
const CANVAS_H = 600;
const GRID_COLS = 8;
const GRID_ROWS = 6;
const DISTRACTORS = 31; // 32 objects total, including target or extra distractor
const OBJ_SIZE = 45;
const RADIUS = OBJ_SIZE / 2;
const JITTER = 8;
const BG_COLOR = '#BCBCBC';
const TRIALS_PER_TARGET = 4; // 2 present + 2 absent for each target

// Practice-only colors: intentionally not identical to any E1 AB/C HEX.
// They are not calibrated DKL stimuli. Replace together with any later shared practice specification.
const PRACTICE_COLORS = ['#99732B', '#47718D'] as const;
const PRACTICE_TARGETS: readonly PracticeTarget[] = [
  { shape: 0, color: 0 }, // amber square
  { shape: 1, color: 1 }, // blue circle
];
const otherShape = (shape: ShapeId): ShapeId => (shape === 0 ? 1 : 0);
const otherColor = (color: ColorIdx): ColorIdx => (color === 0 ? 1 : 0);
const shapeName = (shape: ShapeId) => (shape === 0 ? 'square' : 'circle');

function buildPracticeSchedule(): PracticeTrial[] {
  const trials: PracticeTrial[] = [];
  for (const role of [0, 1] as const) {
    for (let i = 0; i < TRIALS_PER_TARGET / 2; i++) {
      trials.push({ role, hasTarget: 1 });
      trials.push({ role, hasTarget: 0 });
    }
  }
  Shuffle(trials);
  if (trials.length !== 8) throw new Error('FAST Practice schedule must contain 8 trials');
  for (const role of [0, 1] as const) {
    const relevant = trials.filter(t => t.role === role);
    if (relevant.length !== 4 || relevant.filter(t => t.hasTarget === 1).length !== 2) {
      throw new Error(`Invalid practice present/absent count for role ${role}`);
    }
  }
  return trials;
}

export default function FAST_Practice({ experimentId, nextPath, onComplete }: FASTPracticeProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const trialIndexRef = useRef(0);
  const startTimeRef = useRef(0);
  const responseLockedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const resultsRef = useRef<PracticeResult[]>([]);
  const scheduleRef = useRef<PracticeTrial[]>([]);
  const [searchTarget, setSearchTarget] = useState<PracticeTarget | null>(null);
  const [disabledButton, setDisabledButton] = useState(true);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [started, setStarted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchTargetList = useMemo(() => [
    PRACTICE_COLORS.map((color, i) => ({
      description: i === 0 ? 'สี่เหลี่ยมสีน้ำตาล' : 'สี่เหลี่ยมสีน้ำเงิน',
      color,
      shape: 'square' as const,
    })),
    PRACTICE_COLORS.map((color, i) => ({
      description: i === 0 ? 'วงกลมสีน้ำตาล' : 'วงกลมสีน้ำเงิน',
      color,
      shape: 'circle' as const,
    })),
  ], []);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function clearScene() {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    vismem.erase(ctx);
    vismem.clear();
    vismem.makeRectangle('bg', canvas.width / 2, canvas.height / 2,
      CANVAS_W, CANVAS_H, false, BG_COLOR, BG_COLOR, 0, 0);
    vismem.drawObjects(ctx, vismem.objects);
  }

  function showCenteredText(value: string) {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    clearScene();
    ctx.font = '100px Sarabun';
    const width = ctx.measureText(value).width;
    vismem.drawText(ctx, vismem.makeText('t', (canvas.width - width) / 2,
      canvas.height / 2 + 32, value, 'Black', ctx.font));
  }

  function createStimulus(trial: PracticeTrial): void {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    clearScene();

    const target = PRACTICE_TARGETS[trial.role];
    const alternativeShape = otherShape(target.shape);
    const alternativeColor = otherColor(target.color);

    // Coordinates follow row-major order: id % GRID_COLS is the x position.
    const positionIds = Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => i);
    Shuffle(positionIds);
    const coordinates = positionIds.slice(0, DISTRACTORS + 1).map(id => ({
      x: ((id % GRID_COLS) + 0.5) * CANVAS_W / GRID_COLS + (Math.random() * 2 - 1) * JITTER,
      y: (Math.floor(id / GRID_COLS) + 0.5) * CANVAS_H / GRID_ROWS + (Math.random() * 2 - 1) * JITTER,
    }));

    // Conjunction distractors: same shape/other color and other shape/same color.
    // Absent trials contain 16 of each type (not 15/17).
    const items: PracticeTarget[] = [
      ...Array.from({ length: 15 }, () => ({ shape: target.shape, color: alternativeColor })),
      ...Array.from({ length: 16 }, () => ({ shape: alternativeShape, color: target.color })),
    ];
    if (trial.hasTarget === 0) {
      items.push({ shape: target.shape, color: alternativeColor });
    }
    Shuffle(items);
    items.forEach((item, i) => {
      const { x, y } = coordinates[i];
      const colorHex = PRACTICE_COLORS[item.color];
      if (item.shape === 1) vismem.makeCircle('c', x, y, RADIUS, false, 2, colorHex, colorHex);
      else vismem.makeRectangle('s', x, y, OBJ_SIZE, OBJ_SIZE, false, colorHex, colorHex, 0, 0);
    });
    if (trial.hasTarget === 1) {
      const { x, y } = coordinates[DISTRACTORS];
      const colorHex = PRACTICE_COLORS[target.color];
      if (target.shape === 1) vismem.makeCircle('c', x, y, RADIUS, false, 2, colorHex, colorHex);
      else vismem.makeRectangle('s', x, y, OBJ_SIZE, OBJ_SIZE, false, colorHex, colorHex, 0, 0);
    }
    vismem.drawObjects(ctx, vismem.objects);
  }

  function runTrial(): void {
    const index = trialIndexRef.current;
    const trial = scheduleRef.current[index];
    if (!trial) {
      responseLockedRef.current = true;
      setDisabledButton(true);
      setCompleted(true);
      return;
    }
    setCurrentTrial(index + 1);
    setSearchTarget(PRACTICE_TARGETS[trial.role]);
    createStimulus(trial);
    startTimeRef.current = performance.now();
    responseLockedRef.current = false;
    setDisabledButton(false);
  }

  function showCountdown() {
    // Hide target instructions until the first trial actually appears.
    setSearchTarget(null);
    responseLockedRef.current = true;
    setDisabledButton(true);
    timersRef.current.push(
      setTimeout(() => showCenteredText('3'), 150),
      setTimeout(() => showCenteredText('2'), 1150),
      setTimeout(() => showCenteredText('1'), 2150),
      setTimeout(() => { clearScene(); runTrial(); }, 3150),
    );
  }

  function beginPractice(): void {
    if (!contextRef.current) {
      setErrorMessage('ไม่พบ Canvas สำหรับการแสดงผล กรุณาตรวจ CJSWindow (#myCanvas)');
      return;
    }
    clearTimers();
    scheduleRef.current = buildPracticeSchedule();
    trialIndexRef.current = 0;
    resultsRef.current = [];
    responseLockedRef.current = true;
    setSearchTarget(null);
    setCompleted(false);
    setCurrentTrial(0);
    setCorrectCount(0);
    setStarted(true);
    setErrorMessage(null);
    showCountdown();
  }

  function checkResp(answer: 0 | 1): void {
    if (responseLockedRef.current || !started || completed) return;
    const trial = scheduleRef.current[trialIndexRef.current];
    if (!trial) return;
    responseLockedRef.current = true; // synchronous guard against double responses
    setDisabledButton(true);
    const rtMs = Math.round(performance.now() - startTimeRef.current);
    const correct = answer === trial.hasTarget;
    resultsRef.current.push({
      index: trialIndexRef.current + 1,
      role: trial.role,
      hasTarget: trial.hasTarget === 1,
      responsePresent: answer === 1,
      correct,
      rtMs,
    });
    if (correct) setCorrectCount(c => c + 1);
    showCenteredText(correct ? 'ถูก' : 'ผิด');
    timersRef.current.push(setTimeout(() => {
      trialIndexRef.current += 1;
      clearScene();
      runTrial();
    }, 800));
  }

  function finishAndContinue(): void {
    if (!completed || resultsRef.current.length !== scheduleRef.current.length) return;
    if (onComplete) {
      onComplete([...resultsRef.current]);
      return;
    }
    if (nextPath) {
      navigate(nextPath);
    } else {
      setErrorMessage('ยังไม่ได้กำหนด nextPath หรือ onComplete สำหรับเข้าสู่ E1/E2');
    }
  }

  useEffect(() => {
    const canvas = document.getElementById('myCanvas') as HTMLCanvasElement | null;
    if (!canvas) {
      setErrorMessage('ไม่พบ canvas #myCanvas — กรุณาตรวจ CJSWindow');
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      setErrorMessage('ไม่สามารถสร้าง Canvas 2D context');
      return;
    }
    canvasRef.current = canvas;
    contextRef.current = context;
    responseLockedRef.current = true;
    clearScene();
    return () => {
      responseLockedRef.current = true;
      clearTimers();
      vismem.clear();
    };
    // Component is expected to remain mounted until practice is completed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#BCBCBC] flex flex-col">
      {/* During practice, preserve the exact same search screen as E1/E2. */}
      <div className="absolute top-4 right-6 z-10 text-sm font-medium text-gray-700/80 select-none">
        {started && !completed ? `ฝึกซ้อม ${currentTrial} / 8` : ''}
      </div>
      <div className="flex justify-center items-center flex-grow p-5">
        <CJSWindow
          searchTarget={searchTarget ? { shape: searchTarget.shape, col: searchTarget.color } : undefined}
          searchTargetList={searchTargetList}
          canvasWidth={CANVAS_W}
          canvasHeight={CANVAS_H}
        />
        <CJSButton
          searchTarget={{ shape: (searchTarget ?? PRACTICE_TARGETS[0]).shape, col: (searchTarget ?? PRACTICE_TARGETS[0]).color }}
          disabledButton={disabledButton || !started || completed}
          checkResp={checkResp}
        />
      </div>

      {/* Intro matches the Instructions page: light background, white card, slate text, pink action. */}
      {!started && !errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-50 px-4 py-8">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow sm:p-8">
            <div className="mb-2 text-lg font-bold text-pink-600">แบบฝึกซ้อมก่อนการทดสอบ</div>
            <p className="mb-5 text-base leading-relaxed text-slate-700">
              ต่อไปนี้จะมีแบบฝึกซ้อมสั้น ๆ จำนวน <b>8 ครั้ง</b> เพื่อให้คุ้นเคยกับการค้นหาเป้าหมายและการกดปุ่มตอบ
            </p>
            <ul className="mb-6 list-disc space-y-3 pl-5 text-base leading-relaxed text-slate-800">
              <li>สังเกต <b>สีและรูปทรง</b> ของเป้าหมายที่แสดงไว้เหนือภาพ</li>
              <li>กด <b>Z</b> เมื่อ <b>ไม่พบ</b> เป้าหมาย และกด <b>/</b> เมื่อ <b>พบ</b> เป้าหมาย</li>
              <li>พยายามตอบให้ <b>รวดเร็วและถูกต้องมากที่สุด</b> โดยระบบจะแจ้งว่าตอบถูกหรือผิดหลังการตอบแต่ละครั้ง</li>
              <li>หลังจบแบบทดสอบ สามารถเลือก <b>ฝึกอีกครั้ง</b> หรือเข้าสู่การทดลองจริงได้</li>
            </ul>
            <div className="flex justify-end">
              <button type="button" onClick={beginPractice}
                className="rounded-xl bg-pink-500 px-6 py-3 font-medium text-white transition-colors hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2">
                เริ่มฝึกซ้อม (8 ครั้ง)
              </button>
            </div>
          </div>
        </div>
      )}

      {completed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-50 px-4 py-8">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow sm:p-8">
            <div className="mb-2 text-sm font-medium text-pink-600">แบบฝึกซ้อม FAST</div>
            <h1 className="mb-5 text-2xl font-semibold text-slate-900">ฝึกซ้อมเสร็จเรียบร้อย</h1>
            <p className="mb-2 text-lg text-slate-800">ตอบถูก <b>{correctCount}</b> จาก <b>8</b> ครั้ง</p>
            <p className="mb-6 text-base leading-relaxed text-slate-700">
              ผลการฝึกซ้อมไม่รวมในการวิเคราะห์ข้อมูลจริง หากยังไม่คุ้นเคยกับปุ่มตอบ สามารถฝึกซ้ำได้
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={beginPractice}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300">
                ฝึกอีกครั้ง
              </button>
              <button type="button" onClick={finishAndContinue}
                className="rounded-xl bg-pink-500 px-5 py-3 font-medium text-white hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2">
                {experimentId === 'E1' ? 'เริ่มการทดลอง TR' : experimentId === 'E2' ? 'เริ่มการทดลอง EB' : 'เริ่มการทดลองจริง'}
              </button>
            </div>
          </div>
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="fixed bottom-5 left-1/2 z-[60] w-[90vw] max-w-lg -translate-x-1/2 rounded-xl border border-red-300 bg-white p-4 text-center text-red-700 shadow">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

// Notes for integration:
// - Put this file alongside FAST_E1_TR.tsx / FAST_E2_EB.tsx.
// - Render <FAST_Practice experimentId="E1" nextPath="/your-e1-route" />,
//   OR <FAST_Practice experimentId="E2" onComplete={() => ...} />.
// - Ensure your E1/E2 route preserves the participant ID from the existing flow.
// - This component does not alter sessionBlock or generate a research data file.
// - Experiment-specific instruction and navigation routing remain in your parent/router.
