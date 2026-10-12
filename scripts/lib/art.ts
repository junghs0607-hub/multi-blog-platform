/**
 * 시드용 절차적 이미지 생성기 (SVG → sharp 로 래스터화)
 * 외부 이미지/폰트 없이 테마별로 서로 다른 일러스트를 만들어 실제 업로드 파이프라인으로 등록합니다.
 */

export type Rand = () => number;

export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(r: Rand, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!;
export const between = (r: Rand, min: number, max: number) => min + r() * (max - min);
export const int = (r: Rand, min: number, max: number) => Math.floor(between(r, min, max + 1));

export const PALETTES: Record<string, string[]> = {
  sunset: ["#2b1055", "#7597de", "#ff7e5f", "#feb47b", "#ffd194"],
  ocean: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"],
  forest: ["#081c15", "#1b4332", "#2d6a4f", "#52b788", "#b7e4c7"],
  pastel: ["#ffd6e0", "#ffef9f", "#c1fba4", "#a0c4ff", "#bdb2ff"],
  earth: ["#582f0e", "#7f4f24", "#936639", "#a68a64", "#ede0d4"],
  night: ["#0b132b", "#1c2541", "#3a506b", "#5bc0be", "#f4d35e"],
  berry: ["#590d22", "#800f2f", "#c9184a", "#ff758f", "#ffccd5"],
  citrus: ["#ff9f1c", "#ffbf69", "#fff3e0", "#cbf3f0", "#2ec4b6"],
  lavender: ["#3c096c", "#5a189a", "#7b2cbf", "#c77dff", "#e0aaff"],
  mint: ["#004b23", "#006400", "#38b000", "#9ef01a", "#ccff33"],
  coral: ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
  mono: ["#111111", "#3d3d3d", "#7a7a7a", "#c7c7c7", "#f4f4f4"],
};

const svg = (w: number, h: number, body: string, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

type Gen = (w: number, h: number, r: Rand, p: string[]) => string;

const mountains: Gen = (w, h, r, p) => {
  const defs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="0.55" stop-color="${p[2]}"/><stop offset="1" stop-color="${p[4]}"/></linearGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  body += `<circle cx="${between(r, 0.2, 0.8) * w}" cy="${between(r, 0.25, 0.45) * h}" r="${between(r, 0.06, 0.12) * w}" fill="${p[4]}" opacity="0.9"/>`;
  const layers = 4;
  for (let l = 0; l < layers; l++) {
    const base = h * (0.5 + l * 0.12);
    let d = `M0 ${h} L0 ${base}`;
    const steps = int(r, 4, 8);
    for (let s = 1; s <= steps; s++) {
      const x = (w / steps) * s;
      const y = base - between(r, 0.05, 0.22) * h * (1 - l * 0.15);
      d += ` L${x - w / steps / 2} ${y} L${x} ${base - between(r, 0, 0.05) * h}`;
    }
    d += ` L${w} ${h} Z`;
    body += `<path d="${d}" fill="${shade(p[1]!, -0.12 * (l + 1))}" opacity="${0.75 + l * 0.08}"/>`;
  }
  return svg(w, h, body, defs);
};

const ocean: Gen = (w, h, r, p) => {
  const horizon = between(r, 0.4, 0.6) * h;
  const defs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[3]}"/><stop offset="1" stop-color="${p[4]}"/></linearGradient><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[2]}"/><stop offset="1" stop-color="${p[0]}"/></linearGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  body += `<circle cx="${between(r, 0.25, 0.75) * w}" cy="${horizon - between(r, 0.05, 0.2) * h}" r="${between(r, 0.07, 0.11) * w}" fill="#fff6d5"/>`;
  body += `<rect y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#sea)"/>`;
  for (let i = 0; i < 9; i++) {
    const y = horizon + ((h - horizon) / 10) * (i + 1);
    const amp = 6 + i * 2;
    let d = `M0 ${y}`;
    for (let x = 0; x <= w; x += 40) d += ` Q${x + 20} ${y - amp} ${x + 40} ${y}`;
    body += `<path d="${d}" stroke="#ffffff" stroke-opacity="${0.15 + i * 0.04}" stroke-width="3" fill="none"/>`;
  }
  return svg(w, h, body, defs);
};

const city: Gen = (w, h, r, p) => {
  const defs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#sky)"/>`;
  for (let i = 0; i < 40; i++) body += `<circle cx="${r() * w}" cy="${r() * h * 0.4}" r="${between(r, 0.8, 2)}" fill="#fff" opacity="${between(r, 0.3, 0.9)}"/>`;
  let x = 0;
  while (x < w) {
    const bw = between(r, 0.08, 0.18) * w;
    const bh = between(r, 0.25, 0.7) * h;
    const color = shade(p[1]!, -between(r, 0.05, 0.25));
    body += `<rect x="${x}" y="${h - bh}" width="${bw - 4}" height="${bh}" fill="${color}"/>`;
    for (let wy = h - bh + 14; wy < h - 12; wy += 22) {
      for (let wx = x + 8; wx < x + bw - 16; wx += 16) {
        if (r() > 0.45) body += `<rect x="${wx}" y="${wy}" width="8" height="12" fill="${p[4]}" opacity="${between(r, 0.5, 1)}"/>`;
      }
    }
    x += bw;
  }
  return svg(w, h, body, defs);
};

const abstract: Gen = (w, h, r, p) => {
  const defs = `<filter id="blur"><feGaussianBlur stdDeviation="${between(r, 8, 30)}"/></filter>`;
  let body = `<rect width="${w}" height="${h}" fill="${p[4]}"/>`;
  const n = int(r, 6, 11);
  for (let i = 0; i < n; i++) {
    const color = pick(r, p.slice(0, 4));
    if (r() > 0.5) {
      body += `<circle cx="${r() * w}" cy="${r() * h}" r="${between(r, 0.1, 0.35) * w}" fill="${color}" opacity="${between(r, 0.5, 0.95)}" ${r() > 0.6 ? 'filter="url(#blur)"' : ""}/>`;
    } else {
      body += `<rect x="${r() * w * 0.8}" y="${r() * h * 0.8}" width="${between(r, 0.15, 0.5) * w}" height="${between(r, 0.1, 0.4) * h}" rx="${between(r, 0, 40)}" fill="${color}" opacity="${between(r, 0.5, 0.95)}" transform="rotate(${between(r, -30, 30)} ${w / 2} ${h / 2})"/>`;
    }
  }
  return svg(w, h, body, defs);
};

const food: Gen = (w, h, r, p) => {
  const cx = w / 2;
  const cy = h * between(r, 0.45, 0.55);
  const pr = Math.min(w, h) * 0.34;
  let body = `<rect width="${w}" height="${h}" fill="${shade(PALETTES.earth![3]!, between(r, -0.05, 0.15))}"/>`;
  for (let y = 0; y < h; y += 60) body += `<rect y="${y}" width="${w}" height="2" fill="#000" opacity="0.06"/>`;
  body += `<circle cx="${cx + 8}" cy="${cy + 10}" r="${pr}" fill="#000" opacity="0.15"/>`;
  body += `<circle cx="${cx}" cy="${cy}" r="${pr}" fill="#fbfbf8"/><circle cx="${cx}" cy="${cy}" r="${pr * 0.78}" fill="#f1efe9"/>`;
  const items = int(r, 5, 9);
  for (let i = 0; i < items; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * pr * 0.5;
    body += `<circle cx="${cx + Math.cos(a) * d}" cy="${cy + Math.sin(a) * d}" r="${between(r, 0.08, 0.18) * pr}" fill="${pick(r, p)}"/>`;
  }
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * pr * 0.65;
    body += `<ellipse cx="${cx + Math.cos(a) * d}" cy="${cy + Math.sin(a) * d}" rx="6" ry="3" fill="#3a7d44" transform="rotate(${r() * 180} ${cx + Math.cos(a) * d} ${cy + Math.sin(a) * d})"/>`;
  }
  body += `<rect x="${w * 0.08}" y="${h * 0.15}" width="14" height="${h * 0.6}" rx="7" fill="#c9c9c9"/>`;
  body += `<circle cx="${w * 0.85}" cy="${h * 0.16}" r="${w * 0.09}" fill="#fff"/><circle cx="${w * 0.85}" cy="${h * 0.16}" r="${w * 0.07}" fill="#6f4e37"/>`;
  return svg(w, h, body);
};

