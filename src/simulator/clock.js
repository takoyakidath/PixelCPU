/**
 * Drives a CPU's clock() over time and exposes the Debugger operations
 * (Run/Pause/Step Clock/Step Instruction/Reset/Breakpoint/Speed) as a thin
 * wrapper. Knows nothing about rendering; callers subscribe via onTick to
 * receive the event batches for each clock() call.
 */
export class ClockController {
  constructor(cpu, { onTick, scheduler } = {}) {
    this.cpu = cpu;
    this.onTick = onTick || (() => {});
    this.intervalMs = 200;
    this.timer = null;
    this.breakpoints = new Set();
    this._setInterval = (scheduler && scheduler.setInterval) || setInterval.bind(globalThis);
    this._clearInterval = (scheduler && scheduler.clearInterval) || clearInterval.bind(globalThis);
  }

  isRunning() {
    return this.timer !== null;
  }

  setSpeed(intervalMs) {
    this.intervalMs = intervalMs;
    if (this.isRunning()) {
      this.pause();
      this.run();
    }
  }

  run() {
    if (this.isRunning() || this.cpu.halted) return;
    this.timer = this._setInterval(() => this._tickAndCheck(), this.intervalMs);
  }

  pause() {
    if (this.timer !== null) {
      this._clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Advance exactly one clock T-state (Step Clock). */
  tick() {
    const events = this.cpu.clock();
    this.onTick(events);
    if (this.cpu.halted) this.pause();
    return events;
  }

  /** Run until the current instruction completes (Step Instruction). */
  stepInstruction() {
    const wasRunning = this.isRunning();
    this.pause();
    const events = this.cpu.step();
    this.onTick(events);
    if (wasRunning && !this.cpu.halted) this.run();
    return events;
  }

  reset() {
    this.pause();
    this.cpu.reset();
  }

  addBreakpoint(address) {
    this.breakpoints.add(address);
  }

  removeBreakpoint(address) {
    this.breakpoints.delete(address);
  }

  clearBreakpoints() {
    this.breakpoints.clear();
  }

  _tickAndCheck() {
    this.tick();
    if (this.cpu.halted) {
      this.pause();
      return;
    }
    if (this.cpu.isAtInstructionBoundary() && this.breakpoints.has(this.cpu.registers.PC)) {
      this.pause();
    }
  }
}
