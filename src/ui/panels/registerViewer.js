const REGS = ["A", "B", "C", "D", "PC", "SP", "IR", "MAR"];

export class RegisterViewer {
  constructor(root) {
    this.root = root;
    this._cells = {};
    this._render();
  }

  _render() {
    const table = document.createElement("table");
    table.className = "register-table";
    table.innerHTML = "<thead><tr><th>REG</th><th>BIN</th><th>DEC</th><th>HEX</th></tr></thead>";
    const tbody = document.createElement("tbody");
    for (const reg of REGS) {
      const tr = document.createElement("tr");
      tr.dataset.reg = reg;
      tr.innerHTML = `<td>${reg}</td><td class="bin"></td><td class="dec"></td><td class="hex"></td>`;
      tbody.appendChild(tr);
      this._cells[reg] = {
        row: tr,
        bin: tr.querySelector(".bin"),
        dec: tr.querySelector(".dec"),
        hex: tr.querySelector(".hex"),
      };
    }
    table.appendChild(tbody);
    this.root.appendChild(table);

    this._flagsView = document.createElement("div");
    this._flagsView.className = "flags-view";
    this._flagEls = {};
    for (const flag of ["Z", "C", "N"]) {
      const span = document.createElement("span");
      span.className = "flag";
      this._flagsView.appendChild(span);
      this._flagEls[flag] = span;
    }
    this.root.appendChild(this._flagsView);
  }

  update(state) {
    for (const [reg, cell] of Object.entries(this._cells)) {
      const value = state.registers[reg] & 0xff;
      cell.bin.textContent = value.toString(2).padStart(8, "0");
      cell.dec.textContent = String(value);
      cell.hex.textContent = `0x${value.toString(16).padStart(2, "0").toUpperCase()}`;
    }
    for (const [flag, el] of Object.entries(this._flagEls)) {
      const on = !!state.flags[flag];
      el.textContent = `${flag}=${state.flags[flag]}`;
      el.classList.toggle("flag--on", on);
    }
  }

  highlightRegister(reg) {
    for (const cell of Object.values(this._cells)) cell.row.classList.remove("register-row--active");
    if (this._cells[reg]) this._cells[reg].row.classList.add("register-row--active");
  }
}