const interior: Gen = (w, h, r, p) => {
  const floor = h * 0.72;
  const defs = `<linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ad0ec"/><stop offset="1" stop-color="#fff7e0"/></linearGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="${p[4]}"/>`;
  body += `<rect y="${floor}" width="${w}" height="${h - floor}" fill="${shade(PALETTES.earth![3]!, 0.1)}"/>`;
  const wx = w * between(r, 0.08, 0.5);
  body += `<rect x="${wx}" y="${h * 0.12}" width="${w * 0.36}" height="${h * 0.36}" fill="url(#win)" stroke="#fff" stroke-width="10"/>`;
  body += `<line x1="${wx + w * 0.18}" y1="${h * 0.12}" x2="${wx + w * 0.18}" y2="${h * 0.48}" stroke="#fff" stroke-width="6"/>`;
  const sx = w * 0.12;
  body += `<rect x="${sx}" y="${floor - h * 0.17}" width="${w * 0.6}" height="${h * 0.14}" rx="22" fill="${p[1]}"/>`;
  body += `<rect x="${sx - 10}" y="${floor - h * 0.22}" width="${w * 0.12}" height="${h * 0.2}" rx="18" fill="${shade(p[1]!, -0.08)}"/>`;
  body += `<rect x="${sx + w * 0.5}" y="${floor - h * 0.22}" width="${w * 0.12}" height="${h * 0.2}" rx="18" fill="${shade(p[1]!, -0.08)}"/>`;
  body += `<rect x="${sx + w * 0.14}" y="${floor - h * 0.22}" width="${w * 0.15}" height="${h * 0.08}" rx="14" fill="${p[2]}"/>`;
  const px = w * 0.83;
  body += `<rect x="${px - 30}" y="${floor - 90}" width="60" height="90" rx="8" fill="${p[0]}"/>`;
  for (let i = 0; i < 9; i++) {
    body += `<ellipse cx="${px + between(r, -50, 50)}" cy="${floor - 110 - r() * 120}" rx="${between(r, 18, 34)}" ry="${between(r, 8, 14)}" fill="${pick(r, ["#2d6a4f", "#40916c", "#52b788"])}" transform="rotate(${between(r, -50, 50)} ${px} ${floor - 150})"/>`;
  }
  body += `<rect x="${w * 0.62}" y="${h * 0.16}" width="${w * 0.18}" height="${h * 0.14}" fill="${p[3]}" stroke="#333" stroke-width="5"/>`;
  return svg(w, h, body, defs);
};

