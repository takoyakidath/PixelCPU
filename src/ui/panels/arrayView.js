/**
 * Shows a named, contiguous slice of RAM as a clean horizontal array
 * (index + value) instead of making the user hunt for it inside the full
 * 256-byte grid. Samples that operate on an actual array in memory (e.g.
 * bubble sort, fibonacci, memcpy) declare a `watches` list; samples whose
 * result lives only in registers declare none, and this panel stays empty.
 */
export class ArrayView {
  constructor(root) {
    this.root = root;
    this._rows = [];
  }

  setWatches(watches) {
    this.root.textContent = "";
    this._rows = (watches || []).map((watch) => {
      const wrap = document.createElement("div");
      wrap.className = "array-view-row";

      const label = document.createElement("div");
      label.className = "array-view-label";
      label.textContent = watch.label;
      wrap.appendChild(label);

      const cellsWrap = document.createElement("div");
      cellsWrap.className = "array-view-cells";
      wrap.appendChild(cellsWrap);

      const cells = [];
      for (let i = 0; i < watch.length; i++) {
        const addr = watch.start + i;
        const cell = document.createElement("div");
        cell.className = "array-view-cell";

        const idx = document.createElement("div");
        idx.className = "array-view-index";
        idx.textContent = `[${i}]`;
        idx.title = `0x${addr.toString(16).padStart(2, "0").toUpperCase()}`;

        const value = document.createElement("div");
        value.className = "array-view-value";
        value.textContent = "0";

        cell.appendChild(idx);
        cell.appendChild(value);
        cellsWrap.appendChild(cell);
        cells.push({ cell, value, addr });
      }

      this.root.appendChild(wrap);
      return cells;
    });
    this.root.hidden = this._rows.length === 0;
  }

  update(ram, highlightAddr) {
    for (const row of this._rows) {
      for (const { cell, value, addr } of row) {
        value.textContent = String(ram[addr]);
        cell.classList.toggle("array-view-cell--active", addr === highlightAddr);
      }
    }
  }
}
