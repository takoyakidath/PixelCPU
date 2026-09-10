const REGISTERS = new Set(["A", "B", "C", "D"]);

export class AssemblerError extends Error {
  constructor(message, line) {
    super(message);
    this.name = "AssemblerError";
    this.line = line;
  }
}

/**
 * Tokenizes one line of PixelCPU assembly into a structured statement.
 * Returns null for blank/comment-only lines.
 *
 * Syntax (see docs/codex-handoff.md):
 *   ; comment to end of line
 *   label:
 *   MNEMONIC
 *   MNEMONIC operand
 *   MNEMONIC operand, operand
 */
export function tokenizeLine(rawLine, lineNumber) {
  const withoutComment = stripComment(rawLine);
  const trimmed = withoutComment.trim();
  if (trimmed === "") return null;

  const labelMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
  if (labelMatch) {
    return { type: "label", name: labelMatch[1], line: lineNumber };
  }

  const spaceIdx = trimmed.search(/\s/);
  const mnemonic = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toUpperCase();
  const rest = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();
  const operands = rest === "" ? [] : rest.split(",").map((s) => s.trim());
  if (operands.some((op) => op === "")) {
    throw new AssemblerError(`空のオペランドがあります: "${rawLine.trim()}"`, lineNumber);
  }

  return {
    type: "instruction",
    mnemonic,
    operands: operands.map((op) => classifyOperand(op, lineNumber)),
    line: lineNumber,
  };
}

function stripComment(line) {
  const idx = line.indexOf(";");
  return idx === -1 ? line : line.slice(0, idx);
}

function classifyOperand(text, lineNumber) {
  const upper = text.toUpperCase();
  if (REGISTERS.has(upper)) {
    return { kind: "register", value: upper };
  }
  if (/^0x[0-9a-fA-F]+$/.test(text)) {
    const value = parseInt(text, 16);
    assertByteRange(value, text, lineNumber);
    return { kind: "immediate", value };
  }
  if (/^-?\d+$/.test(text)) {
    const value = parseInt(text, 10);
    assertByteRange(value, text, lineNumber);
    return { kind: "immediate", value };
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text)) {
    return { kind: "label", value: text };
  }
  throw new AssemblerError(`オペランドを解釈できません: "${text}"`, lineNumber);
}

function assertByteRange(value, text, lineNumber) {
  if (value < 0 || value > 255) {
    throw new AssemblerError(`即値/アドレスは0〜255の範囲で指定してください: "${text}"`, lineNumber);
  }
}

export function tokenize(source) {
  const lines = source.split("\n");
  const statements = [];
  lines.forEach((line, idx) => {
    const statement = tokenizeLine(line, idx + 1);
    if (statement) statements.push(statement);
  });
  return statements;
}
