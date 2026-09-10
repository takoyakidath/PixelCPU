/**
 * Code panel: an editable textarea while writing assembly, and a
 * read-only line list (with the current-PC line highlighted) once a
 * program has been assembled and is running.
 */
export class Editor {
  constructor(root) {
    this.root = root;
    this._lineEls = {};
    this._addrToLine = null;
    this._render();
  }

  _render() {
    this.textarea = document.createElement("textarea");
    this.textarea.className = "code-textarea";
    this.textarea.spellcheck = false;
    this.textarea.setAttribute("aria-label", "PixelCPU assembly source");
    this.root.appendChild(this.textarea);

    this.lineView = document.createElement("div");
    this.lineView.className = "code-lineview";
    this.lineView.hidden = true;
    this.root.appendChild(this.lineView);

    this.errorView = document.createElement("pre");
    this.errorView.className = "code-error";
    this.errorView.hidden = true;
    this.root.appendChild(this.errorView);
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(source) {
    this.textarea.value = source;
    this.exitReadOnly();
  }

  showError(message) {
    this.errorView.textContent = message;
    this.errorView.hidden = false;
  }

  clearError() {
    this.errorView.hidden = true;
    this.errorView.textContent = "";
  }

  /** Switches to a read-only rendering of `source`, using sourceMap to know
   * which source line each instruction address belongs to. */
  showSourceMap(source, sourceMap) {
    const lines = source.split("\n");
    this.lineView.textContent = "";
    this._lineEls = {};
    lines.forEach((text, idx) => {
      const div = document.createElement("div");
      div.className = "code-line";
      div.textContent = text.length > 0 ? text : " ";
      this.lineView.appendChild(div);
      this._lineEls[idx + 1] = div;
    });
    this._addrToLine = new Map(sourceMap.map((entry) => [entry.address, entry.line]));
    this.textarea.hidden = true;
    this.lineView.hidden = false;
  }

  /** Highlights the source line whose instruction starts at `addr`. */
  highlightAddress(addr) {
    for (const el of Object.values(this._lineEls)) el.classList.remove("code-line--active");
    if (!this._addrToLine) return;
    const line = this._addrToLine.get(addr);
    if (line && this._lineEls[line]) this._lineEls[line].classList.add("code-line--active");
  }

  exitReadOnly() {
    this.textarea.hidden = false;
    this.lineView.hidden = true;
    this._addrToLine = null;
  }
}
