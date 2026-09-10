import { ADDRESS_BUS_Y, DATA_BUS_Y } from "./cpuDiagramRenderer.js";

function toBinary8(value) {
  return (value & 0xff).toString(2).padStart(8, "0");
}

function quadraticBezier(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/**
 * Turns CPU micro-op events into diagram animations: a token carrying the
 * 8-bit value slides from the source component to the destination along a
 * curve that dips toward the relevant bus rail, then the destination box
 * flashes. Non-bus events (alu-op, register-write, ...) just flash the
 * relevant box - there's nothing to move.
 */
export class BusTokenAnimator {
  constructor(renderer, animationEngine, { tokenDuration = 420 } = {}) {
    this.renderer = renderer;
    this.engine = animationEngine;
    this.tokenDuration = tokenDuration;
  }

  handleEvent(event) {
    switch (event.type) {
      case "bus-transfer":
        this._animateBusTransfer(event);
        break;
      case "alu-op":
        this.renderer.flash("ALU", "alu");
        break;
      case "register-write":
        this.renderer.flash(event.reg, "write");
        break;
      case "flag-update":
        this.renderer.flash("FLAGS", "flag");
        break;
      case "pc-update":
        this.renderer.flash("PC", "pc");
        break;
      case "decode":
        this.renderer.flash("DECODER", "decode");
        break;
      case "stack-op":
        this.renderer.flash("SP", "stack");
        this.renderer.flash("RAM", "stack");
        break;
      case "halt":
        this.renderer.flash("DECODER", "halt");
        break;
      default:
        break;
    }
  }

  _animateBusTransfer(event) {
    const from = this.renderer.anchor(event.from);
    const to = this.renderer.anchor(event.to);
    if (!from || !to) return;
    const railY = event.bus === "address" ? ADDRESS_BUS_Y : DATA_BUS_Y;
    const controlX = (from.x + to.x) / 2;
    const text = event.width === 8 ? toBinary8(event.value) : String(event.value);
    const token = this.renderer.createTokenElement(text);
    token.classList.add(`bus-token--${event.bus}`);

    this.engine.animate({
      duration: this.tokenDuration,
      onUpdate: (t) => {
        const pos = quadraticBezier(from, { x: controlX, y: railY }, to, t);
        token.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
        const fade = t < 0.08 ? t / 0.08 : t > 0.85 ? (1 - t) / 0.15 : 1;
        token.style.opacity = String(Math.max(0, Math.min(1, fade)));
      },
      onComplete: () => {
        token.remove();
        this.renderer.flash(event.to);
      },
    });
  }
}
