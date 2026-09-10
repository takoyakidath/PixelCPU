# PixelCPU 設計spec (3日クラッシュ版)

ZEN Study「動くWebページコンテスト」応募作品。8bit CPUエミュレータ+Assembler+Debugger+回路可視化。
Vanilla JS(ランタイムに外部ライブラリなし)。開発ツール(Vite/Vitest)は本番に同梱されないため使用可。

## 核(差別化ポイント)
1. **クロック単位の完全可視化**: Assembly / Machine Code / 回路図が常にPC/IRと同期し、1clock=1 micro-opでアニメーション。
2. **データ転送の定量分析**(時間が余れば): イベントストリームを集計してBUS転送回数などを可視化。
3. **micro-opの日本語解説**: 各イベントを平易な文章に変換し、CPU初心者でも「今何が起きているか」がわかるようにする。

## ISA
レジスタ: A,B,C,D(8bit汎用) / PC(8bit) / SP(8bit) / IR / 内部専用MAR。MDRは省略(DataBusの値を直接IR/レジスタへ)。
Flags: Z, C, N。RAM: 256byte単一空間(フォン・ノイマン型)。

命令フォーマット(全てbyte境界):
- N: opcode 1byte → NOP, HLT, RET
- R: opcode + `[000000][reg:2]` → INC, DEC, NOT, PUSH, POP
- RR: opcode + `[dst:2][src:2][0000]` → MOV r,r / ADD / SUB / AND / OR / XOR / CMP
- RI: opcode + reg byte + data byte → MOV r,imm / LOAD / STORE
- A: opcode + addr byte → JMP / JZ / JNZ / JC / CALL

opcodeは1byteフル使用、上位nibbleでファミリー分け:
```
0x0_ System   : 0x00 NOP, 0x01 HLT
0x1_ Data     : 0x10 MOV r,r  0x11 MOV r,imm  0x12 LOAD r,addr  0x13 STORE r,addr
0x2_ Arith    : 0x20 ADD r,r  0x21 SUB r,r  0x22 INC r  0x23 DEC r
0x3_ Logic    : 0x30 AND r,r  0x31 OR r,r  0x32 XOR r,r  0x33 NOT r
0x4_ Compare  : 0x40 CMP r,r
0x5_ Branch   : 0x50 JMP addr  0x51 JZ addr  0x52 JNZ addr  0x53 JC addr
0x6_ Stack    : 0x60 PUSH r  0x61 POP r  0x62 CALL addr  0x63 RET
```
レジスタID: A=00 B=01 C=10 D=11。PUSHはSP--してから書込み、POPは読んでからSP++(スタックは0xFFから下に伸びる)。

## Fetch/Decode/Execute
`cpu.clock()`が1 T-stateを進め、発生したイベント配列を返す純粋な状態機械(UI非依存)。
共通FETCH(2 T-state): `PC→AddressBus→MAR` / `RAM[MAR]→DataBus→IR; PC++`。
DECODE(1 T-state): IRからopcode/format判定、control signalイベント発火。
オペランドFETCHはFETCHと同じ回路を再利用。EXECUTEは命令ごとに1〜3 T-state。
micro-op列はopcodeごとに`instructionSet.js`のテーブルで定義(データ駆動、if/switch地獄を避ける)。

イベントschema例:
```js
{ type: "bus-transfer", bus: "address"|"data", from, to, value, width: 8 }
{ type: "alu-op", op: "ADD", a, b, result }
{ type: "flag-update", flag: "Z"|"C"|"N", value }
{ type: "register-write", reg, value }
{ type: "phase-change", phase: "FETCH"|"DECODE"|"EXECUTE" }
```

## Assembler
tokenizer→parser→assembler(2パス、ラベル解決)。ソースマップ(行⇔バイトオフセット⇔PC)を保持し、実行中のPCに対応する行をハイライトできるようにする。エラーは行・列付き。

## Simulator
`clock.js`がCPU.clock()を駆動。Run/Pause/Step Clock/Step Instruction/Breakpoint/Speed変更は全てこのラッパーの操作に還元。

## UI/描画
SVGで静的回路図(1回描画)。配線上を流れるbit列トークンは自作requestAnimationFrameのtween/timelineエンジン(`animationEngine.js`)で駆動(pause/step/速度変更に対応するため既存ライブラリ不使用)。回路レイアウトは%アンカーでレスポンシブに。スマホはタブ/アコーディオン構成に組み替え。

## ディレクトリ
```
src/
  core/        cpu.js alu.js registers.js memory.js controlUnit.js instructionSet.js
  assembler/   tokenizer.js parser.js assembler.js
  simulator/   clock.js
  ui/
    diagram/   cpuDiagramRenderer.js animationEngine.js busTokenAnimator.js
    panels/    registerViewer.js ramViewer.js statsPanel.js editor.js explain.js
  main.js
tests/
```

## テスト
Vitest。ALU単体/CPU命令ごと/Assembler/Fibonacci等Integration。レビュー頻度を下げる分、ここが安全網。

## 削る機能(今回は作らない)
ISA自由設計モード、CPU構成可変(レジスタ数/Cache/Pipeline切替)、自作ALU設計、CPU性能比較モード、5段階Pipelineモード。

## 3日スコープ
- Day1: core(CPU/ALU/registers/memory/controlUnit/instructionSet)+テスト、assembler、simulator/clock
- Day2: SVG回路図+animationEngine+bus token animation、Register/RAM/Flagsビューア、micro-op日本語解説、Assembly⇔MachineCode⇔回路同期
- Day3: サンプルプログラム6本、スマホレスポンシブ、簡易オンボーディング、README、デプロイ、バグ修正
- 時間が余れば: 統計パネル(pillar 2)
