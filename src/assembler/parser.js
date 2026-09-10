import { AssemblerError } from "./tokenizer.js";

const NO_OPERAND = new Set(["NOP", "HLT", "RET"]);
const SINGLE_REGISTER = new Set(["INC", "DEC", "NOT", "PUSH", "POP"]);
const TWO_REGISTER = new Set(["ADD", "SUB", "AND", "OR", "XOR", "CMP"]);
const REGISTER_AND_ADDRESS = new Set(["LOAD", "STORE"]);
const ADDRESS_ONLY = new Set(["JMP", "JZ", "JNZ", "JC", "CALL"]);

/**
 * Determines the instruction format ("N" | "R" | "RR" | "RI" | "A") for a
 * tokenized instruction statement, validating operand shapes.
 */
export function resolveFormat(statement) {
  const { mnemonic, operands, line } = statement;

  if (NO_OPERAND.has(mnemonic)) {
    expectCount(mnemonic, operands, 0, line);
    return "N";
  }

  if (SINGLE_REGISTER.has(mnemonic)) {
    expectCount(mnemonic, operands, 1, line);
    expectKind(mnemonic, operands[0], "register", line);
    return "R";
  }

  if (TWO_REGISTER.has(mnemonic)) {
    expectCount(mnemonic, operands, 2, line);
    expectKind(mnemonic, operands[0], "register", line);
    expectKind(mnemonic, operands[1], "register", line);
    return "RR";
  }

  if (REGISTER_AND_ADDRESS.has(mnemonic)) {
    expectCount(mnemonic, operands, 2, line);
    expectKind(mnemonic, operands[0], "register", line);
    expectKind(mnemonic, operands[1], ["immediate", "label"], line);
    return "RI";
  }

  if (ADDRESS_ONLY.has(mnemonic)) {
    expectCount(mnemonic, operands, 1, line);
    expectKind(mnemonic, operands[0], ["immediate", "label"], line);
    return "A";
  }

  if (mnemonic === "MOV") {
    expectCount(mnemonic, operands, 2, line);
    expectKind(mnemonic, operands[0], "register", line);
    if (operands[1].kind === "register") return "RR";
    expectKind(mnemonic, operands[1], ["immediate", "label"], line);
    return "RI";
  }

  throw new AssemblerError(`未知の命令です: "${mnemonic}"`, line);
}

function expectCount(mnemonic, operands, count, line) {
  if (operands.length !== count) {
    throw new AssemblerError(
      `${mnemonic} はオペランドが${count}個必要ですが、${operands.length}個指定されています`,
      line,
    );
  }
}

function expectKind(mnemonic, operand, kindOrKinds, line) {
  const kinds = Array.isArray(kindOrKinds) ? kindOrKinds : [kindOrKinds];
  if (!kinds.includes(operand.kind)) {
    throw new AssemblerError(`${mnemonic} のオペランドの種類が不正です: "${operand.value}"`, line);
  }
}
