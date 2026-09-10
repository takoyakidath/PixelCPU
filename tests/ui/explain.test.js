import { describe, it, expect } from "vitest";
import { explain } from "../../src/ui/panels/explain.js";

describe("explain", () => {
  it("expands MAR/ALU/RAM/operand into friendlier wording for bus-transfer", () => {
    const text = explain({ type: "bus-transfer", bus: "address", from: "PC", to: "MAR", value: 5, width: 8 });
    expect(text).toContain("MAR(アクセス先の番地を覚える場所)");
    expect(text).toContain("PC");
    expect(text).toContain("0x05");
  });

  it("describes both operands for a two-register ALU op", () => {
    const text = explain({ type: "alu-op", op: "ADD", a: 3, b: 4, result: 7 });
    expect(text).toContain("3と4");
    expect(text).toContain("ADD");
    expect(text).toContain("7");
  });

  it("describes a single operand for a one-register ALU op (INC/DEC/NOT)", () => {
    const text = explain({ type: "alu-op", op: "INC", a: 3, result: 4 });
    expect(text).not.toContain("undefined");
    expect(text).toContain("INC");
  });

  it("reports flag values", () => {
    const text = explain({ type: "flag-update", flags: { Z: 1, C: 0, N: 0 } });
    expect(text).toContain("Z=1");
  });

  it("distinguishes push vs pop wording for stack-op", () => {
    expect(explain({ type: "stack-op", op: "push", value: 9, sp: 254 })).toContain("積まれました");
    expect(explain({ type: "stack-op", op: "pop", value: 9, sp: 255 })).toContain("取り出されました");
  });

  it("returns an empty string for an unknown event type", () => {
    expect(explain({ type: "something-unhandled" })).toBe("");
  });
});
