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
import { ToastBar } from "./ui/panels/toast.js";
import { ArrayView } from "./ui/panels/arrayView.js";

import sample1 from "./samples/01-sum-1-to-10.asm?raw";
import sample2 from "./samples/02-fibonacci.asm?raw";
import sample3 from "./samples/03-multiply-by-add.asm?raw";
import sample4 from "./samples/04-memcpy.asm?raw";
import sample5 from "./samples/05-stack-subroutine.asm?raw";
import sample6 from "./samples/06-bubble-sort.asm?raw";

const SAMPLES = [
  { label: "1〜10までの合計", src: sample1 },
  { label: "フィボナッチ数列", src: sample2, watches: [{ start: 0xe0, length: 10, label: "フィボナッチ数列 (0xE0〜0xE9)" }] },
  { label: "掛け算(ADDの繰り返し)", src: sample3 },
  {
    label: "メモリコピー",
    src: sample4,
    watches: [
      { start: 0xe0, length: 4, label: "コピー元 (0xE0〜0xE3)" },
      { start: 0xf0, length: 4, label: "コピー先 (0xF0〜0xF3)" },
    ],
  },
  { label: "CALL/RETサブルーチン", src: sample5 },
  { label: "バブルソート", src: sample6, watches: [{ start: 0xf0, length: 5, label: "ソート対象の配列 (0xF0〜0xF4)" }] },
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
      toast.show(
        "breakpoint-set",
        "ブレークポイントを設定しました。「Run」を押すと、この行の直前で自動的に止まります。",
      );
    }
  },
});
const diagramRenderer = new CpuDiagramRenderer(document.getElementById("cpu-diagram"));
const animationEngine = new AnimationEngine();
const busTokenAnimator = new BusTokenAnimator(diagramRenderer, animationEngine);
const statsPanel = new StatsPanel(document.getElementById("stats-root"));
const statsCollector = new StatsCollector();
const toast = new ToastBar(document.getElementById("toast-root"));
const arrayView = new ArrayView(document.getElementById("array-view-root"));

const machineCodeEl = document.getElementById("machine-code");
const explainTextEl = document.getElementById("explain-text");
const clockCountEl = document.getElementById("clock-count");
const pipelineStages = document.querySelectorAll(".pipeline-stage");
const sampleSelect = document.getElementById("sample-select");

let currentSourceMap = null;
let lastTouchedRamAddr = null;
let currentSampleIdx = null;

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
  arrayView.update(state.ram, lastTouchedRamAddr);
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

    if (event.type === "halt") {
      toast.show("first-halt", "プログラムの実行が完了しました。「Reset」を押すと最初からやり直せます。");
    }
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
    arrayView.setWatches(currentSampleIdx !== null ? SAMPLES[currentSampleIdx].watches : undefined);
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
  currentSampleIdx = Number(idx);
  editor.setValue(SAMPLES[Number(idx)].src);
});
// Any manual keystroke means the loaded text is no longer necessarily the
// selected sample verbatim, so drop the array-view association with it.
editor.textarea.addEventListener("input", () => {
  currentSampleIdx = null;
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

currentSampleIdx = 0;
editor.setValue(SAMPLES[0].src);
refreshStaticViews();
statsPanel.update(statsCollector.snapshot(cpu.clockCount));

runOnboarding();

function runOnboarding() {
  // Each step highlights the real panel it talks about (a glowing ring +
  // page dimmed elsewhere via CSS box-shadow) instead of describing UI
  // abstractly in a floating modal, so the explanation and the actual
  // element stay visually connected. On mobile, switching to a step also
  // switches to that panel's tab so it's actually visible.
  const STEPS = [
    {
      title: "CPUに命令を書いてみよう",
      body: "ここにアセンブリを書きます。最初は用意されたサンプルを選ぶだけでも、CPUの動きを試せます。",
      target: "panel-code",
    },
    {
      title: "1クロックずつ進めよう",
      body: "まずは「1クロック」を押してみましょう。命令はFETCH→DECODE→EXECUTEという小さな段階に分かれて、少しずつ実行されます。",
      target: "debugger-controls",
    },
    {
      title: "値が移動する道を見よう",
      body: "光っている線は、いま値が通っている場所です。PCやMARなど略語にマウスを乗せると、それぞれの役割の説明が出ます。",
      target: "panel-diagram",
    },
    {
      title: "CPUの小さな記憶場所",
      body: "レジスタは、計算中の値を一時的に覚える場所です。BIN(2進数)/DEC(10進数)/HEX(16進数)の見出しにマウスを乗せると読み方の説明が出ます。",
      target: "panel-registers",
    },
    {
      title: "プログラムとデータの置き場所",
      body: "RAMには命令とデータが入っています。実行中に読み書きされた場所が水色にハイライトされます。",
      target: "panel-ram",
    },
  ];
  let step = 0;
  let highlightedEl = null;
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

  function clearHighlight() {
    if (highlightedEl) highlightedEl.classList.remove("onboarding-highlight");
    highlightedEl = null;
  }

  function render() {
    const current = STEPS[step];
    titleEl.textContent = current.title;
    bodyEl.textContent = current.body;
    nextBtn.textContent = step === STEPS.length - 1 ? "はじめる" : "次へ";

    clearHighlight();
    const tabBtn = document.querySelector(`.mobile-tab[data-target="${current.target}"]`);
    if (tabBtn) tabBtn.click();
    const targetEl = document.getElementById(current.target);
    if (targetEl) {
      targetEl.classList.add("onboarding-highlight");
      highlightedEl = targetEl;
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function finish(withDemo) {
    clearHighlight();
    overlay.hidden = true;
    try {
      localStorage.setItem("pixelcpu-onboarding-done", "1");
    } catch {
      // ignore
    }
    // Bridge "reading about it" to "seeing it move": completing the full
    // walkthrough loads the sample already in the editor and advances one
    // real clock tick, so the very first thing the user sees afterward is
    // an actual bus-transfer animation, not an empty diagram.
    if (withDemo) {
      loadProgram(editor.getValue());
      controller.tick();
      toast.show("onboarding-demo", "これが最初の1クロックです。「1クロック」を押すと続きを進められます。");
    }
  }

  nextBtn.addEventListener("click", () => {
    step++;
    if (step >= STEPS.length) {
      finish(true);
      return;
    }
    render();
  });
  skipBtn.addEventListener("click", () => finish(false));

  overlay.hidden = false;
  render();
}
