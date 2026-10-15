// Procedural SVG backdrops for the "world" themes (Deep Space, Jungle, Beach).
// Same rules as art.ts: data: URIs only, seeded so every launch looks the same.

import { H, rng, svgDoc, W } from "./art.js";

const f = (n: number) => n.toFixed(0);

/** A pointed leaf of length `len`, rooted at (x, y), pointing along `angle` degrees. */
function leaf(x: number, y: number, len: number, angle: number, fill: string, width = 0.28): string {
  const w = len * width;
  const d = `M0 0 C${f(len * 0.3)} ${f(-w)} ${f(len * 0.75)} ${f(-w)} ${f(len)} 0 C${f(len * 0.75)} ${f(w)} ${f(len * 0.3)} ${f(w)} 0 0Z`;
  return `<path d="${d}" fill="${fill}" transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})"/>`;
}

/** A fan of leaves from one point — a fern/palm clump. */
function frond(rand: () => number, x: number, y: number, len: number, from: number, to: number, count: number, fill: string): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = from + ((to - from) * i) / Math.max(1, count - 1) + (rand() - 0.5) * 10;
    out += leaf(x, y, len * (0.7 + rand() * 0.45), a, fill, 0.18 + rand() * 0.14);
  }
  return out;
}

// ── Deep Space ───────────────────────────────────────────────────────────────