const leaves: Gen = (w, h, r, p) => {
  let body = `<rect width="${w}" height="${h}" fill="${p[4]}"/>`;
  const n = int(r, 14, 24);
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    const len = between(r, 0.12, 0.28) * Math.max(w, h);
    const rot = r() * 360;
    const c = pick(r, p.slice(0, 4));
    body += `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 Q ${len * 0.35} ${-len * 0.28} ${len} 0 Q ${len * 0.35} ${len * 0.28} 0 0 Z" fill="${c}"/><line x1="0" y1="0" x2="${len * 0.95}" y2="0" stroke="${shade(c, 0.2)}" stroke-width="3"/></g>`;
  }
  return svg(w, h, body);
};

const pattern: Gen = (w, h, r, p) => {
  const kind = int(r, 0, 2);
  let body = `<rect width="${w}" height="${h}" fill="${p[4]}"/>`;
  if (kind === 0) {
    const sw = between(r, 24, 60);
    for (let x = -h; x < w + h; x += sw * 2) {
      body += `<polygon points="${x},0 ${x + sw},0 ${x + sw + h},${h} ${x + h},${h}" fill="${pick(r, p.slice(0, 4))}"/>`;
    }
  } else if (kind === 1) {
    const s = between(r, 40, 80);
    for (let y = s / 2; y < h; y += s) {
      for (let x = s / 2; x < w; x += s) body += `<circle cx="${x + ((y / s) % 2) * (s / 2)}" cy="${y}" r="${s * 0.28}" fill="${pick(r, p.slice(0, 4))}"/>`;
    }
  } else {
    const s = between(r, 60, 110);
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        const flip = r() > 0.5;
        body += `<polygon points="${flip ? `${x},${y} ${x + s},${y} ${x},${y + s}` : `${x + s},${y} ${x + s},${y + s} ${x},${y + s}`}" fill="${pick(r, p.slice(0, 4))}"/>`;
      }
    }
  }
  return svg(w, h, body);
};

