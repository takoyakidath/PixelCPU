export const REG_NAMES = ["A", "B", "C", "D"];

export class Registers {
  constructor() {
    this.reset();
  }

  reset() {
    this.A = 0;
    this.B = 0;
    this.C = 0;
    this.D = 0;
    this.PC = 0;
    this.SP = 0xff;
    this.IR = 0;
    this.MAR = 0;
  }

  get(name) {
    return this[name];
  }

  set(name, value) {
    this[name] = value & 0xff;
  }
}
