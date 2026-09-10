import { describe, it, expect } from "vitest";
import { assemble } from "../../src/assembler/assembler.js";
import { AssemblerError } from "../../src/assembler/tokenizer.js";
import { CPU } from "../../src/core/cpu.js";

function runToHalt(cpu, maxTicks = 5000) {
  let ticks = 0;
  while (!cpu.halted && ticks < maxTicks) {
    cpu.clock();
    ticks++;
  }
  if (ticks >= maxTicks) throw new Error("runToHalt exceeded maxTicks (infinite loop?)");
}

describe("assembler", () => {
  it("assembles a simple immediate-load program", () => {
    const { bytes } = assemble("MOV A, 5\nHLT\n");
    expect(Array.from(bytes)).toEqual([0x11, 0, 5, 0x01]);
  });

  it("resolves forward and backward label references", () => {
    const src = `
      MOV A, 3
loop:
      DEC A
      JNZ loop
      HLT
    `;
    const { labels } = assemble(src);
    expect(labels.get("loop")).toBe(3);

    const cpu = new CPU();
    cpu.loadProgram(assemble(src).bytes);
    runToHalt(cpu);
    expect(cpu.registers.A).toBe(0);
  });

  it("builds a source map from instruction address to source line", () => {
    const { sourceMap } = assemble("MOV A, 5\nHLT\n");
    expect(sourceMap).toEqual([
      { address: 0, line: 1 },
      { address: 3, line: 2 },
    ]);
  });

  it("rejects an unknown mnemonic with a line number", () => {
    expect(() => assemble("FOO A, 1\n")).toThrow(AssemblerError);
    try {
      assemble("MOV A, 5\nFOO A, 1\n");
    } catch (e) {
      expect(e.line).toBe(2);
    }
  });

  it("rejects an undefined label", () => {
    expect(() => assemble("JMP nowhere\nHLT\n")).toThrow(/未定義のラベル/);
  });

  it("rejects an out-of-range immediate", () => {
    expect(() => assemble("MOV A, 999\n")).toThrow(AssemblerError);
  });

  it("rejects wrong operand count", () => {
    expect(() => assemble("ADD A\n")).toThrow(AssemblerError);
  });

  it("accepts hex immediates and register-register MOV", () => {
    const { bytes } = assemble("MOV A, 0xFF\nMOV B, A\nHLT\n");
    expect(Array.from(bytes)).toEqual([0x11, 0, 0xff, 0x10, (1 << 6) | (0 << 4), 0x01]);
  });
});

describe("sample programs (integration)", () => {
  it("sum 1 to 10 -> A = 55", async () => {
    const src = await readSample("01-sum-1-to-10.asm");
    const cpu = new CPU();
    cpu.loadProgram(assemble(src).bytes);
    runToHalt(cpu);
    expect(cpu.registers.A).toBe(55);
  });

  it("fibonacci -> first 10 terms in 0xE0..0xE9", async () => {
    const src = await readSample("02-fibonacci.asm");
    const cpu = new CPU();
    cpu.loadProgram(assemble(src).bytes);
    runToHalt(cpu);
    const expected = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34];
    for (let i = 0; i < expected.length; i++) {
      expect(cpu.memory.read(0xe0 + i)).toBe(expected[i]);
    }
  });

  it("multiply by repeated add -> C = 42", async () => {
    const src = await readSample("03-multiply-by-add.asm");
    const cpu = new CPU();
    cpu.loadProgram(assemble(src).bytes);
    runToHalt(cpu);
    expect(cpu.registers.C).toBe(42);
  });

  it("memcpy -> 0xF0..0xF3 matches 0xE0..0xE3", async () => {
    const src = await readSample("04-memcpy.asm");
    const cpu = new CPU();
    cpu.loadProgram(assemble(src).bytes);
    runToHalt(cpu);
    expect([0xf0, 0xf1, 0xf2, 0xf3].map((a) => cpu.memory.read(a))).toEqual([10, 20, 30, 40]);
  });

  it("call/ret subroutine -> A = 12, B = 7", async () => {
    const src = await readSample("05-stack-subroutine.asm");
    const cpu = new CPU();
    cpu.loadProgram(assemble(src).bytes);
    runToHalt(cpu);
    expect(cpu.registers.A).toBe(12);
    expect(cpu.registers.B).toBe(7);
  });

  it("bubble sort -> 0xF0..0xF4 sorted ascending", async () => {
    const src = await readSample("06-bubble-sort.asm");
    const cpu = new CPU();
    cpu.loadProgram(assemble(src).bytes);
    runToHalt(cpu);
    expect([0xf0, 0xf1, 0xf2, 0xf3, 0xf4].map((a) => cpu.memory.read(a))).toEqual([1, 2, 5, 7, 9]);
  });
});

async function readSample(filename) {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const path = fileURLToPath(new URL(`../../src/samples/${filename}`, import.meta.url));
  return readFile(path, "utf-8");
}
