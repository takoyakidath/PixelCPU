import { describe, it, expect, beforeEach } from "vitest";
import { StatsCollector } from "../../src/simulator/statsCollector.js";

describe("StatsCollector", () => {
  let stats;
  beforeEach(() => {
    stats = new StatsCollector();
  });

  it("starts at all zeros", () => {
    expect(stats.snapshot(0)).toMatchObject({
      totalClocks: 0,
      totalInstructions: 0,
      busTransferCount: 0,
      busTransferBits: 0,
      aluOpCount: 0,
      stackOpCount: 0,
      perInstructionBreakdown: [],
    });
  });

  it("reports the clock count it is given, not an internal counter", () => {
    // A single onTick batch can represent many CPU T-states at once
    // (Step Instruction runs cpu.step() and reports all its events in one
    // call), so totalClocks must come from the CPU's own authoritative
    // counter rather than "how many times handleEvent-ish calls happened".
    expect(stats.snapshot(1).totalClocks).toBe(1);
    expect(stats.snapshot(8).totalClocks).toBe(8);
  });

  it("counts bus-transfer events and sums their bit width", () => {
    stats.handleEvent({ type: "bus-transfer", width: 8 });
    stats.handleEvent({ type: "bus-transfer", width: 8 });
    const snap = stats.snapshot(0);
    expect(snap.busTransferCount).toBe(2);
    expect(snap.busTransferBits).toBe(16);
  });

  it("counts alu-op and stack-op events", () => {
    stats.handleEvent({ type: "alu-op" });
    stats.handleEvent({ type: "stack-op" });
    stats.handleEvent({ type: "stack-op" });
    const snap = stats.snapshot(0);
    expect(snap.aluOpCount).toBe(1);
    expect(snap.stackOpCount).toBe(2);
  });

  it("counts instructions and builds a per-mnemonic breakdown from decode events", () => {
    stats.handleEvent({ type: "decode", mnemonic: "ADD" });
    stats.handleEvent({ type: "decode", mnemonic: "ADD" });
    stats.handleEvent({ type: "decode", mnemonic: "HLT" });
    const snap = stats.snapshot(0);
    expect(snap.totalInstructions).toBe(3);
    expect(snap.perInstructionBreakdown).toEqual(
      expect.arrayContaining([
        { mnemonic: "ADD", count: 2 },
        { mnemonic: "HLT", count: 1 },
      ]),
    );
  });

  it("reset() clears everything", () => {
    stats.handleEvent({ type: "decode", mnemonic: "NOP" });
    stats.reset();
    expect(stats.snapshot(0).perInstructionBreakdown).toEqual([]);
  });
});
