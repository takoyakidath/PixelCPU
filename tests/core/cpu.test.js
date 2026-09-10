import { describe, it, expect, beforeEach } from "vitest";
import { CPU } from "../../src/core/cpu.js";

const REG = { A: 0, B: 1, C: 2, D: 3 };

const OP = {
  NOP: 0x00,
  HLT: 0x01,
  MOV_RR: 0x10,
  MOV_RI: 0x11,
  LOAD: 0x12,
  STORE: 0x13,
  ADD: 0x20,
  SUB: 0x21,
  INC: 0x22,
  DEC: 0x23,
  AND: 0x30,
  OR: 0x31,
  XOR: 0x32,
  NOT: 0x33,
  CMP: 0x40,
  JMP: 0x50,
  JZ: 0x51,
  JNZ: 0x52,
  JC: 0x53,
  PUSH: 0x60,
  POP: 0x61,
  CALL: 0x62,
  RET: 0x63,
};

function rr(dst, src) {
  return (dst << 6) | (src << 4);
}

function r(reg) {
  return reg & 0b11;
}

let cpu;
beforeEach(() => {
  cpu = new CPU();
});

function runToHalt(maxTicks = 1000) {
  let ticks = 0;
  while (!cpu.halted && ticks < maxTicks) {
    cpu.clock();
    ticks++;
  }
  if (ticks >= maxTicks) throw new Error("runToHalt exceeded maxTicks (infinite loop?)");
}

