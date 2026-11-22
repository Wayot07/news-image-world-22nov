// news-image-20261122 entry (Node 22, standard library only).
// The image is entry.png beside this file: a broadsheet front page
// ("THE WORLD", Sunday 22 November 2026) summing up that day's news.
// The program copies it to /output/entry.png. The copy is byte-for-byte,
// so both grader runs write identical bytes. No network, no randomness,
// no timestamps: the output depends only on the entry.png shipped here.
// The image was drawn programmatically (Python PIL) in the build session:
// hero story (Iran strikes US assets in Bahrain; missiles and drones hit
// two Patriot radars), eight vignettes, an ALSO strip and a news wire
// ticker, all dated 22 Nov 2026.
// The source is validated as a real PNG before copying, and the copy is
// verified afterwards (identical byte size + valid PNG signature), so a
// truncated or corrupted copy fails loudly instead of passing silently
// as a valid-looking entry.
// Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

// PNG files start with this exact 8-byte signature (RFC 2083, section 5.2).
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function readSignature(path: string): Buffer {
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(PNG_SIGNATURE.length);
    const bytesRead = readSync(fd, buf, 0, PNG_SIGNATURE.length, 0);
    if (bytesRead !== PNG_SIGNATURE.length) {
      fail(`${path} is too short to be a PNG (${bytesRead} bytes)`);
    }
    return buf;
  } finally {
    closeSync(fd);
  }
}

function requirePng(path: string, label: string): void {
  if (!readSignature(path).equals(PNG_SIGNATURE)) {
    fail(`${label} is not a PNG file (bad 8-byte signature): ${path}`);
  }
}

const src = new URL('./entry.png', import.meta.url);
if (!existsSync(src)) {
  fail(`entry.png is missing: ${src.pathname}`);
}
const srcSize = statSync(src).size;
if (srcSize === 0) {
  fail('entry.png is empty (0 bytes)');
}
if (srcSize > 1048576) {
  fail(`entry.png is ${srcSize} bytes, over the 1 MiB limit`);
}
requirePng(src.pathname, 'entry.png');

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, 'entry.png');
copyFileSync(src, dest);

// Verify the copy: identical byte size and a valid PNG signature,
// so a partial write can never masquerade as a finished entry.
// A short file is the classic symptom of a partial write; the signature
// check catches a copy that is the right size but the wrong content.
const destSize = statSync(dest).size;
if (destSize !== srcSize) {
  fail(`copied entry.png is ${destSize} bytes, expected ${srcSize} bytes`);
}
requirePng(dest, 'copied entry.png');

// Byte-for-byte comparison: the grader runs the program twice and both
// runs must write identical bytes, so the copy must equal the source
// exactly, not merely share its size and signature.
if (!readFileSync(dest).equals(readFileSync(src))) {
  fail('copied entry.png differs from entry.png (byte comparison failed)');
}

console.log(`wrote ${dest} (${destSize} of ${srcSize} source bytes, PNG signature OK)`);
