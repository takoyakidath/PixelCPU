import { CPU } from "./core/cpu.js";
import { assemble } from "./assembler/assembler.js";
import { AssemblerError } from "./assembler/tokenizer.js";
import { ClockController } from "./simulator/clock.js";
import { CpuDiagramRenderer } from "./ui/diagram/cpuDiagramRenderer.js";
import { AnimationEngine } from "./ui/diagram/animationEngine.js";
import { BusTokenAnimator } from "./ui/diagram/busTokenAnimator.js";
import { RegisterViewer } from "./ui/panels/registerViewer.js";
import { RamViewer } from "./ui/panels/ramViewer.js";
import { Editor } from "./ui/panels/editor.js";
import { explain } from "./ui/panels/explain.js";
import { StatsPanel } from "./ui/panels/statsPanel.js";
import { StatsCollector } from "./simulator/statsCollector.js";

import sample1 from "./samples/01-sum-1-to-10.asm?raw";
import sample2 from "./samples/02-fibonacci.asm?raw";
import sample3 from "./samples/03-multiply-by-add.asm?raw";
import sample4 from "./samples/04-memcpy.asm?raw";
import sample5 from "./samples/05-stack-subroutine.asm?raw";
import sample6 from "./samples/06-bubble-sort.asm?raw";

const SAMPLES = [
  { label: "1〜10までの合計", src: sample1 },
  { label: "フィボナッチ数列", src: sample2 },
  { label: "掛け算(ADDの繰り返し)", src: sample3 },
  { label: "メモリコピー", src: sample4 },
  { label: "CALL/RETサブルーチン", src: sample5 },
  { label: "バブルソート", src: sample6 },
];

const cpu = new CPU();
const registerViewer = new RegisterViewer(document.getElementById("register-root"));
const ramViewer = new RamViewer(document.getElementById("ram-root"));
const activeBreakpoints = new Set();
const editor = new Editor(document.getElementById("editor-root"), {
  onToggleBreakpoint: (addr) => {
    if (activeBreakpoints.has(addr)) {
      activeBreakpoints.delete(addr);
      controller.removeBreakpoint(addr);
    } else {
      activeBreakpoints.add(addr);
      controller.addBreakpoint(addr);
    }
  },
});
const diagramRenderer = new CpuDiagramRenderer(document.getElementById("cpu-diagram"));
const animationEngine = new AnimationEngine();
const busTokenAnimator = new BusTokenAnimator(diagramRenderer, animationEngine);
const statsPanel = new StatsPanel(document.getElementById("stats-root"));
const statsCollector = new StatsCollector();

const machineCodeEl = document.getElementById("machine-code");
const explainTextEl = document.getElementById("explain-text");
const clockCountEl = document.getElementById("clock-count");
const pipelineStages = document.querySelectorAll(".pipeline-stage");
const sampleSelect = document.getElementById("sample-select");

let currentSourceMap = null;
let lastTouchedRamAddr = null;

function setPipelinePhase(phase) {
  for (const stage of pipelineStages) {
    stage.classList.toggle("pipeline-stage--active", stage.dataset.phase === phase);
  }
}

function refreshStaticViews() {
  const state = cpu.getState();
  registerViewer.update(state);
  ramViewer.update(state.ram, { highlightAddr: lastTouchedRamAddr });
  for (const reg of ["A", "B", "C", "D", "PC", "SP"]) {
    diagramRenderer.setValue(reg, String(state.registers[reg]));
  }
  diagramRenderer.setValue("IR", `0x${state.registers.IR.toString(16).padStart(2, "0")}`);
  diagramRenderer.setValue("MAR", `0x${state.registers.MAR.toString(16).padStart(2, "0")}`);
  diagramRenderer.setValue("FLAGS", `Z${state.flags.Z} C${state.flags.C} N${state.flags.N}`);
  clockCountEl.textContent = String(state.clockCount);
}

function handleTick(events) {
  for (const event of events) {
    busTokenAnimator.handleEvent(event);
    statsCollector.handleEvent(event);

    if (event.type === "bus-transfer" && event.bus === "address" && event.to === "MAR") {
      lastTouchedRamAddr = event.value;
    }

    if (event.type === "decode") {
      const startAddr = (cpu.registers.PC - 1 + 256) % 256;
      editor.highlightAddress(startAddr);
    }

    const description = explain(event);
    if (description) explainTextEl.textContent = description;
    if (event.phase) setPipelinePhase(event.phase);
  }
  refreshStaticViews();
  statsPanel.update(statsCollector.snapshot(cpu.clockCount));
}

const controller = new ClockController(cpu, { onTick: handleTick });

function loadProgram(source) {
  editor.clearError();
  try {
    const { bytes, sourceMap } = assemble(source);
    controller.reset();
    controller.clearBreakpoints();
    activeBreakpoints.clear();
    statsCollector.reset();
    cpu.loadProgram(bytes);
    currentSourceMap = sourceMap;
    lastTouchedRamAddr = null;
    editor.showSourceMap(source, sourceMap);
    editor.highlightAddress(0);
    machineCodeEl.textContent = formatMachineCode(bytes, sourceMap);
    explainTextEl.textContent = "ロードしました。「1クロック」または「1命令」で実行してみましょう。";
    setPipelinePhase("FETCH");
    refreshStaticViews();
    statsPanel.update(statsCollector.snapshot(cpu.clockCount));
  } catch (err) {
    if (err instanceof AssemblerError) {
      editor.showError(`${err.line}行目: ${err.message}`);
    } else {
      editor.showError(String(err.message || err));
    }
  }
}

