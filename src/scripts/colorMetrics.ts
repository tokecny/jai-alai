function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return { r, g, b };
}

function srgbToLinear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(l1: number, l2: number): number {
  const [Lmax, Lmin] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (Lmax + 0.05) / (Lmin + 0.05);
}

export function hexToHueDeg(hex: string): number | null {
  const { r, g, b } = hexToRgb(hex);
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const d = max - min;
  const L = (max + min) / 2;
  const S = d === 0 ? 0 : d / (1 - Math.abs(2 * L - 1));
  if (S === 0) return null;
  let H = 0;
  switch (max) {
    case R: H = ((G - B) / d) % 6; break;
    case G: H = (B - R) / d + 2; break;
    case B: H = (R - G) / d + 4; break;
  }
  H *= 60;
  if (H < 0) H += 360;
  return H;
}

export function hueContrastDeg(h1: number | null, h2: number | null): number | null {
  if (h1 == null || h2 == null) return null;
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
}

// CIE76 ΔE (ง่าย ๆ พอสำหรับการเช็ค perceptual difference)
export function deltaE(hex1: string, hex2: string): number {
  const { r: r1, g: g1, b: b1 } = hexToRgb(hex1);
  const { r: r2, g: g2, b: b2 } = hexToRgb(hex2);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function summaryStats(nums: number[]): { min: number; max: number; mean: number; variance: number } {
  if (nums.length === 0) return { min: NaN, max: NaN, mean: NaN, variance: NaN };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return {
    min: Number(min.toFixed(4)),
    max: Number(max.toFixed(4)),
    mean: Number(mean.toFixed(4)),
    variance: Number(variance.toFixed(6)),
  };
}

// Round helper
const rnd = (x: number | null, p = 4) => (x == null ? null : Number(x.toFixed(p)));

// ========== Types ==========
export interface ColorMetrics {
  background: { hex: string; luminance: number; hueDeg: number | null };
  perColor: Array<{
    index: number;
    hex: string;
    luminance: number;
    hueDeg: number | null;
    contrastVsBg: number;
  }>;
  perPair: Array<{
    pairIdx: number;
    aIdx: number; aHex: string; aLuminance: number; aHueDeg: number | null; aVsBgContrast: number;
    bIdx: number; bHex: string; bLuminance: number; bHueDeg: number | null; bVsBgContrast: number;
    pairLuminanceContrast: number;
    pairHueContrastDeg: number | null;
    deltaE: number;
  }>;
}

// ========== Main compute ==========
export function computeColorMetrics(
  COLORS: string[],
  BG_COLOR: string,
  COLOR_PAIRS: [number, number][]
): ColorMetrics & { summary: any } {
  const bgL = relativeLuminance(BG_COLOR);
  const bgHue = hexToHueDeg(BG_COLOR);

  const perColor = COLORS.map((hex, index) => {
    const L = relativeLuminance(hex);
    const H = hexToHueDeg(hex);
    const cBg = contrastRatio(L, bgL);
    return {
      index,
      hex,
      luminance: rnd(L, 6)!,
      hueDeg: H == null ? null : rnd(H, 2),
      contrastVsBg: rnd(cBg, 4)!,
    };
  });

  const perPair = COLOR_PAIRS.map(([aIdx, bIdx], pairIdx) => {
    const aHex = COLORS[aIdx], bHex = COLORS[bIdx];
    const aL = relativeLuminance(aHex), bL = relativeLuminance(bHex);
    const aH = hexToHueDeg(aHex), bH = hexToHueDeg(bHex);
    const pairCR = contrastRatio(aL, bL);
    const hueDiff = hueContrastDeg(aH, bH);
    const aVsBg = contrastRatio(aL, bgL);
    const bVsBg = contrastRatio(bL, bgL);
    return {
      pairIdx,
      aIdx, aHex, aLuminance: rnd(aL, 6)!, aHueDeg: aH == null ? null : rnd(aH, 2), aVsBgContrast: rnd(aVsBg, 4)!,
      bIdx, bHex, bLuminance: rnd(bL, 6)!, bHueDeg: bH == null ? null : rnd(bH, 2), bVsBgContrast: rnd(bVsBg, 4)!,
      pairLuminanceContrast: rnd(pairCR, 4)!,
      pairHueContrastDeg: hueDiff == null ? null : rnd(hueDiff, 2),
      deltaE: rnd(deltaE(aHex, bHex), 2)!,
    };
  });

  // summary
  const lumArr = perColor.map(c => c.luminance);
  const crBgArr = perColor.map(c => c.contrastVsBg);
  const pairLumArr = perPair.map(p => p.pairLuminanceContrast);
  const hueArr = perPair.map(p => (p.pairHueContrastDeg ?? 0));
  const deltaEArr = perPair.map(p => p.deltaE);

  const summary = {
    luminance: summaryStats(lumArr),
    contrastVsBg: summaryStats(crBgArr),
    pairLuminanceContrast: summaryStats(pairLumArr),
    pairHueContrastDeg: summaryStats(hueArr),
    deltaE: summaryStats(deltaEArr),
  };

  return {
    background: { hex: BG_COLOR, luminance: rnd(bgL, 6)!, hueDeg: bgHue == null ? null : rnd(bgHue, 2) },
    perColor,
    perPair,
    summary,
  };
}
