import { REG_NAMES } from "./registers.js";
import { ALU } from "./alu.js";

export const FORMAT_OPERAND_BYTES = {
  N: 0,
  R: 1,
  RR: 1,
  RI: 2,
  A: 1,
};

function decodeRR(byte) {
  return { dst: (byte >> 6) & 0b11, src: (byte >> 4) & 0b11 };
}

function decodeR(byte) {
  return { reg: byte & 0b11 };
}

function aluRR(mnemonic, opcode, aluOp, { writesResult = true } = {}) {
  return {
    mnemonic,
    format: "RR",
    *execute(cpu, ops) {
      const { dst, src } = decodeRR(ops[0]);
      const dstName = REG_NAMES[dst];
      const srcName = REG_NAMES[src];
      const a = cpu.registers.get(dstName);
      const b = cpu.registers.get(srcName);
      yield [
        { type: "bus-transfer", phase: "EXECUTE", bus: "data", from: dstName, to: "ALU", value: a, width: 8 },
        { type: "bus-transfer", phase: "EXECUTE", bus: "data", from: srcName, to: "ALU", value: b, width: 8 },
      ];
      const { result, flags } = ALU.compute(aluOp, a, b);
      cpu.flags = flags;
      const events = [{ type: "alu-op", phase: "EXECUTE", op: aluOp, a, b, result }];
      if (writesResult) {
        cpu.registers.set(dstName, result);
        events.push({ type: "register-write", phase: "EXECUTE", reg: dstName, value: result });
      }
      events.push({ type: "flag-update", phase: "EXECUTE", flags });
      yield events;
    },
  };
}

function aluR(mnemonic, opcode, aluOp) {
  return {
    mnemonic,
    format: "R",
    *execute(cpu, ops) {
      const { reg } = decodeR(ops[0]);
      const regName = REG_NAMES[reg];
      const a = cpu.registers.get(regName);
      yield [{ type: "bus-transfer", phase: "EXECUTE", bus: "data", from: regName, to: "ALU", value: a, width: 8 }];
      const { result, flags } = ALU.compute(aluOp, a);
      cpu.registers.set(regName, result);
      cpu.flags = flags;
      yield [
        { type: "alu-op", phase: "EXECUTE", op: aluOp, a, result },
        { type: "register-write", phase: "EXECUTE", reg: regName, value: result },
        { type: "flag-update", phase: "EXECUTE", flags },
      ];
    },
  };
}

function jumpIf(mnemonic, condition) {
  return {
    mnemonic,
    format: "A",
    *execute(cpu, ops) {
      const addr = ops[0];
      if (condition(cpu.flags)) {
        cpu.registers.PC = addr;
        yield [
          { type: "bus-transfer", phase: "EXECUTE", bus: "address", from: "operand", to: "PC", value: addr, width: 8 },
          { type: "pc-update", phase: "EXECUTE", value: addr, taken: true },
        ];
      } else {
        yield [{ type: "branch-not-taken", phase: "EXECUTE", mnemonic }];
      }
    },
  };
}