/** Nebula over a dense starfield, a ringed gas giant and a small moon. */
export function deepSpace(): string {
  const rand = rng(1969);
  const defs = `
    <radialGradient id="void" cx=".35" cy=".3" r="1"><stop offset="0" stop-color="#140c33"/><stop offset=".55" stop-color="#070618"/><stop offset="1" stop-color="#010108"/></radialGradient>
    <filter id="neb" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency=".0035" numOctaves="4" seed="7"/>
      <feColorMatrix values="0 0 0 0 .55  0 0 0 0 .25  0 0 0 0 1  0 0 0 1.5 -.55"/>
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <filter id="neb2" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency=".005" numOctaves="3" seed="21"/>
      <feColorMatrix values="0 0 0 0 .1  0 0 0 0 .85  0 0 0 0 .95  0 0 0 1.4 -.6"/>
      <feGaussianBlur stdDeviation="8"/>
    </filter>
    <radialGradient id="nebMask" cx=".3" cy=".35" r=".55"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
    <radialGradient id="nebMask2" cx=".75" cy=".2" r=".4"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
    <mask id="m1"><rect width="${W}" height="${H}" fill="url(#nebMask)"/></mask>
    <mask id="m2"><rect width="${W}" height="${H}" fill="url(#nebMask2)"/></mask>
    <radialGradient id="planet" cx=".32" cy=".3" r=".8"><stop offset="0" stop-color="#ffd9a8"/><stop offset=".35" stop-color="#e0805a"/><stop offset=".75" stop-color="#5a2457"/><stop offset="1" stop-color="#14071f"/></radialGradient>
    <linearGradient id="bands" x1="0" y1="0" x2="0" y2="1">
      ${Array.from({ length: 9 }, (_, i) => `<stop offset="${(i / 8).toFixed(2)}" stop-color="${i % 2 ? "#000" : "#fff"}" stop-opacity="${i % 2 ? 0.18 : 0.06}"/>`).join("")}
    </linearGradient>
    <radialGradient id="moon" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#e9eef7"/><stop offset=".6" stop-color="#8a93a8"/><stop offset="1" stop-color="#262a38"/></radialGradient>
    <radialGradient id="glowP" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#ff8a5c" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a5c" stop-opacity="0"/></radialGradient>
    <clipPath id="ringFront"><rect x="0" y="770" width="${W}" height="${H}"/></clipPath>`;
  const stars = Array.from({ length: 320 }, () => {
    const r = rand();
    const size = r > 0.97 ? 1.9 : r > 0.85 ? 1.2 : 0.6;
    const tint = ["#ffffff", "#cfe3ff", "#ffe9c4", "#d9ccff"][Math.floor(rand() * 4)];
    return `<circle cx="${f(rand() * W)}" cy="${f(rand() * H)}" r="${size}" fill="${tint}" opacity="${(0.35 + rand() * 0.65).toFixed(2)}"/>`;
  }).join("");
  // A few bright stars with diffraction spikes.
  const spikes = Array.from({ length: 7 }, () => {
    const x = rand() * W;
    const y = rand() * H * 0.7;
    const l = 10 + rand() * 16;
    return `<g stroke="#fff" stroke-width="1" opacity=".85"><line x1="${f(x - l)}" y1="${f(y)}" x2="${f(x + l)}" y2="${f(y)}"/><line x1="${f(x)}" y1="${f(y - l)}" x2="${f(x)}" y2="${f(y + l)}"/></g><circle cx="${f(x)}" cy="${f(y)}" r="2.2" fill="#fff"/>`;
  }).join("");
  const px = 1260;
  const py = 790;
  const pr = 210;
  const ring = (stroke: string, width: number, rx: number, op: number) =>
    `<ellipse cx="${px}" cy="${py}" rx="${rx}" ry="${f(rx * 0.22)}" fill="none" stroke="${stroke}" stroke-width="${width}" opacity="${op}" transform="rotate(-14 ${px} ${py})"/>`;
  const rings = ring("#f5d9b0", 14, 360, 0.55) + ring("#c79a7a", 6, 395, 0.45) + ring("#fff2dc", 2, 330, 0.6);
  const body = `
    <rect width="${W}" height="${H}" fill="url(#void)"/>
    <rect width="${W}" height="${H}" filter="url(#neb)" mask="url(#m1)"/>
    <rect width="${W}" height="${H}" filter="url(#neb2)" mask="url(#m2)" opacity=".8"/>
    ${stars}${spikes}
    <circle cx="${px}" cy="${py}" r="${pr + 60}" fill="url(#glowP)"/>
    ${rings}
    <circle cx="${px}" cy="${py}" r="${pr}" fill="url(#planet)"/>
    <circle cx="${px}" cy="${py}" r="${pr}" fill="url(#bands)" transform="rotate(-14 ${px} ${py})"/>
    <g clip-path="url(#ringFront)">${rings}</g>
    <circle cx="260" cy="170" r="46" fill="url(#moon)"/>
    <circle cx="246" cy="160" r="8" fill="#000" opacity=".15"/><circle cx="276" cy="186" r="5" fill="#000" opacity=".15"/>`;
  return svgDoc(body, defs);
}

// ── Jungle ───────────────────────────────────────────────────────────────────

/** Rainforest seen from the floor: layered foliage, hanging vines, sun shafts. */
export function jungleCanopy(): string {
  const rand = rng(2010);
  const defs = `
    <radialGradient id="sky" cx=".55" cy=".15" r=".9"><stop offset="0" stop-color="#e9ffb8"/><stop offset=".25" stop-color="#7fbf4a"/><stop offset=".6" stop-color="#1f5a2a"/><stop offset="1" stop-color="#05170c"/></radialGradient>
    <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbd6" stop-opacity=".55"/><stop offset="1" stop-color="#fffbd6" stop-opacity="0"/></linearGradient>
    <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeec0" stop-opacity="0"/><stop offset=".5" stop-color="#cfeec0" stop-opacity=".22"/><stop offset="1" stop-color="#cfeec0" stop-opacity="0"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="softer"><feGaussianBlur stdDeviation="7"/></filter>`;
  const shafts = Array.from({ length: 6 }, (_, i) => {
    const x = 520 + i * 120 + rand() * 60;
    const spread = 160 + rand() * 120;
    return `<polygon points="${f(x)},0 ${f(x + 40)},0 ${f(x + spread + 120)},${H} ${f(x + spread - 60)},${H}" fill="url(#shaft)" opacity="${(0.35 + rand() * 0.4).toFixed(2)}"/>`;
  }).join("");
  // Three depths of foliage: far (blurry, pale), mid, near (dark, crisp).
  const layer = (colors: string[], clumps: number, scale: number) => {
    let out = "";
    for (let i = 0; i < clumps; i++) {
      const fill = colors[Math.floor(rand() * colors.length)] ?? colors[0]!;
      const edge = rand();
      if (edge < 0.4) {
        // Hanging from the canopy.
        out += frond(rand, rand() * W, -20, 180 * scale, 30, 150, 7, fill);
      } else if (edge < 0.8) {
        // Growing up from the floor.
        out += frond(rand, rand() * W, H + 20, 220 * scale, -160, -20, 8, fill);
      } else {
        // Reaching in from a side.
        const left = rand() < 0.5;
        out += frond(rand, left ? -20 : W + 20, 200 + rand() * 600, 200 * scale, left ? -50 : 130, left ? 50 : 230, 6, fill);
      }
    }
    return out;
  };
  const vines = Array.from({ length: 9 }, () => {
    const x = rand() * W;
    const len = 250 + rand() * 450;
    const sway = (rand() - 0.5) * 120;
    let leaves = "";
    for (let t = 0.15; t < 1; t += 0.09) {
      const vx = x + sway * Math.sin(t * Math.PI) * t;
      leaves += leaf(vx, t * len, 22 + rand() * 12, rand() < 0.5 ? 30 + rand() * 30 : 120 + rand() * 30, "#123d1c");
    }
    return `<path d="M${f(x)} 0 Q${f(x + sway)} ${f(len / 2)} ${f(x + sway * 0.5)} ${f(len)}" stroke="#0e2f16" stroke-width="3" fill="none"/>${leaves}`;
  }).join("");
  const body = `
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <g filter="url(#softer)" opacity=".7">${layer(["#4f8f3c", "#5d9a45", "#3f7a35"], 14, 1.1)}</g>
    ${shafts}
    <rect y="${H * 0.45}" width="${W}" height="${H * 0.4}" fill="url(#mist)"/>
    <g filter="url(#soft)">${layer(["#225c2a", "#2b6b30", "#1b4d24"], 16, 1.3)}</g>
    ${vines}
    ${layer(["#08200f", "#0b2a13", "#0f3318"], 18, 1.6)}`;
  return svgDoc(body, defs);
}

