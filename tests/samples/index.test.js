import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  SAMPLE_SUM_1_TO_10,
  SAMPLE_FIBONACCI,
  SAMPLE_MULTIPLY_BY_ADD,
  SAMPLE_MEMCPY,
  SAMPLE_STACK_SUBROUTINE,
  SAMPLE_BUBBLE_SORT,
} from "../../src/samples/index.js";

// samples/index.js inlines these as plain JS strings (no bundler needed to
// load them at runtime); the .asm files are kept alongside as a readable
// reference. This test guards against the two drifting apart.
const PAIRS = [
  ["01-sum-1-to-10.asm", SAMPLE_SUM_1_TO_10],
  ["02-fibonacci.asm", SAMPLE_FIBONACCI],
  ["03-multiply-by-add.asm", SAMPLE_MULTIPLY_BY_ADD],
  ["04-memcpy.asm", SAMPLE_MEMCPY],
  ["05-stack-subroutine.asm", SAMPLE_STACK_SUBROUTINE],
  ["06-bubble-sort.asm", SAMPLE_BUBBLE_SORT],
];

describe("sample sources stay in sync with their .asm reference files", () => {
  for (const [filename, exported] of PAIRS) {
    it(`${filename} matches its exported string exactly`, async () => {
      const path = fileURLToPath(new URL(`../../src/samples/${filename}`, import.meta.url));
      const fileContent = await readFile(path, "utf-8");
      expect(exported).toBe(fileContent);
    });
  }
});
