/**
 * Minimal requestAnimationFrame-driven tween scheduler. No external
 * animation library: callers register {duration, onUpdate, onComplete}
 * and this drives onUpdate(easedProgress) every frame until progress
 * reaches 1.
 */
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class AnimationEngine {
  constructor(raf = requestAnimationFrame.bind(globalThis)) {
    this._animations = new Set();
    this._rafId = null;
    this._raf = raf;
  }

  /** Returns a cancel() function. */
  animate({ duration, onUpdate, onComplete, easing = easeInOutCubic }) {
    const anim = { start: null, duration, onUpdate, onComplete, easing, cancelled: false };
    this._animations.add(anim);
    this._ensureLoop();
    return () => {
      anim.cancelled = true;
      this._animations.delete(anim);
    };
  }

  clear() {
    this._animations.clear();
  }

  _ensureLoop() {
    if (this._rafId !== null) return;
    const step = (now) => {
      for (const anim of [...this._animations]) {
        if (anim.cancelled) continue;
        if (anim.start === null) anim.start = now;
        const t = Math.min(1, (now - anim.start) / anim.duration);
        anim.onUpdate(anim.easing(t));
        if (t >= 1) {
          this._animations.delete(anim);
          if (anim.onComplete) anim.onComplete();
        }
      }
      this._rafId = this._animations.size > 0 ? this._raf(step) : null;
    };
    this._rafId = this._raf(step);
  }
}