const cat: Gen = (w, h, r, p) => {
  const cx = w / 2;
  const cy = h * 0.55;
  const s = Math.min(w, h) * 0.3;
  const fur = pick(r, ["#f4a261", "#3d3d3d", "#e9e3d5", "#8d6e63", "#ffb703"]);
  let body = `<rect width="${w}" height="${h}" fill="${p[4]}"/>`;
  for (let i = 0; i < 12; i++) body += `<circle cx="${r() * w}" cy="${r() * h}" r="${between(r, 6, 22)}" fill="${pick(r, p.slice(0, 4))}" opacity="0.35"/>`;
  body += `<polygon points="${cx - s * 0.95},${cy - s * 0.45} ${cx - s * 0.75},${cy - s * 1.35} ${cx - s * 0.2},${cy - s * 0.85}" fill="${fur}"/>`;
  body += `<polygon points="${cx + s * 0.95},${cy - s * 0.45} ${cx + s * 0.75},${cy - s * 1.35} ${cx + s * 0.2},${cy - s * 0.85}" fill="${fur}"/>`;
  body += `<polygon points="${cx - s * 0.8},${cy - s * 0.6} ${cx - s * 0.72},${cy - s * 1.1} ${cx - s * 0.4},${cy - s * 0.82}" fill="#ffb4c2"/>`;
  body += `<polygon points="${cx + s * 0.8},${cy - s * 0.6} ${cx + s * 0.72},${cy - s * 1.1} ${cx + s * 0.4},${cy - s * 0.82}" fill="#ffb4c2"/>`;
  body += `<ellipse cx="${cx}" cy="${cy}" rx="${s}" ry="${s * 0.85}" fill="${fur}"/>`;
  const sleepy = r() > 0.6;
  for (const dx of [-0.38, 0.38]) {
    body += sleepy
      ? `<path d="M${cx + dx * s - s * 0.14} ${cy - s * 0.08} Q ${cx + dx * s} ${cy + s * 0.05} ${cx + dx * s + s * 0.14} ${cy - s * 0.08}" stroke="#222" stroke-width="6" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="${cx + dx * s}" cy="${cy - s * 0.08}" rx="${s * 0.13}" ry="${s * 0.17}" fill="#1f2a1f"/><circle cx="${cx + dx * s + s * 0.04}" cy="${cy - s * 0.14}" r="${s * 0.04}" fill="#fff"/>`;
  }
  body += `<polygon points="${cx - s * 0.08},${cy + s * 0.15} ${cx + s * 0.08},${cy + s * 0.15} ${cx},${cy + s * 0.25}" fill="#ff8fa3"/>`;
  for (const side of [-1, 1]) {
    for (const dy of [0.2, 0.3]) {
      body += `<line x1="${cx + side * s * 0.2}" y1="${cy + s * dy}" x2="${cx + side * s * 1.05}" y2="${cy + s * (dy - 0.08)}" stroke="#333" stroke-width="3" stroke-linecap="round"/>`;
    }
  }
  return svg(w, h, body);
};

