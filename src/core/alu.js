export const ALU = {
  compute(op, a, b = 0) {
    let result;
    let carry = 0;
    switch (op) {
      case "ADD": {
        const sum = a + b;
        result = sum & 0xff;
        carry = sum > 0xff ? 1 : 0;
        break;
      }
      case "SUB":
      case "CMP": {
        const diff = a - b;
        result = diff & 0xff;
        carry = a < b ? 1 : 0;
        break;
      }
      case "INC": {
        const sum = a + 1;
        result = sum & 0xff;
        carry = sum > 0xff ? 1 : 0;
        break;
      }
      case "DEC": {
        const diff = a - 1;
        result = diff & 0xff;
        carry = a < 1 ? 1 : 0;
        break;
      }
      case "AND":
        result = a & b;
        break;
      case "OR":
        result = a | b;
        break;
      case "XOR":
        result = a ^ b;
        break;
      case "NOT":
        result = ~a & 0xff;
        break;
      default:
        throw new Error(`Unknown ALU op: ${op}`);
    }
    return {
      result,
      flags: {
        Z: result === 0 ? 1 : 0,
        C: carry,
        N: (result & 0x80) !== 0 ? 1 : 0,
      },
    };
  },
};
