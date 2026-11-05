/**
 * Génère l'icône CozyDesk (lune étoilée sur dégradé) en PNG et ICO
 * sans dépendance externe : encodage PNG via zlib.
 * Sorties : build/icon.ico, build/icon.png, public/icon.png
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

/** Rend l'icône en RGBA à la taille demandée (suréchantillonnée ×4). */
function render(size) {
  const ss = 4;
  const W = size * ss;
  const px = new Uint8Array(size * size * 4);

  const gradStops = [
    { at: 0.0, c: [124, 96, 250] },
    { at: 0.5, c: [86, 122, 255] },
    { at: 1.0, c: [64, 199, 176] }
  ];
  const gradAt = (t) => {
    for (let i = 1; i < gradStops.length; i++) {
      if (t <= gradStops[i].at) {
        const a = gradStops[i - 1];
        const b = gradStops[i];
        const k = (t - a.at) / (b.at - a.at);
        return [
          a.c[0] + (b.c[0] - a.c[0]) * k,
          a.c[1] + (b.c[1] - a.c[1]) * k,
          a.c[2] + (b.c[2] - a.c[2]) * k
        ];
      }
    }
    return gradStops[gradStops.length - 1].c;
  };

  // repères normalisés
  const R = 0.225; // rayon du carré arrondi
  const moon = { x: 0.46, y: 0.42, r: 0.20 }; // lune
  const bite = { x: 0.60, y: 0.335, r: 0.165 }; // morsure (dégradé)
  const stars = [
    { x: 0.70, y: 0.68, s: 0.030 },
    { x: 0.32, y: 0.68, s: 0.018 },
    { x: 0.42, y: 0.78, s: 0.012 }
  ];

  const sdfRoundRect = (x, y, half, radius) => {
    const qx = Math.abs(x) - (half - radius);
    const qy = Math.abs(y) - (half - radius);
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - radius;
  };
  const sdfCircle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;
  const sdfStar = (x, y, cx, cy, s) => {
    // étoile à 4 branches (losange croisé)
    const dx = Math.abs(x - cx);
    const dy = Math.abs(y - cy);
    const d1 = (dx + dy) / 1.35; // losange
    const d2 = Math.hypot(dx, dy); // cercle
    return Math.min(d1, d2 * 1.9) - s;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let insideSum = 0;
      let outsideSum = 0;
      let colorAcc = [0, 0, 0];

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const pxs = (x + (sx + 0.5) / ss) / size * 2 - 1; // -1..1
          const pys = (y + (sy + 0.5) / ss) / size * 2 - 1;

          const dRect = sdfRoundRect(pxs, pys, 0.92, R);
          const inRect = dRect < 0;
          if (!inRect) {
            outsideSum++;
            continue;
          }
          // couleur du fond : dégradé diagonal
          const t = (pxs + pys + 2) / 4;
          const base = gradAt(t);
          let r = base[0];
          let g = base[1];
          let b = base[2];

          // léger éclaircissement en haut-gauche (reflet)
          const sheen = Math.max(0, (-pxs - pys) / 2) * 0.12;
          r += (255 - r) * sheen;
          g += (255 - g) * sheen;
          b += (255 - b) * sheen;

          const dMoon = sdfCircle(pxs, pys, moon.x, moon.y, moon.r);
          const dBite = sdfCircle(pxs, pys, bite.x, bite.y, bite.r);

          if (dMoon < 0 && dBite >= 0) {
            // lune blanc cassé
            r = 248; g = 249; b = 255;
          }

          for (const star of stars) {
            if (sdfStar(pxs, pys, star.x, star.y, star.s) < 0) {
              r = 255; g = 255; b = 255;
            }
          }

          colorAcc[0] += r;
          colorAcc[1] += g;
          colorAcc[2] += b;
          insideSum++;
        }
      }

      if (insideSum === 0) {
        px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 0;
      } else {
        const n = insideSum + outsideSum;
        const alpha = insideSum / n;
        px[i] = Math.round(colorAcc[0] / insideSum);
        px[i + 1] = Math.round(colorAcc[1] / insideSum);
        px[i + 2] = Math.round(colorAcc[2] / insideSum);
        px[i + 3] = Math.round(alpha * 255);
      }
    }
  }
  return px;
}

/** Encode un buffer RGBA en PNG. */
function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtre aucun
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profondeur bit
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** ICO multi-tailles (PNG embarqués, format valide Windows Vista+). */
function buildIco(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type icône
  header.writeUInt16LE(count, 4);

  const entries = [];
  const datas = [];
  let offset = 6 + count * 16;
  for (const { size, png } of pngs) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4); // plans
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    datas.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...datas]);
}

const outDir = 'build';
const pubDir = 'public';
mkdirSync(outDir, { recursive: true });
mkdirSync(pubDir, { recursive: true });

const pngBySize = new Map();
for (const size of SIZES) {
  const rgba = render(size);
  const png = encodePng(size, rgba);
  pngBySize.set(size, png);
  if (size === 256 || size === 512) {
    writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  }
}

writeFileSync(path.join(outDir, 'icon.png'), pngBySize.get(256));
writeFileSync(path.join(pubDir, 'icon.png'), pngBySize.get(256));
writeFileSync(
  path.join(outDir, 'icon.ico'),
  buildIco([16, 24, 32, 48, 64, 128, 256].map((s) => ({ size: s, png: pngBySize.get(s) })))
);
console.log('Icônes générées : build/icon.ico, build/icon.png, public/icon.png');
