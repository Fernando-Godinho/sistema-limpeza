import { deflateSync } from "node:zlib";

/**
 * Gera uma imagem PNG simples e valida, sem depender de bibliotecas externas.
 * Serve apenas para os dados de exemplo, para que a tela do servico tenha
 * fotos de verdade para mostrar.
 */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

export type Rgb = [number, number, number];

/**
 * Desenha uma imagem com duas faixas de cor e uma diagonal clara, para que
 * facilmente se perceba que sao imagens diferentes.
 */
export function samplePng(width: number, height: number, top: Rgb, bottom: Rgb): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1);
    raw[rowStart] = 0; // filtro "none"
    for (let x = 0; x < width; x += 1) {
      const diagonal = Math.abs(Math.round((x / width) * height) - y) < height * 0.04;
      const base = y < height / 2 ? top : bottom;
      const color: Rgb = diagonal
        ? [Math.min(255, base[0] + 70), Math.min(255, base[1] + 70), Math.min(255, base[2] + 70)]
        : base;
      const offset = rowStart + 1 + x * 3;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // profundidade de bits
  header[9] = 2; // cor RGB
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
