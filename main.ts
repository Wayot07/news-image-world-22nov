import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PNG_IEND_TRAILER = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const MAX_SOURCE_BYTES = 1024 * 1024;
const SOURCE_FILE = "entry.png";
const TARGET_DIR = "/output";
const TARGET_FILE = "entry.png";

function abort(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function startsWithPngSignature(data: Buffer): boolean {
  if (data.length < PNG_SIGNATURE.length) {
    return false;
  }
  return data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function endsWithPngTrailer(data: Buffer): boolean {
  if (data.length < PNG_IEND_TRAILER.length) {
    return false;
  }
  return data
    .subarray(data.length - PNG_IEND_TRAILER.length)
    .equals(PNG_IEND_TRAILER);
}

function copyEntry(): void {
  const sourcePath = join(process.cwd(), SOURCE_FILE);
  const targetPath = join(TARGET_DIR, TARGET_FILE);

  if (!existsSync(sourcePath)) {
    abort(`source file not found: ${sourcePath}`);
  }

  const sourceBytes = readFileSync(sourcePath);

  if (sourceBytes.length === 0) {
    abort(`source file is empty: ${sourcePath}`);
  }
  if (sourceBytes.length > MAX_SOURCE_BYTES) {
    abort(
      `source file too large: ${sourceBytes.length} bytes exceeds limit of ${MAX_SOURCE_BYTES} bytes`,
    );
  }
  if (!startsWithPngSignature(sourceBytes)) {
    abort(`source file is not a PNG image: ${sourcePath}`);
  }
  if (!endsWithPngTrailer(sourceBytes)) {
    abort(`source file is truncated or has no PNG end marker: ${sourcePath}`);
  }

  mkdirSync(TARGET_DIR, { recursive: true });
  writeFileSync(targetPath, sourceBytes);

  const copiedBytes = readFileSync(targetPath);

  if (!startsWithPngSignature(copiedBytes)) {
    abort(`copied file failed PNG signature check: ${targetPath}`);
  }
  if (!endsWithPngTrailer(copiedBytes)) {
    abort(`copied file is truncated or has no PNG end marker: ${targetPath}`);
  }
  if (copiedBytes.length !== sourceBytes.length) {
    abort(
      `copied file size mismatch: ${copiedBytes.length} bytes, expected ${sourceBytes.length} bytes`,
    );
  }
  if (!copiedBytes.equals(sourceBytes)) {
    abort(`copied file bytes differ from source: ${targetPath}`);
  }

  console.log(`copied ${sourceBytes.length} bytes to ${targetPath}`);
}

copyEntry();
