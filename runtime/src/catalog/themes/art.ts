// Procedural SVG backdrops for signature themes. Spotify's CSP blocks external
// images but allows data: URIs, so scenes are generated here (deterministically,
// via a seeded PRNG) instead of being downloaded.

/** Seeded PRNG (mulberry32) so a scene looks identical on every launch. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1600;
const H = 1000;

export function svgUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function svgDoc(body: string, defs = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><defs>${defs}</defs>${body}</svg>`;
}

interface SkylineLayer {
  color: string;
  minH: number;
  maxH: number;
  minW: number;
  maxW: number;
  windowChance: number;
  windowOpacity: number;
  signs: number;
}

const NEON = ["#00f0ff", "#ff2a6d", "#fcee0a", "#b967ff"];

function skyline(rand: () => number, layer: SkylineLayer): string {
  let out = "";
  let x = -20;
  while (x < W) {
    const w = layer.minW + rand() * (layer.maxW - layer.minW);
    const h = layer.minH + rand() * (layer.maxH - layer.minH);
    const top = H - h;
    out += `<rect x="${x.toFixed(0)}" y="${top.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${layer.color}"/>`;
    // Antenna with a blinking-red tip on some towers.
    if (rand() < 0.25) {
      const ax = x + w * (0.3 + rand() * 0.4);
      out += `<line x1="${ax.toFixed(0)}" y1="${top}" x2="${ax.toFixed(0)}" y2="${(top - 40 - rand() * 50).toFixed(0)}" stroke="${layer.color}" stroke-width="3"/>`;
    }
    // Lit windows in a loose grid.
    for (let wy = top + 14; wy < H - 10; wy += 18) {
      for (let wx = x + 8; wx < x + w - 10; wx += 14) {
        if (rand() > layer.windowChance) continue;
        const c = NEON[Math.floor(rand() * NEON.length)];
        out += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="6" height="9" fill="${c}" opacity="${(layer.windowOpacity * (0.4 + rand() * 0.6)).toFixed(2)}"/>`;
      }
    }
    x += w + rand() * 6;
  }
  // Vertical neon signs glowing on the nearest layer.
  for (let i = 0; i < layer.signs; i++) {
    const sx = rand() * W;
    const sy = H - layer.minH - rand() * (layer.maxH - layer.minH) * 0.6;
    const c = NEON[i % NEON.length];
    out += `<rect x="${sx.toFixed(0)}" y="${sy.toFixed(0)}" width="16" height="${(70 + rand() * 90).toFixed(0)}" rx="3" fill="none" stroke="${c}" stroke-width="3" filter="url(#glow)"/>`;
  }
  return out;
}

/** Night city skyline under a magenta haze with a striped neon sun. */
export function cyberCity(): string {
  const rand = rng(2077);
  const defs = `
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#03000a"/><stop offset=".45" stop-color="#14032b"/>
      <stop offset=".75" stop-color="#3d0a4f"/><stop offset="1" stop-color="#ff2a6d"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fcee0a"/><stop offset="1" stop-color="#ff2a6d"/>
    </linearGradient>
    <mask id="stripes"><rect width="${W}" height="${H}" fill="#fff"/>
      ${Array.from({ length: 9 }, (_, i) => `<rect x="0" y="${470 + i * 26}" width="${W}" height="${4 + i * 1.6}" fill="#000"/>`).join("")}
    </mask>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="haze" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#ff2a6d" stop-opacity=".45"/><stop offset="1" stop-color="#ff2a6d" stop-opacity="0"/></radialGradient>`;
  const stars = Array.from({ length: 90 }, () =>
    `<circle cx="${(rand() * W).toFixed(0)}" cy="${(rand() * 420).toFixed(0)}" r="${(rand() * 1.4 + 0.3).toFixed(1)}" fill="#fff" opacity="${(rand() * 0.7).toFixed(2)}"/>`,
  ).join("");
  const body = `
    <rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}
    <circle cx="1120" cy="560" r="230" fill="url(#sun)" mask="url(#stripes)" opacity=".85"/>
    <circle cx="1120" cy="560" r="252" fill="none" stroke="#00f0ff" stroke-width="2" opacity=".55" filter="url(#glow)"/>
    <rect width="${W}" height="${H}" fill="url(#haze)"/>
    ${skyline(rand, { color: "#2a0d4a", minH: 260, maxH: 520, minW: 50, maxW: 110, windowChance: 0.1, windowOpacity: 0.35, signs: 0 })}
    ${skyline(rand, { color: "#16062b", minH: 200, maxH: 430, minW: 60, maxW: 140, windowChance: 0.16, windowOpacity: 0.6, signs: 3 })}
    ${skyline(rand, { color: "#07010f", minH: 120, maxH: 330, minW: 80, maxW: 180, windowChance: 0.2, windowOpacity: 0.9, signs: 5 })}`;
  return svgDoc(body, defs);
}