// ── Beach ────────────────────────────────────────────────────────────────────

/** Tropical midday: bright sky, turquoise sea, sand, a leaning palm. */
export function tropicalBeach(): string {
  const rand = rng(1776);
  const horizon = 560;
  const shore = 780;
  const defs = `
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fb7ee"/><stop offset=".6" stop-color="#a6e3fb"/><stop offset="1" stop-color="#fff1d6"/></linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d7fb0"/><stop offset=".55" stop-color="#18b6c8"/><stop offset="1" stop-color="#7fe8da"/></linearGradient>
    <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e3b5"/><stop offset="1" stop-color="#e6c48a"/></linearGradient>
    <radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe8"/><stop offset=".25" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffe27a" stop-opacity=".45"/><stop offset="1" stop-color="#ffe27a" stop-opacity="0"/></radialGradient>
    <linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b4a2b"/><stop offset=".5" stop-color="#9b7448"/><stop offset="1" stop-color="#5b3d22"/></linearGradient>`;
  const cloud = (x: number, y: number, s: number) =>
    `<g fill="#fff" opacity=".92">${[[0, 0, 60], [55, -22, 48], [105, 2, 52], [40, 18, 50], [-45, 14, 40]]
      .map(([dx, dy, r]) => `<circle cx="${f(x + dx! * s)}" cy="${f(y + dy! * s)}" r="${f(r! * s)}"/>`).join("")}</g>`;
  const glints = Array.from({ length: 70 }, () => {
    const y = horizon + 8 + rand() * (shore - horizon - 30);
    const x = rand() * W;
    const l = 8 + ((y - horizon) / (shore - horizon)) * 40;
    return `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + l)}" y2="${f(y)}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="${(0.3 + rand() * 0.5).toFixed(2)}"/>`;
  }).join("");
  let foam = `M0 ${shore}`;
  for (let x = 0; x <= W; x += 40) foam += ` Q${x + 20} ${f(shore - 14 - rand() * 10)} ${x + 40} ${shore}`;
  const grains = Array.from({ length: 260 }, () =>
    `<circle cx="${f(rand() * W)}" cy="${f(shore + 20 + rand() * (H - shore))}" r="${(0.8 + rand() * 1.4).toFixed(1)}" fill="#c9a36a" opacity=".45"/>`,
  ).join("");
  const gulls = Array.from({ length: 4 }, (_, i) => {
    const x = 480 + i * 90 + rand() * 60;
    const y = 160 + rand() * 120;
    const s = 10 + rand() * 8;
    return `<path d="M${f(x - s)} ${f(y)} q${f(s / 2)} ${f(-s / 2)} ${f(s)} 0 q${f(s / 2)} ${f(-s / 2)} ${f(s)} 0" stroke="#33506a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }).join("");
  // Leaning palm: curved trunk + drooping fronds + coconuts.
  const tx = 170;
  const ty = 250;
  const trunk = `<path d="M110 ${H} C150 760 120 470 ${tx} ${ty} L${tx + 26} ${ty + 8} C150 470 190 760 170 ${H} Z" fill="url(#trunk)"/>`;
  const rings = Array.from({ length: 16 }, (_, i) => {
    const y = ty + 40 + i * 44;
    return `<path d="M${f(130 + i * -1.2)} ${y} q22 6 40 0" stroke="#4a321c" stroke-width="2" fill="none" opacity=".55"/>`;
  }).join("");
  const fronds = [-170, -140, -110, -60, -30, 0, 25, 160]
    .map((a) => leaf(tx + 12, ty, 230 + rand() * 60, a + 10, "#1f7a3a", 0.16) + leaf(tx + 12, ty, 200, a + 18, "#2e9a4a", 0.09))
    .join("");
  const coconuts = `<circle cx="${tx + 4}" cy="${ty + 18}" r="13" fill="#5b3d22"/><circle cx="${tx + 26}" cy="${ty + 20}" r="12" fill="#6b4a2b"/>`;
  const body = `
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <circle cx="1280" cy="170" r="210" fill="url(#sun)"/>
    ${cloud(380, 150, 0.9)}${cloud(980, 250, 0.7)}${cloud(1450, 380, 0.55)}
    ${gulls}
    <path d="M0 ${horizon} C300 ${horizon - 30} 520 ${horizon - 40} 760 ${horizon} Z" fill="#3c8f6a" opacity=".6"/>
    <rect y="${horizon}" width="${W}" height="${shore - horizon + 10}" fill="url(#sea)"/>
    ${glints}
    <rect y="${shore}" width="${W}" height="${H - shore}" fill="url(#sand)"/>
    <path d="${foam} L${W} ${shore + 18} L0 ${shore + 18} Z" fill="#ffffff" opacity=".85"/>
    ${grains}
    ${trunk}${rings}${fronds}${coconuts}`;
  return svgDoc(body, defs);
}

// ── Small repeating tiles ────────────────────────────────────────────────────

const tile = (w: number, h: number, body: string, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;

/** A vine with hanging leaves; repeats seamlessly along x. */
export function vineGarland(): string {
  const rand = rng(77);
  const curveY = (x: number) => 5 + 4 * Math.sin((x / 160) * Math.PI * 2);
  let leaves = "";
  for (let x = 8; x < 156; x += 15) {
    const fill = ["#2e7d32", "#3f9a3a", "#5cb84a", "#1f5f27"][Math.floor(rand() * 4)]!;
    leaves += leaf(x, curveY(x), 13 + rand() * 11, 55 + rand() * 70, fill, 0.32);
  }
  const vine = `<path d="M0 5 Q40 13 80 5 T160 5" stroke="#24521f" stroke-width="2.5" fill="none"/>`;
  return tile(160, 34, vine + leaves);
}

/** One foamy wave crest; repeats along x. */
export function waveCrest(): string {
  const back = `<path d="M0 22 Q60 6 120 22 T240 22 V48 H0Z" fill="#ffffff" opacity=".35"/>`;
  const front = `<path d="M0 30 Q60 16 120 30 T240 30 V48 H0Z" fill="#e8fbff" opacity=".55"/>`;
  return tile(240, 48, back + front);
}
