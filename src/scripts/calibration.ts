export const CALIB_STORAGE_KEY = "FAST_CALIBRATION";
export const CALIB_VERSION = "2025-11-21-DARKONLY-UID";

function getCurrentUserId(): number | null {
  try {
    const raw = localStorage.getItem("userId");      
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

export interface CalibrationMeta {
  version: string;
  time: string;
  ua: string;
  dpr: number;
  userId: number | null;        // << ผูกกับ user
  checks: { nearBlack2pct: boolean | null; nearWhite98pct?: boolean | null };
  thresholds?: { whiteAlpha?: number | null; darkAlpha?: number | null };
}

export function getCalibration(): CalibrationMeta | null {
  try {
    const raw = localStorage.getItem(CALIB_STORAGE_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw) as CalibrationMeta;

    if (meta.version !== CALIB_VERSION) return null;

    const current = getCurrentUserId();
    if (current !== meta.userId) return null;        

    if (meta.checks?.nearBlack2pct !== true) return null; // << ผ่านขั้นต่ำ: ฝั่งมืด
    return meta;
  } catch { return null; }
}

export function saveCalibration(partial: Partial<CalibrationMeta>): CalibrationMeta {
  const meta: CalibrationMeta = {
    version: CALIB_VERSION,
    time: new Date().toISOString(),
    ua: navigator.userAgent,
    dpr: window.devicePixelRatio,
    userId: getCurrentUserId(),                      // << บันทึก userId ตอนคาลิเบรต
    checks: {
      nearBlack2pct: partial.checks?.nearBlack2pct ?? null,
      nearWhite98pct: partial.checks?.nearWhite98pct ?? null,
    },
    thresholds: {
      whiteAlpha: partial.thresholds?.whiteAlpha ?? null,
      darkAlpha: partial.thresholds?.darkAlpha ?? null,
    },
  };
  localStorage.setItem(CALIB_STORAGE_KEY, JSON.stringify(meta));
  return meta;
}
