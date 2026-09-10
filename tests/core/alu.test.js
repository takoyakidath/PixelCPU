import { describe, it, expect } from "vitest";
import { ALU } from "../../src/core/alu.js";

describe("ALU", () => {
  it("ADD sets carry on overflow", () => {
    const { result, flags } = ALU.compute("ADD", 200, 100);
    expect(result).toBe((200 + 100) & 0xff);
    expect(flags.C).toBe(1);
  });

  it("ADD sets zero flag when result wraps to 0", () => {
    const { result, flags } = ALU.compute("ADD", 255, 1);
    expect(result).toBe(0);
    expect(flags.Z).toBe(1);
    expect(flags.C).toBe(1);
  });

  it("SUB sets carry (borrow) when a < b", () => {
    const { result, flags } = ALU.compute("SUB", 3, 5);
    expect(result).toBe((3 - 5) & 0xff);
    expect(flags.C).toBe(1);
  });

  it("SUB with a == b is zero, no borrow", () => {
    const { result, flags } = ALU.compute("SUB", 5, 5);
    expect(result).toBe(0);
    expect(flags.Z).toBe(1);
    expect(flags.C).toBe(0);
  });

  it("sets negative flag when bit7 is set", () => {
    const { flags } = ALU.compute("ADD", 0x7f, 1);
    expect(flags.N).toBe(1);
  });

  it("AND/OR/XOR/NOT behave bitwise", () => {
    expect(ALU.compute("AND", 0b1100, 0b1010).result).toBe(0b1000);
    expect(ALU.compute("OR", 0b1100, 0b1010).result).toBe(0b1110);
    expect(ALU.compute("XOR", 0b1100, 0b1010).result).toBe(0b0110);
    expect(ALU.compute("NOT", 0b00001111).result).toBe(0b11110000);
  });

  it("INC/DEC wrap around 8 bits", () => {
    expect(ALU.compute("INC", 255).result).toBe(0);
    expect(ALU.compute("INC", 255).flags.C).toBe(1);
    expect(ALU.compute("DEC", 0).result).toBe(255);
    expect(ALU.compute("DEC", 0).flags.C).toBe(1);
  });

  it("CMP computes flags like SUB without exposing a distinct result field", () => {
    const { result, flags } = ALU.compute("CMP", 5, 3);
    expect(result).toBe(2);
    expect(flags.Z).toBe(0);
  });
});
