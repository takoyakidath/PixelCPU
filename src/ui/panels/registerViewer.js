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
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const headers = [
      ["REG", "レジスタの名前"],
      ["BIN", "2進数：コンピュータが扱う0と1だけの表記(8桁=8bit)"],
      ["DEC", "10進数：人が普段使う数字の表記(0〜255)"],
      ["HEX", "16進数：4bitずつ0〜Fでまとめた表記(0x00〜0xFF)"],
    ];
    for (const [text, title] of headers) {
      const th = document.createElement("th");
      th.textContent = text;
      th.title = title;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);
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

    const FLAG_TITLES = {
      Z: "Zeroフラグ：直前の計算結果がちょうど0だったら1になります。",
      C: "Carryフラグ：直前の計算で桁あふれ(繰り上がり/借り)が起きたら1になります。",
      N: "Negativeフラグ：直前の計算結果が負の数(最上位bitが1)だったら1になります。",
    };
    this._flagsView = document.createElement("div");
    this._flagsView.className = "flags-view";
    this._flagEls = {};
    for (const flag of ["Z", "C", "N"]) {
      const span = document.createElement("span");
      span.className = "flag";
      span.title = FLAG_TITLES[flag];
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