function formatMachineCode(bytes, sourceMap) {
  const byLine = new Map(sourceMap.map((e) => [e.address, e.line]));
  const lines = [];
  let i = 0;
  let instrIdx = 0;
  const addrs = sourceMap.map((e) => e.address).concat(bytes.length);
  while (i < bytes.length) {
    const start = addrs[instrIdx];
    const end = addrs[instrIdx + 1] ?? bytes.length;
    const chunk = Array.from(bytes.slice(start, end))
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");
    lines.push(`0x${start.toString(16).padStart(2, "0").toUpperCase()}: ${chunk}`);
    i = end;
    instrIdx++;
  }
  return lines.join("\n");
}

document.getElementById("btn-run").addEventListener("click", () => controller.run());
document.getElementById("btn-pause").addEventListener("click", () => controller.pause());
document.getElementById("btn-step-clock").addEventListener("click", () => controller.tick());
document.getElementById("btn-step-instr").addEventListener("click", () => controller.stepInstruction());
document.getElementById("btn-reset").addEventListener("click", () => {
  controller.reset();
  lastTouchedRamAddr = null;
  statsCollector.reset();
  setPipelinePhase("FETCH");
  explainTextEl.textContent = "リセットしました。";
  refreshStaticViews();
  statsPanel.update(statsCollector.snapshot(cpu.clockCount));
  if (currentSourceMap) editor.highlightAddress(0);
});
document.getElementById("speed").addEventListener("input", (e) => {
  controller.setSpeed(Number(e.target.value));
});
document.getElementById("btn-assemble").addEventListener("click", () => {
  loadProgram(editor.getValue());
});

for (const [idx, sample] of SAMPLES.entries()) {
  const option = document.createElement("option");
  option.value = String(idx);
  option.textContent = sample.label;
  sampleSelect.appendChild(option);
}
sampleSelect.addEventListener("change", () => {
  const idx = sampleSelect.value;
  if (idx === "") return;
  editor.setValue(SAMPLES[Number(idx)].src);
});

// Mobile tab switching (panel-code is the default active tab, matching the
// mobile-tab--active button already marked in index.html).
const tabButtons = document.querySelectorAll(".mobile-tab");
const panels = ["panel-code", "panel-diagram", "panel-registers", "panel-ram", "panel-stats"];
document.getElementById("panel-code").classList.add("panel--mobile-active");
for (const btn of tabButtons) {
  btn.addEventListener("click", () => {
    for (const b of tabButtons) b.classList.remove("mobile-tab--active");
    btn.classList.add("mobile-tab--active");
    const target = btn.dataset.target;
    for (const id of panels) {
      document.getElementById(id).classList.toggle("panel--mobile-active", id === target);
    }
  });
}

editor.setValue(SAMPLES[0].src);
refreshStaticViews();
statsPanel.update(statsCollector.snapshot(cpu.clockCount));

runOnboarding();

function runOnboarding() {
  const STEPS = [
    { title: "CPUに命令を書いてみよう", body: "ここにアセンブリを書きます。最初は用意されたサンプルを選ぶだけでも、CPUの動きを試せます。" },
    { title: "1クロックずつ進めよう", body: "まずは「1クロック」を押してみましょう。命令が小さな処理に分かれて、少しずつ実行されます。" },
    { title: "値が移動する道を見よう", body: "光っている線は、いま値が通っている場所です。どこからどこへ運ばれるかを追ってみましょう。" },
    { title: "CPUの小さな記憶場所", body: "レジスタは、計算中の値を一時的に覚える場所です。書き換わった値に注目してみましょう。" },
    { title: "プログラムとデータの置き場所", body: "RAMには命令とデータが入っています。実行中に読み書きされた場所が変化する様子を確認できます。" },
  ];
  let step = 0;
  try {
    if (localStorage.getItem("pixelcpu-onboarding-done") === "1") return;
  } catch {
    // localStorage unavailable (private mode etc.) - just show onboarding every time.
  }

  const overlay = document.getElementById("onboarding");
  const titleEl = document.getElementById("onboarding-title");
  const bodyEl = document.getElementById("onboarding-body");
  const nextBtn = document.getElementById("onboarding-next");
  const skipBtn = document.getElementById("onboarding-skip");

  function render() {
    titleEl.textContent = STEPS[step].title;
    bodyEl.textContent = STEPS[step].body;
    nextBtn.textContent = step === STEPS.length - 1 ? "はじめる" : "次へ";
  }

  function finish() {
    overlay.hidden = true;
    try {
      localStorage.setItem("pixelcpu-onboarding-done", "1");
    } catch {
      // ignore
    }
  }

  nextBtn.addEventListener("click", () => {
    step++;
    if (step >= STEPS.length) {
      finish();
      return;
    }
    render();
  });
  skipBtn.addEventListener("click", finish);

  overlay.hidden = false;
  render();
}
