// Copy from docs/codex-drafts/stats-panel-copy.md.
const FIELD_META = [
  { key: "totalClocks", label: "総クロック数", desc: "CPUが処理を一段階ずつ進めた回数です。" },
  { key: "totalInstructions", label: "実行した命令数", desc: "完了したアセンブリ命令の合計です。" },
  { key: "busTransferCount", label: "バス転送回数", desc: "CPU内で値がバスを通って移動した回数です。" },
  { key: "busTransferBits", label: "転送した総ビット数", desc: "バスを通って運ばれたデータ量の合計です。" },
  { key: "aluOpCount", label: "ALU演算回数", desc: "ALUが計算や比較を行った回数です。" },
  { key: "stackOpCount", label: "スタック操作回数", desc: "スタックへ値を積んだ回数と、取り出した回数の合計です。" },
];

export class StatsPanel {
  constructor(root) {
    this.root = root;
    this._valueEls = {};
    this._render();
  }

  _render() {
    const intro = document.createElement("p");
    intro.className = "stats-intro";
    intro.textContent = "この実行でCPUが行った処理を、クロック、命令、データ転送などの回数で振り返れます。";
    this.root.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "stats-grid";
    for (const meta of FIELD_META) {
      const card = document.createElement("div");
      card.className = "stats-card";
      card.title = meta.desc;

      const value = document.createElement("div");
      value.className = "stats-value";
      value.textContent = "0";

      const label = document.createElement("div");
      label.className = "stats-label";
      label.textContent = meta.label;

      card.appendChild(value);
      card.appendChild(label);
      grid.appendChild(card);
      this._valueEls[meta.key] = value;
    }
    this.root.appendChild(grid);

    const breakdownTitle = document.createElement("div");
    breakdownTitle.className = "stats-breakdown-title";
    breakdownTitle.textContent = "命令ごとの実行回数";
    this.root.appendChild(breakdownTitle);

    this._breakdownEl = document.createElement("div");
    this._breakdownEl.className = "stats-breakdown";
    this.root.appendChild(this._breakdownEl);
  }

  update(stats) {
    for (const meta of FIELD_META) {
      this._valueEls[meta.key].textContent = String(stats[meta.key]);
    }
    this._breakdownEl.textContent = "";
    const sorted = [...stats.perInstructionBreakdown].sort((a, b) => b.count - a.count);
    if (sorted.length === 0) {
      const empty = document.createElement("div");
      empty.className = "stats-breakdown-row stats-breakdown-row--empty";
      empty.textContent = "まだ実行していません";
      this._breakdownEl.appendChild(empty);
      return;
    }
    for (const { mnemonic, count } of sorted) {
      const row = document.createElement("div");
      row.className = "stats-breakdown-row";
      row.textContent = `${mnemonic} × ${count}回`;
      this._breakdownEl.appendChild(row);
    }
  }
}
