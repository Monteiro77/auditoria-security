// Gera ícones PNG (192 e 512) para o PWA, sem dependências externas.
// Fundo azul institucional (#1e40af) com um "check" branco centralizado.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

// CRC32
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// distância de ponto a segmento
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

function makePNG(size) {
  const bg = [0x1e, 0x40, 0xaf]
  const white = [0xff, 0xff, 0xff]
  // pontos do check (proporcionais)
  const p1 = [0.28 * size, 0.52 * size]
  const p2 = [0.44 * size, 0.68 * size]
  const p3 = [0.74 * size, 0.34 * size]
  const stroke = size * 0.075
  const radius = size * 0.22 // canto arredondado

  const raw = Buffer.alloc((size * 4 + 1) * size)
  let o = 0
  for (let y = 0; y < size; y++) {
    raw[o++] = 0 // filtro none
    for (let x = 0; x < size; x++) {
      // canto arredondado -> alpha
      let a = 255
      const cornerR = radius
      const checkCorner = (cx, cy) => Math.hypot(x - cx, y - cy) > cornerR
      if (x < cornerR && y < cornerR && checkCorner(cornerR, cornerR)) a = 0
      else if (x > size - cornerR && y < cornerR && checkCorner(size - cornerR, cornerR)) a = 0
      else if (x < cornerR && y > size - cornerR && checkCorner(cornerR, size - cornerR)) a = 0
      else if (x > size - cornerR && y > size - cornerR && checkCorner(size - cornerR, size - cornerR)) a = 0

      const d = Math.min(
        distSeg(x, y, p1[0], p1[1], p2[0], p2[1]),
        distSeg(x, y, p2[0], p2[1], p3[0], p3[1]),
      )
      const isCheck = d <= stroke
      const c = isCheck ? white : bg
      raw[o++] = c[0]
      raw[o++] = c[1]
      raw[o++] = c[2]
      raw[o++] = a
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  return png
}

for (const size of [192, 512]) {
  writeFileSync(resolve(outDir, `icon-${size}.png`), makePNG(size))
  console.log(`icon-${size}.png gerado`)
}