/** Outrun sunset: striped sun, layered mountains, starfield. */
export function synthSunset(): string {
  const rand = rng(1984);
  const horizon = 640;
  const defs = `
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b0221"/><stop offset=".5" stop-color="#2d0b55"/>
      <stop offset=".85" stop-color="#8a1f8f"/><stop offset="1" stop-color="#ff6ad5"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd319"/><stop offset=".55" stop-color="#ff7b39"/><stop offset="1" stop-color="#ff2975"/>
    </linearGradient>
    <mask id="cut"><rect width="${W}" height="${H}" fill="#fff"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="0" y="${470 + i * 22}" width="${W}" height="${3 + i * 2}" fill="#000"/>`).join("")}
    </mask>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0433"/><stop offset="1" stop-color="#05010d"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="18"/></filter>`;
  const stars = Array.from({ length: 140 }, () =>
    `<circle cx="${(rand() * W).toFixed(0)}" cy="${(rand() * (horizon - 220)).toFixed(0)}" r="${(rand() * 1.5 + 0.3).toFixed(1)}" fill="#fff" opacity="${(rand() * 0.8).toFixed(2)}"/>`,
  ).join("");
  const ridge = (base: number, amp: number, step: number, seedShift: number) => {
    let d = `M0 ${horizon}`;
    for (let x = 0; x <= W; x += step) d += ` L${x} ${(base - rand() * amp - seedShift).toFixed(0)}`;
    return `${d} L${W} ${horizon} Z`;
  };
  // Perspective grid floor drawn in the SVG; the theme animates a second grid over it.
  const vLines = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return `<line x1="${(W / 2 + (t - 0.5) * 300).toFixed(0)}" y1="${horizon}" x2="${(W / 2 + (t - 0.5) * 5200).toFixed(0)}" y2="${H}" stroke="#ff6ad5" stroke-width="1.5" opacity=".55"/>`;
  }).join("");
  const hLines = Array.from({ length: 12 }, (_, i) => {
    const y = horizon + (H - horizon) * Math.pow(i / 11, 2.2);
    return `<line x1="0" y1="${y.toFixed(0)}" x2="${W}" y2="${y.toFixed(0)}" stroke="#ff6ad5" stroke-width="1.5" opacity=".55"/>`;
  }).join("");
  const body = `
    <rect width="${W}" height="${H}" fill="url(#sky)"/>${stars}
    <circle cx="${W / 2}" cy="520" r="250" fill="#ff2975" opacity=".45" filter="url(#glow)"/>
    <circle cx="${W / 2}" cy="520" r="230" fill="url(#sun)" mask="url(#cut)"/>
    <path d="${ridge(horizon - 60, 170, 80, 0)}" fill="#3a0d5e" stroke="#ff6ad5" stroke-width="2" stroke-opacity=".5"/>
    <path d="${ridge(horizon - 10, 110, 60, 0)}" fill="#1d0638" stroke="#00f0ff" stroke-width="2" stroke-opacity=".45"/>
    <rect y="${horizon}" width="${W}" height="${H - horizon}" fill="url(#floor)"/>
    ${vLines}${hLines}
    <line x1="0" y1="${horizon}" x2="${W}" y2="${horizon}" stroke="#ff6ad5" stroke-width="3"/>`;
  return svgDoc(body, defs);
}

/** Faint columns of green glyphs, like a terminal mid-dump. */
export function terminalRain(): string {
  const rand = rng(1337);
  const glyphs = "01アイウエオカキクケコｱｲｳ$#%&*+=<>/\\|";
  let cols = "";
  for (let x = 10; x < W; x += 26) {
    const len = 6 + Math.floor(rand() * 22);
    const start = Math.floor(rand() * 30) * 22;
    for (let i = 0; i < len; i++) {
      const y = start + i * 22;
      if (y > H) break;
      const ch = glyphs[Math.floor(rand() * glyphs.length)] ?? "0";
      const op = (i === len - 1 ? 0.9 : 0.08 + (i / len) * 0.35).toFixed(2);
      cols += `<text x="${x}" y="${y}" fill="${i === len - 1 ? "#b6ffbe" : "#2bff4f"}" opacity="${op}">${ch.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")}</text>`;
    }
  }
  const body = `<rect width="${W}" height="${H}" fill="#010401"/><g font-family="Menlo, monospace" font-size="18">${cols}</g>`;
  return svgDoc(body);
}
