import { tokenize, AssemblerError } from "./tokenizer.js";
import { resolveFormat } from "./parser.js";
import { FORMAT_OPERAND_BYTES, findOpcodeByMnemonic } from "../core/instructionSet.js";
import { REG_NAMES } from "../core/registers.js";

function instructionLength(format) {
  return 1 + FORMAT_OPERAND_BYTES[format];
}

/**
 * Assembles PixelCPU source into machine code.
 *
 * Returns { bytes: Uint8Array, sourceMap: Array<{address, line}>, labels: Map<string, number> }.
 * Throws AssemblerError (with a `.line`) on invalid syntax, unresolved labels,
 * or unknown instructions.
 */
export function assemble(source, { origin = 0 } = {}) {
  const statements = tokenize(source);

  // Pass 1: assign addresses, resolve label -> address, determine each
  // instruction's format (format only depends on operand *kinds*, not
  // resolved values, so this can happen before labels are known).
  const labels = new Map();
  const instructions = [];
  let address = origin;

  for (const statement of statements) {
    if (statement.type === "label") {
      if (labels.has(statement.name)) {
        throw new AssemblerError(`ラベルが重複しています: "${statement.name}"`, statement.line);
      }
      labels.set(statement.name, address);
      continue;
    }
    const format = resolveFormat(statement);
    instructions.push({ statement, format, address });
    address += instructionLength(format);
  }

  // Pass 2: encode bytes, resolving label operands now that all addresses
  // are known.
  const bytes = [];
  const sourceMap = [];

  for (const { statement, format, address: instrAddress } of instructions) {
    const opcode = findOpcodeByMnemonic(statement.mnemonic, format);
    if (opcode === undefined) {
      throw new AssemblerError(`命令をエンコードできません: "${statement.mnemonic}"`, statement.line);
    }
    sourceMap.push({ address: instrAddress, line: statement.line });
    bytes.push(opcode, ...encodeOperands(statement, format, labels));
  }

  return {
    bytes: Uint8Array.from(bytes),
    sourceMap,
    labels,
  };
}

function encodeOperands(statement, format, labels) {
  const { operands, line } = statement;
  const regId = (name) => REG_NAMES.indexOf(name);
  const resolveValue = (operand) => {
    if (operand.kind === "immediate") return operand.value;
    const addr = labels.get(operand.value);
    if (addr === undefined) {
      throw new AssemblerError(`未定義のラベルです: "${operand.value}"`, line);
    }
    return addr;
  };

  switch (format) {
    case "N":
      return [];
    case "R":
      return [regId(operands[0].value) & 0b11];
    case "RR":
      return [((regId(operands[0].value) & 0b11) << 6) | ((regId(operands[1].value) & 0b11) << 4)];
    case "RI":
      return [regId(operands[0].value) & 0b11, resolveValue(operands[1])];
    case "A":
      return [resolveValue(operands[0])];
    default:
      throw new AssemblerError(`未知の命令フォーマットです: "${format}"`, line);
  }
}
