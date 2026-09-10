/**
 * Small dismissible toast notifications for contextual tips (e.g. "you
 * just discovered breakpoints"), separate from the one-time onboarding
 * walkthrough. Each toast has an id so callers can show a given tip only
 * once per session.
 */
export class ToastBar {
  constructor(root) {
    this.root = root;
    this._shown = new Set();
  }

  show(id, message, { once = true, duration = 4500 } = {}) {
    if (once) {
      if (this._shown.has(id)) return;
      this._shown.add(id);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    this.root.appendChild(el);
    requestAnimationFrame(() => el.classList.add("toast--visible"));

    const dismiss = () => {
      el.classList.remove("toast--visible");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
    };
    const timer = setTimeout(dismiss, duration);
    el.addEventListener("click", () => {
      clearTimeout(timer);
      dismiss();
    });
  }
}