const space: Gen = (w, h, r, p) => {
  const defs = `<radialGradient id="bg" cx="0.3" cy="0.3" r="1"><stop offset="0" stop-color="${p[2]}"/><stop offset="1" stop-color="${p[0]}"/></radialGradient><radialGradient id="pl" cx="0.35" cy="0.35" r="0.8"><stop offset="0" stop-color="${p[4]}"/><stop offset="1" stop-color="${p[3]}"/></radialGradient>`;
  let body = `<rect width="${w}" height="${h}" fill="url(#bg)"/>`;
  for (let i = 0; i < 160; i++) body += `<circle cx="${r() * w}" cy="${r() * h}" r="${between(r, 0.5, 2.4)}" fill="#fff" opacity="${between(r, 0.3, 1)}"/>`;
  const px = between(r, 0.3, 0.7) * w;
  const py = between(r, 0.35, 0.65) * h;
  const pr = between(r, 0.15, 0.25) * w;
  body += `<circle cx="${px}" cy="${py}" r="${pr}" fill="url(#pl)"/>`;
  if (r() > 0.4) body += `<ellipse cx="${px}" cy="${py}" rx="${pr * 1.7}" ry="${pr * 0.35}" fill="none" stroke="${p[4]}" stroke-width="${pr * 0.12}" opacity="0.8" transform="rotate(${between(r, -25, 25)} ${px} ${py})"/>`;
  body += `<circle cx="${w * between(r, 0.1, 0.9)}" cy="${h * 0.15}" r="${w * 0.05}" fill="#f8f4e3" opacity="0.95"/>`;
  return svg(w, h, body, defs);
};

const flowers: Gen = (w, h, r, p) => {
  let body = `<rect width="${w}" height="${h}" fill="${p[4]}"/>`;
  const n = int(r, 5, 9);
  const vaseX = w / 2;
  const vaseTop = h * 0.78;
  const blooms = Array.from({ length: n }, () => ({
    x: between(r, 0.14, 0.86) * w,
    y: between(r, 0.12, 0.55) * h,
    pr: between(r, 22, 48),
    color: pick(r, p.slice(0, 4)),
    petals: int(r, 5, 8),
  }));
  // 줄기: 꽃병 입구에서 각 꽃의 중심까지
  for (const b of blooms) {
    const sx = vaseX + between(r, -0.06, 0.06) * w;
    body += `<path d="M${sx} ${vaseTop} Q ${(sx + b.x) / 2 + between(r, -30, 30)} ${(vaseTop + b.y) / 2} ${b.x} ${b.y}" stroke="#40916c" stroke-width="5" fill="none"/>`;
  }
  for (const b of blooms) {
    for (let k = 0; k < b.petals; k++) {
      const a = (k / b.petals) * Math.PI * 2;
      const px = b.x + Math.cos(a) * b.pr * 0.75;
      const py = b.y + Math.sin(a) * b.pr * 0.75;
      body += `<ellipse cx="${px}" cy="${py}" rx="${b.pr * 0.55}" ry="${b.pr * 0.35}" fill="${b.color}" transform="rotate(${(a * 180) / Math.PI} ${px} ${py})"/>`;
    }
    body += `<circle cx="${b.x}" cy="${b.y}" r="${b.pr * 0.35}" fill="#ffd166"/>`;
  }
  body += `<polygon points="${w * 0.38},${vaseTop} ${w * 0.62},${vaseTop} ${w * 0.56},${h} ${w * 0.44},${h}" fill="${shade(p[1]!, -0.1)}"/>`;
  return svg(w, h, body);
};

