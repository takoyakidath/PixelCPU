import { describe, it, expect, beforeEach } from "vitest";
import { CPU } from "../../src/core/cpu.js";
import { assemble } from "../../src/assembler/assembler.js";
import { ClockController } from "../../src/simulator/clock.js";

function fakeScheduler() {
  let cb = null;
  return {
    scheduler: {
      setInterval: (fn) => {
        cb = fn;
        return 1;
      },
      clearInterval: () => {
        cb = null;
      },
    },
    fire(times = 1) {
      for (let i = 0; i < times; i++) {
        if (!cb) break;
        cb();
      }
    },
    isArmed: () => cb !== null,
  };
}

describe("ClockController", () => {
  let cpu;
  let ticks;

  beforeEach(() => {
    cpu = new CPU();
    ticks = [];
  });

  it("tick() advances exactly one T-state and reports events", () => {
    cpu.loadProgram(assemble("NOP\nHLT\n").bytes);
    const ctrl = new ClockController(cpu, { onTick: (e) => ticks.push(e) });
    ctrl.tick();
    expect(cpu.isAtInstructionBoundary()).toBe(false);
    expect(ticks.length).toBe(1);
  });

  it("stepInstruction() runs a whole instruction and stops at the boundary", () => {
    cpu.loadProgram(assemble("MOV A, 5\nHLT\n").bytes);
    const ctrl = new ClockController(cpu);
    ctrl.stepInstruction();
    expect(cpu.registers.A).toBe(5);
    expect(cpu.isAtInstructionBoundary()).toBe(true);
  });

  it("run()/pause() drive the CPU via the injected scheduler", () => {
    cpu.loadProgram(assemble("MOV A, 5\nHLT\n").bytes);
    const fake = fakeScheduler();
    const ctrl = new ClockController(cpu, { scheduler: fake.scheduler });
    ctrl.run();
    expect(fake.isArmed()).toBe(true);
    fake.fire(50);
    expect(cpu.halted).toBe(true);
    expect(cpu.registers.A).toBe(5);
    // CPU halting should auto-pause the scheduler.
    expect(fake.isArmed()).toBe(false);
  });

  it("pause() stops the scheduler without resetting CPU state", () => {
    cpu.loadProgram(assemble("MOV A, 5\nHLT\n").bytes);
    const fake = fakeScheduler();
    const ctrl = new ClockController(cpu, { scheduler: fake.scheduler });
    ctrl.run();
    fake.fire(1);
    ctrl.pause();
    expect(fake.isArmed()).toBe(false);
    expect(cpu.halted).toBe(false);
  });

  it("breakpoint halts Run at the target instruction boundary", () => {
    const src = `
      MOV A, 0
loop:
      INC A
      JNZ loop
      HLT
    `;
    cpu.loadProgram(assemble(src).bytes);
    const { labels } = assemble(src);
    const fake = fakeScheduler();
    const ctrl = new ClockController(cpu, { scheduler: fake.scheduler });
    ctrl.addBreakpoint(labels.get("loop"));
    ctrl.run();
    fake.fire(200);
    expect(cpu.halted).toBe(false);
    expect(cpu.registers.PC).toBe(labels.get("loop"));
    expect(fake.isArmed()).toBe(false);
  });

  it("reset() pauses and clears CPU state", () => {
    cpu.loadProgram(assemble("MOV A, 5\nHLT\n").bytes);
    const ctrl = new ClockController(cpu);
    ctrl.stepInstruction();
    ctrl.stepInstruction();
    expect(cpu.registers.A).toBe(5);
    ctrl.reset();
    expect(cpu.registers.A).toBe(0);
    expect(cpu.isAtInstructionBoundary()).toBe(true);
  });

  it("setSpeed() restarts a running interval at the new rate", () => {
    cpu.loadProgram(assemble("MOV A, 5\nHLT\n").bytes);
    const fake = fakeScheduler();
    const ctrl = new ClockController(cpu, { scheduler: fake.scheduler });
    ctrl.run();
    ctrl.setSpeed(10);
    expect(ctrl.intervalMs).toBe(10);
    expect(fake.isArmed()).toBe(true);
  });
});
