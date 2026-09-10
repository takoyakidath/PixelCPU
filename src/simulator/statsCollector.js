/**
 * Aggregates CPU micro-op events into run statistics: "how much work did
 * the CPU actually do to run this program" (pillar 2 - reuses the same
 * event stream the diagram/explain panel already consume, so this is a
 * cheap additional view rather than a separate subsystem).
 */
export class StatsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalInstructions = 0;
    this.busTransferCount = 0;
    this.busTransferBits = 0;
    this.aluOpCount = 0;
    this.stackOpCount = 0;
    this._perInstruction = new Map();
  }

  handleEvent(event) {
    switch (event.type) {
      case "bus-transfer":
        this.busTransferCount++;
        this.busTransferBits += event.width || 0;
        break;
      case "alu-op":
        this.aluOpCount++;
        break;
      case "stack-op":
        this.stackOpCount++;
        break;
      case "decode":
        this.totalInstructions++;
        this._perInstruction.set(event.mnemonic, (this._perInstruction.get(event.mnemonic) || 0) + 1);
        break;
      default:
        break;
    }
  }

  /**
   * `clockCount` is the CPU's own authoritative tick counter
   * (cpu.getState().clockCount), passed in rather than tracked here,
   * because a single onTick callback can represent many T-states at once
   * (Step Instruction / Run batch multiple clock() calls before
   * reporting), so counting "how many times an event batch arrived"
   * would undercount.
   */
  snapshot(clockCount) {
    return {
      totalClocks: clockCount,
      totalInstructions: this.totalInstructions,
      busTransferCount: this.busTransferCount,
      busTransferBits: this.busTransferBits,
      aluOpCount: this.aluOpCount,
      stackOpCount: this.stackOpCount,
      perInstructionBreakdown: [...this._perInstruction.entries()].map(([mnemonic, count]) => ({
        mnemonic,
        count,
      })),
    };
  }
}