const desk: Gen = (w, h, r, p) => {
  const top = h * 0.62;
  let body = `<rect width="${w}" height="${h}" fill="${p[4]}"/>`;
  body += `<rect y="${top}" width="${w}" height="${h * 0.08}" fill="${shade(PALETTES.earth![2]!, 0.1)}"/>`;
  body += `<rect x="${w * 0.12}" y="${top + h * 0.08}" width="16" height="${h - top}" fill="#555"/><rect x="${w * 0.88 - 16}" y="${top + h * 0.08}" width="16" height="${h - top}" fill="#555"/>`;
  const mw = w * between(r, 0.45, 0.6);
  const mx = w / 2 - mw / 2;
  body += `<rect x="${mx}" y="${top - h * 0.36}" width="${mw}" height="${h * 0.3}" rx="10" fill="#1d1d1f"/>`;
  body += `<rect x="${mx + 10}" y="${top - h * 0.36 + 10}" width="${mw - 20}" height="${h * 0.3 - 20}" rx="4" fill="${p[1]}"/>`;
  for (let i = 0; i < 6; i++) body += `<rect x="${mx + 30}" y="${top - h * 0.32 + i * 18}" width="${between(r, 0.2, 0.7) * (mw - 60)}" height="7" rx="3" fill="${pick(r, [p[3], p[2], "#ffffff"])}" opacity="0.85"/>`;
  body += `<rect x="${w / 2 - 12}" y="${top - h * 0.06}" width="24" height="${h * 0.06}" fill="#2b2b2b"/>`;
  body += `<rect x="${w / 2 - mw * 0.35}" y="${top - 18}" width="${mw * 0.7}" height="14" rx="6" fill="#d9d9d9"/>`;
  body += `<rect x="${w * 0.8}" y="${top - 46}" width="34" height="42" rx="6" fill="${p[2]}"/>`;
  body += `<rect x="${w * 0.08}" y="${top - 50}" width="40" height="46" rx="6" fill="${p[0]}"/>`;
  for (let i = 0; i < 6; i++) body += `<ellipse cx="${w * 0.08 + 20 + between(r, -24, 24)}" cy="${top - 60 - r() * 50}" rx="16" ry="7" fill="#52b788" transform="rotate(${between(r, -60, 60)} ${w * 0.08 + 20} ${top - 70})"/>`;
  return svg(w, h, body);
};

export const GENERATORS: Record<string, Gen> = {
  mountains,
  ocean,
  city,
  abstract,
  food,
  interior,
  leaves,
  pattern,
  cat,
  space,
  flowers,
  desk,
};

export const ASPECTS: [number, number][] = [
  [2, 3],
  [3, 4],
  [4, 5],
  [1, 1],
  [9, 16],
  [3, 2],
  [2, 3],
  [3, 5],
  [4, 3],
];

export function renderSvg(theme: string, seed: number, palette: string): { svg: string; width: number; height: number } {
  const r = mulberry32(seed);
  const [aw, ah] = pick(r, ASPECTS);
  const width = 720;
  const height = Math.round((width * ah) / aw);
  return { svg: GENERATORS[theme]!(width, height, r, PALETTES[palette]!), width, height };
}

/** 데모 프로필 이미지 (텍스트 없이 그라데이션 + 도형) */
export function avatarSvg(seed: number): string {
  const r = mulberry32(seed * 7919);
  const names = Object.keys(PALETTES);
  const p = PALETTES[names[seed % names.length]!]!;
  const s = 256;
  const angle = int(r, 0, 360);
  const defs = `<linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)"><stop offset="0" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[3]}"/></linearGradient>`;
  let body = `<rect width="${s}" height="${s}" fill="url(#g)"/>`;
  for (let i = 0; i < 4; i++) {
    body += `<circle cx="${r() * s}" cy="${r() * s}" r="${between(r, 20, 60)}" fill="${p[i % 5]}" opacity="0.35"/>`;
  }
  body += `<circle cx="128" cy="${between(r, 96, 110)}" r="${between(r, 40, 50)}" fill="${p[4]}" opacity="0.95"/>`;
  body += `<ellipse cx="128" cy="236" rx="${between(r, 78, 92)}" ry="70" fill="${p[4]}" opacity="0.95"/>`;
  return svg(s, s, body, defs);
}
