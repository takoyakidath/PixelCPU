// Plain-language Japanese narration for each micro-op event, so a CPU
// newcomer can follow what just happened without reading raw event
// objects. Wording adapted from docs/codex-drafts/explain-templates.md,
// with short glossary hints on first-glance jargon (MAR, ALU, operand...)
// since a beginner won't yet know what those abbreviations mean even
// though the words themselves are Japanese.

function hex8(value) {
  return `0x${(value & 0xff).toString(16).padStart(2, "0").toUpperCase()}`;
}

const BUS_LABEL = { address: "アドレス", data: "データ" };

// Friendlier label for component ids that show up as bus-transfer
// endpoints. Registers (A-D, PC, SP) are left as-is since their meaning
// is already spelled out via the diagram tooltips and register table.
const FRIENDLY_NAME = {
  MAR: "MAR(アクセス先の番地を覚える場所)",
  ALU: "ALU(計算する部品)",
  RAM: "RAM(メモリ)",
  IR: "IR(命令を覚える場所)",
  operand: "命令の続きのデータ",
};

function name(id) {
  return FRIENDLY_NAME[id] || id;
}

export function explain(event) {
  switch (event.type) {
    case "bus-transfer":
      return `${name(event.from)}から${name(event.to)}へ、値${hex8(event.value)}が${BUS_LABEL[event.bus] || ""}バス(${event.bus === "address" ? "番地を伝える経路" : "データを伝える経路"})を通って送られました。`;
    case "alu-op":
      return event.b === undefined
        ? `計算を担当するALUが${event.a}に${event.op}演算を行い、結果${event.result}を得ました。`
        : `計算を担当するALUが${event.a}と${event.b}に${event.op}演算を行い、結果${event.result}を得ました。`;
    case "flag-update":
      return `計算結果の状態を示すフラグが更新されました（Z=${event.flags.Z} C=${event.flags.C} N=${event.flags.N}）。`;
    case "register-write":
      return `レジスタ${event.reg}に、値${event.value}が書き込まれました。`;
    case "pc-update":
      return `次に実行する命令の場所を示すプログラムカウンタが、${event.value}に進みました。`;
    case "stack-op":
      return event.op === "push"
        ? `値${event.value}がスタックに積まれました（SP=${event.sp}）。`
        : `値${event.value}がスタックから取り出されました（SP=${event.sp}）。`;
    case "decode":
      return `命令を解読し、${event.mnemonic}（命令コード${hex8(event.opcode)}）だと分かりました。`;
    case "halt":
      return "HLT命令によりCPUが停止しました。";
    case "nop":
      return "何もしない命令（NOP）を実行しました。";
    case "branch-not-taken":
      return `条件を満たさなかったため、${event.mnemonic}は分岐しませんでした。`;
    case "error":
      return event.message;
    default:
      return "";
  }
}
