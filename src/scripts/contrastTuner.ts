// ปรับ Lightness ของสี HSL ให้ได้ contrast ratio เป้าหมายกับ BG (WCAG)
// ใช้กับ hue ใด ๆ ได้: ใส่ hue[], saturation คงที่ แล้วหา L ที่ให้ ratio ≈ target

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  const x = hex.replace('#', '');
  const n = parseInt(x, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex({ r, g, b }: RGB) {
  const to = (v: number) => v.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
function srgbToLin(v: number) {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function relLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbToLin(r), G = srgbToLin(g), B = srgbToLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrastRatio(fg: string, bg: string) {
  const L1 = relLuminance(fg), L2 = relLuminance(bg);
  const [Lmax, Lmin] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (Lmax + 0.05) / (Lmin + 0.05);
}
function hslToRgb(h: number, s: number, l: number): RGB {
  // h: 0..360, s,l: 0..1
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const Hp = h / 60;
  const X = C * (1 - Math.abs((Hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if      (0 <= Hp && Hp < 1) { r = C; g = X; }
  else if (1 <= Hp && Hp < 2) { r = X; g = C; }
  else if (2 <= Hp && Hp < 3) { g = C; b = X; }
  else if (3 <= Hp && Hp < 4) { g = X; b = C; }
  else if (4 <= Hp && Hp < 5) { r = X; b = C; }
  else if (5 <= Hp && Hp < 6) { r = C; b = X; }
  const m = l - C / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// หา HEX ที่ให้ contrast ≈ target กับ bg โดย fix hue,sat แล้ว binary search lightness
export function tuneHexForContrast(hueDeg: number, satPct: number, target = 3.2, bg = '#BCBCBC', eps = 0.01) {
  const s = satPct / 100;
  let lo = 0.0, hi = 1.0, best = '#000000', bestDiff = 999;
  for (let i = 0; i < 32; i++) {           // 32 รอบพอเหลือเฟือ
    const mid = (lo + hi) / 2;
    const hex = rgbToHex(hslToRgb(hueDeg, s, mid));
    const cr = contrastRatio(hex, bg);
    const diff = Math.abs(cr - target);
    if (diff < bestDiff) { best = hex; bestDiff = diff; }
    // ปรับทิศทาง: ถ้า hex สว่างกว่า BG มากไปจน ratio > target ให้ลด L ลง ฯลฯ
    const bgL = relLuminance(bg), fgL = relLuminance(hex);
    const isFgBrighter = fgL >= bgL;
    if (cr > target) {
      // ลดช่องว่าง → ถ้า fg สว่างกว่า bg มากไป ให้ลด L; ถ้ามืดกว่า bg มากไป ให้เพิ่ม L
      if (isFgBrighter) hi = mid; else lo = mid;
    } else {
      if (isFgBrighter) lo = mid; else hi = mid;
    }
  }
  return best;
}

// ---- ตัวอย่างใช้งาน ----
export function makeColorSet(hues: number[], satPct = 60, target = 3.2, bg = '#BCBCBC') {
  return hues.map(h => tuneHexForContrast(h, satPct, target, bg));
}

// ตัวอย่าง: 0/90/180/270, 30/120/210/300, 45/135/225/315
console.log('set_0_90_180_270:', makeColorSet([0,90,180,270], 60));
console.log('set_30_120_210_300:', makeColorSet([30,120,210,300], 60));
console.log('set_45_135_225_315:', makeColorSet([45,135,225,315], 60));
