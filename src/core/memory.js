export class Memory {
  constructor(size = 256) {
    this.size = size;
    this.bytes = new Uint8Array(size);
  }

  read(addr) {
    return this.bytes[addr & 0xff];
  }

  write(addr, value) {
    this.bytes[addr & 0xff] = value & 0xff;
  }

  reset() {
    this.bytes.fill(0);
  }

  loadProgram(bytes, offset = 0) {
    for (let i = 0; i < bytes.length; i++) {
      this.bytes[(offset + i) & 0xff] = bytes[i] & 0xff;
    }
  }
}