export const INSTRUCTIONS = {
  0x00: {
    mnemonic: "NOP",
    format: "N",
    *execute() {
      yield [{ type: "nop", phase: "EXECUTE" }];
    },
  },
  0x01: {
    mnemonic: "HLT",
    format: "N",
    *execute(cpu) {
      cpu.halted = true;
      yield [{ type: "halt", phase: "EXECUTE" }];
    },
  },

  0x10: {
    mnemonic: "MOV",
    format: "RR",
    *execute(cpu, ops) {
      const { dst, src } = decodeRR(ops[0]);
      const dstName = REG_NAMES[dst];
      const srcName = REG_NAMES[src];
      const value = cpu.registers.get(srcName);
      cpu.registers.set(dstName, value);
      yield [
        { type: "bus-transfer", phase: "EXECUTE", bus: "data", from: srcName, to: dstName, value, width: 8 },
        { type: "register-write", phase: "EXECUTE", reg: dstName, value },
      ];
    },
  },
  0x11: {
    mnemonic: "MOV",
    format: "RI",
    *execute(cpu, ops) {
      const { reg } = decodeR(ops[0]);
      const regName = REG_NAMES[reg];
      const value = ops[1];
      cpu.registers.set(regName, value);
      yield [
        { type: "bus-transfer", phase: "EXECUTE", bus: "data", from: "operand", to: regName, value, width: 8 },
        { type: "register-write", phase: "EXECUTE", reg: regName, value },
      ];
    },
  },
  0x12: {
    mnemonic: "LOAD",
    format: "RI",
    *execute(cpu, ops) {
      const { reg } = decodeR(ops[0]);
      const regName = REG_NAMES[reg];
      const addr = ops[1];
      cpu.registers.MAR = addr;
      yield [{ type: "bus-transfer", phase: "EXECUTE", bus: "address", from: "operand", to: "MAR", value: addr, width: 8 }];
      const value = cpu.memory.read(addr);
      cpu.registers.set(regName, value);
      yield [
        { type: "bus-transfer", phase: "EXECUTE", bus: "data", from: "RAM", to: regName, value, width: 8 },
        { type: "register-write", phase: "EXECUTE", reg: regName, value },
      ];
    },
  },
  0x13: {
    mnemonic: "STORE",
    format: "RI",
    *execute(cpu, ops) {
      const { reg } = decodeR(ops[0]);
      const regName = REG_NAMES[reg];
      const addr = ops[1];
      const value = cpu.registers.get(regName);
      cpu.registers.MAR = addr;
      yield [{ type: "bus-transfer", phase: "EXECUTE", bus: "address", from: "operand", to: "MAR", value: addr, width: 8 }];
      cpu.memory.write(addr, value);
      yield [{ type: "bus-transfer", phase: "EXECUTE", bus: "data", from: regName, to: "RAM", value, width: 8 }];
    },
  },

  0x20: aluRR("ADD", 0x20, "ADD"),
  0x21: aluRR("SUB", 0x21, "SUB"),
  0x22: aluR("INC", 0x22, "INC"),
  0x23: aluR("DEC", 0x23, "DEC"),

  0x30: aluRR("AND", 0x30, "AND"),
  0x31: aluRR("OR", 0x31, "OR"),
  0x32: aluRR("XOR", 0x32, "XOR"),
  0x33: aluR("NOT", 0x33, "NOT"),

  0x40: aluRR("CMP", 0x40, "CMP", { writesResult: false }),

  0x50: {
    mnemonic: "JMP",
    format: "A",
    *execute(cpu, ops) {
      const addr = ops[0];
      cpu.registers.PC = addr;
      yield [
        { type: "bus-transfer", phase: "EXECUTE", bus: "address", from: "operand", to: "PC", value: addr, width: 8 },
        { type: "pc-update", phase: "EXECUTE", value: addr, taken: true },
      ];
    },
  },
  0x51: jumpIf("JZ", (flags) => flags.Z === 1),
  0x52: jumpIf("JNZ", (flags) => flags.Z === 0),
  0x53: jumpIf("JC", (flags) => flags.C === 1),

  0x60: {
    mnemonic: "PUSH",
    format: "R",
    *execute(cpu, ops) {
      const { reg } = decodeR(ops[0]);
      const regName = REG_NAMES[reg];
      const value = cpu.registers.get(regName);
      cpu.registers.SP = (cpu.registers.SP - 1) & 0xff;
      cpu.memory.write(cpu.registers.SP, value);
      yield [{ type: "stack-op", phase: "EXECUTE", op: "push", value, sp: cpu.registers.SP }];
    },
  },
  0x61: {
    mnemonic: "POP",
    format: "R",
    *execute(cpu, ops) {
      const { reg } = decodeR(ops[0]);
      const regName = REG_NAMES[reg];
      const value = cpu.memory.read(cpu.registers.SP);
      cpu.registers.SP = (cpu.registers.SP + 1) & 0xff;
      cpu.registers.set(regName, value);
      yield [
        { type: "stack-op", phase: "EXECUTE", op: "pop", value, sp: cpu.registers.SP },
        { type: "register-write", phase: "EXECUTE", reg: regName, value },
      ];
    },
  },
  0x62: {
    mnemonic: "CALL",
    format: "A",
    *execute(cpu, ops) {
      const addr = ops[0];
      const returnAddr = cpu.registers.PC;
      cpu.registers.SP = (cpu.registers.SP - 1) & 0xff;
      cpu.memory.write(cpu.registers.SP, returnAddr);
      yield [{ type: "stack-op", phase: "EXECUTE", op: "push", value: returnAddr, sp: cpu.registers.SP }];
      cpu.registers.PC = addr;
      yield [{ type: "pc-update", phase: "EXECUTE", value: addr, taken: true }];
    },
  },
  0x63: {
    mnemonic: "RET",
    format: "N",
    *execute(cpu) {
      const addr = cpu.memory.read(cpu.registers.SP);
      cpu.registers.SP = (cpu.registers.SP + 1) & 0xff;
      cpu.registers.PC = addr;
      yield [
        { type: "stack-op", phase: "EXECUTE", op: "pop", value: addr, sp: cpu.registers.SP },
        { type: "pc-update", phase: "EXECUTE", value: addr, taken: true },
      ];
    },
  },
};

export function findOpcodeByMnemonic(mnemonic, format) {
  for (const [code, def] of Object.entries(INSTRUCTIONS)) {
    if (def.mnemonic === mnemonic && def.format === format) {
      return Number(code);
    }
  }
  return undefined;
}
