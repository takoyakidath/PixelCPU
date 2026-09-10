export class RamViewer {
  constructor(root) {
    this.root = root;
    this._cells = [];
    this._render();
  }

  _render() {
    const grid = document.createElement("div");
    grid.className = "ram-grid";
    for (let addr = 0; addr < 256; addr++) {
      const cell = document.createElement("span");
      cell.className = "ram-cell";
      cell.title = `0x${addr.toString(16).padStart(2, "0").toUpperCase()}`;
      cell.textContent = "00";
      grid.appendChild(cell);
      this._cells.push(cell);
    }
    this.root.appendChild(grid);
  }

  update(ram, { highlightAddr } = {}) {
    for (let addr = 0; addr < 256; addr++) {
      this._cells[addr].textContent = ram[addr].toString(16).padStart(2, "0").toUpperCase();
      this._cells[addr].classList.toggle("ram-cell--active", addr === highlightAddr);
    }
  }
}