describe("CPU instruction semantics", () => {
  it("MOV reg, imm loads an immediate", () => {
    cpu.loadProgram([OP.MOV_RI, r(REG.A), 42, OP.HLT]);
    runToHalt();
    expect(cpu.registers.A).toBe(42);
  });

  it("MOV reg, reg copies a value", () => {
    cpu.loadProgram([OP.MOV_RI, r(REG.A), 7, OP.MOV_RR, rr(REG.B, REG.A), OP.HLT]);
    runToHalt();
    expect(cpu.registers.B).toBe(7);
  });

  it("LOAD/STORE round-trip through RAM", () => {
    cpu.loadProgram([
      OP.MOV_RI, r(REG.A), 99,
      OP.STORE, r(REG.A), 0x50,
      OP.MOV_RI, r(REG.B), 0,
      OP.LOAD, r(REG.B), 0x50,
      OP.HLT,
    ]);
    runToHalt();
    expect(cpu.memory.read(0x50)).toBe(99);
    expect(cpu.registers.B).toBe(99);
  });

  it("ADD sets register and flags", () => {
    cpu.loadProgram([
      OP.MOV_RI, r(REG.A), 5,
      OP.MOV_RI, r(REG.B), 3,
      OP.ADD, rr(REG.A, REG.B),
      OP.HLT,
    ]);
    runToHalt();
    expect(cpu.registers.A).toBe(8);
    expect(cpu.flags.Z).toBe(0);
  });

  it("SUB to zero sets Z flag", () => {
    cpu.loadProgram([
      OP.MOV_RI, r(REG.A), 5,
      OP.MOV_RI, r(REG.B), 5,
      OP.SUB, rr(REG.A, REG.B),
      OP.HLT,
    ]);
    runToHalt();
    expect(cpu.registers.A).toBe(0);
    expect(cpu.flags.Z).toBe(1);
  });

  it("INC/DEC modify a single register", () => {
    cpu.loadProgram([OP.MOV_RI, r(REG.A), 9, OP.INC, r(REG.A), OP.DEC, r(REG.A), OP.DEC, r(REG.A), OP.HLT]);
    runToHalt();
    expect(cpu.registers.A).toBe(8);
  });

  it("AND/OR/XOR/NOT compute bitwise results", () => {
    cpu.loadProgram([
      OP.MOV_RI, r(REG.A), 0b1100,
      OP.MOV_RI, r(REG.B), 0b1010,
      OP.XOR, rr(REG.A, REG.B),
      OP.NOT, r(REG.A),
      OP.HLT,
    ]);
    runToHalt();
    expect(cpu.registers.A).toBe((~0b0110) & 0xff);
  });

  it("CMP does not modify the destination register", () => {
    cpu.loadProgram([
      OP.MOV_RI, r(REG.A), 5,
      OP.MOV_RI, r(REG.B), 5,
      OP.CMP, rr(REG.A, REG.B),
      OP.HLT,
    ]);
    runToHalt();
    expect(cpu.registers.A).toBe(5);
    expect(cpu.flags.Z).toBe(1);
  });

  it("JMP unconditionally changes PC", () => {
    // 0-1: JMP 5
    // 2-4: MOV A, 111   (skipped)
    // 5-7: MOV B, 222   (target)
    // 8:   HLT
    cpu.loadProgram([
      OP.JMP, 5,
      OP.MOV_RI, r(REG.A), 111,
      OP.MOV_RI, r(REG.B), 222,
      OP.HLT,
    ]);
    runToHalt();
    expect(cpu.registers.A).toBe(0);
    expect(cpu.registers.B).toBe(222);
  });

  it("JZ branches only when Z is set", () => {
    // 0-2:   MOV A, 5
    // 3-5:   MOV B, 5
    // 6-7:   CMP A, B     (Z=1)
    // 8-9:   JZ 14
    // 10-12: MOV C, 1     (skipped)
    // 13:    HLT
    // 14-16: MOV C, 2     (target)
    // 17:    HLT
    cpu.loadProgram([
      OP.MOV_RI, r(REG.A), 5,
      OP.MOV_RI, r(REG.B), 5,
      OP.CMP, rr(REG.A, REG.B),
      OP.JZ, 14,
      OP.MOV_RI, r(REG.C), 1,
      OP.HLT,
      OP.MOV_RI, r(REG.C), 2,
      OP.HLT,
    ]);
    runToHalt();
    expect(cpu.registers.C).toBe(2);
  });

  it("loop with JNZ counts down to zero", () => {
    // A = 3; loop: DEC A; JNZ loop; HLT
    cpu.loadProgram([
      OP.MOV_RI, r(REG.A), 3,
      OP.DEC, r(REG.A), // addr 3
      OP.JNZ, 3,
      OP.HLT,
    ]);
    runToHalt();
    expect(cpu.registers.A).toBe(0);
  });

  it("PUSH/POP round-trip through the stack", () => {
    cpu.loadProgram([
      OP.MOV_RI, r(REG.A), 77,
      OP.PUSH, r(REG.A),
      OP.MOV_RI, r(REG.A), 0,
      OP.POP, r(REG.A),
      OP.HLT,
    ]);
    const spBefore = cpu.registers.SP;
    runToHalt();
    expect(cpu.registers.A).toBe(77);
    expect(cpu.registers.SP).toBe(spBefore);
  });

  it("CALL/RET returns to the instruction after CALL", () => {
    // 0: CALL 6
    // 2: MOV B, 9   (runs after return)
    // 5: HLT
    // 6: MOV A, 1   (subroutine)
    // 9: RET
    cpu.loadProgram([
      OP.CALL, 6, // 0,1
      OP.MOV_RI, r(REG.B), 9, // 2,3,4
      OP.HLT, // 5
      OP.MOV_RI, r(REG.A), 1, // 6,7,8
      OP.RET, // 9
    ]);
    runToHalt();
    expect(cpu.registers.A).toBe(1);
    expect(cpu.registers.B).toBe(9);
  });

  it("HLT stops the clock", () => {
    cpu.loadProgram([OP.HLT, OP.MOV_RI, r(REG.A), 1]);
    cpu.clock(); // fetch T1
    cpu.clock(); // fetch T2
    cpu.clock(); // decode
    cpu.clock(); // execute HLT
    expect(cpu.halted).toBe(true);
    const before = cpu.registers.A;
    cpu.clock();
    expect(cpu.registers.A).toBe(before);
  });
});

describe("CPU clock granularity", () => {
  it("clock() advances exactly one T-state at a time", () => {
    cpu.loadProgram([OP.NOP, OP.HLT]);
    expect(cpu.isAtInstructionBoundary()).toBe(true);
    cpu.clock(); // fetch T1
    expect(cpu.isAtInstructionBoundary()).toBe(false);
    cpu.clock(); // fetch T2
    cpu.clock(); // decode
    cpu.clock(); // execute NOP (yields the nop event)
    expect(cpu.isAtInstructionBoundary()).toBe(false);
    cpu.clock(); // generator completion tick -> boundary reached
    expect(cpu.isAtInstructionBoundary()).toBe(true);
    expect(cpu.registers.PC).toBe(1);
  });

  it("step() runs exactly one instruction and stops at the boundary", () => {
    cpu.loadProgram([OP.MOV_RI, r(REG.A), 5, OP.HLT]);
    cpu.step();
    expect(cpu.registers.A).toBe(5);
    expect(cpu.isAtInstructionBoundary()).toBe(true);
    expect(cpu.halted).toBe(false);
  });

  it("emits bus-transfer events during fetch", () => {
    cpu.loadProgram([OP.HLT]);
    const events = cpu.clock();
    expect(events.some((e) => e.type === "bus-transfer" && e.bus === "address")).toBe(true);
  });
});
