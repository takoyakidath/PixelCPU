import { Registers } from "./registers.js";
import { Memory } from "./memory.js";
import { INSTRUCTIONS, FORMAT_OPERAND_BYTES } from "./instructionSet.js";

/**
 * Pure state machine, no UI/DOM knowledge. clock() advances exactly one
 * T-state and returns the events that occurred during it.
 */
export class CPU {
  constructor() {
    this.registers = new Registers();
    this.memory = new Memory();
    this.flags = { Z: 0, C: 0, N: 0 };
    this.halted = false;
    this.clockCount = 0;
    this._gen = null;
  }

  reset() {
    this.registers.reset();
    this.memory.reset();
    this.flags = { Z: 0, C: 0, N: 0 };
    this.halted = false;
    this.clockCount = 0;
    this._gen = null;
  }

  loadProgram(bytes, offset = 0) {
    this.memory.loadProgram(bytes, offset);
  }

  /** True at the boundary between instructions (no cycle in progress). */
  isAtInstructionBoundary() {
    return this._gen === null;
  }

  /**
   * Advance one clock T-state and return the events that occurred.
   *
   * A generator that delegates via `yield*` needs one extra internal
   * `.next()` call after its last real yield before JS reports it as
   * `done` (there is no way to peek ahead). That final call produces no
   * new events but is what flips `isAtInstructionBoundary()` back to
   * true, so it is a real, caller-visible tick (returns `[]`) rather
   * than something to silently skip past.
   */
  clock() {
    if (this.halted) return [];
    this.clockCount++;
    if (!this._gen) {
      this._gen = this._instructionCycle();
    }
    const { value, done } = this._gen.next();
    if (done) {
      this._gen = null;
    }
    return value || [];
  }

  /** Run clock() until the current instruction completes. */
  step() {
    const events = [];
    do {
      events.push(...this.clock());
    } while (!this.isAtInstructionBoundary() && !this.halted);
    return events;
  }

  *_fetchByte(destRegName) {
    const addr = this.registers.PC;
    this.registers.MAR = addr;
    yield [{ type: "bus-transfer", phase: "FETCH", bus: "address", from: "PC", to: "MAR", value: addr, width: 8 }];
    const value = this.memory.read(addr);
    this.registers.PC = (addr + 1) & 0xff;
    if (destRegName) this.registers[destRegName] = value;
    yield [
      {
        type: "bus-transfer",
        phase: "FETCH",
        bus: "data",
        from: "RAM",
        to: destRegName || "operand",
        value,
        width: 8,
      },
      { type: "pc-update", phase: "FETCH", value: this.registers.PC },
    ];
    return value;
  }

  *_instructionCycle() {
    const opcode = yield* this._fetchByte("IR");
    const def = INSTRUCTIONS[opcode];
    if (!def) {
      this.halted = true;
      yield [{ type: "error", phase: "DECODE", message: `Unknown opcode 0x${opcode.toString(16).padStart(2, "0")}` }];
      return;
    }
    yield [{ type: "decode", phase: "DECODE", opcode, mnemonic: def.mnemonic, format: def.format }];

    const operandCount = FORMAT_OPERAND_BYTES[def.format];
    const ops = [];
    for (let i = 0; i < operandCount; i++) {
      const byte = yield* this._fetchByte(null);
      ops.push(byte);
    }

    yield* def.execute(this, ops);
  }

  getState() {
    return {
      registers: {
        A: this.registers.A,
        B: this.registers.B,
        C: this.registers.C,
        D: this.registers.D,
        PC: this.registers.PC,
        SP: this.registers.SP,
        IR: this.registers.IR,
        MAR: this.registers.MAR,
      },
      flags: { ...this.flags },
      ram: Uint8Array.from(this.memory.bytes),
      halted: this.halted,
      clockCount: this.clockCount,
      atInstructionBoundary: this.isAtInstructionBoundary(),
    };
  }
}
