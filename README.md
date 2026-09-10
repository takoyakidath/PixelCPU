# PixelCPU

PixelCPUは、8bit CPUの中でデータが動く様子を、1クロックずつ目で追えるブラウザ上のCPUエミュレータです。アセンブリを書くと、命令の実行位置、レジスタやRAMの変化、バスを流れる値、ALUの計算が連動して表示されます。

CPUに初めて触れる人が、命令の結果だけでなく「今、内部で何が起きたのか」を直感的に理解できることを目指しています。ZEN Study「動くWebページコンテスト」応募作品です。

<!-- TODO screenshot -->

## 特徴

- 1クロック＝1 micro-opで、フェッチ・デコード・実行を段階的に可視化
- Assembly、Machine Code、回路図をPCとIRに同期して表示
- バス上のデータ転送やALU演算をアニメーションで表現
- 各micro-opをCPU初心者向けの日本語で解説
- Run、Pause、1クロック実行、1命令実行、ブレークポイント、速度変更に対応
- レジスタA〜D、PC、SP、IR、フラグ、256byte RAMの状態を確認可能
- フィボナッチ数列やバブルソートなど、6本のサンプルプログラムを収録

## ローカルで動かす

Node.jsを用意し、次のコマンドを実行します。

```sh
npm install
npm run dev
```

画面に表示されたローカルURLをブラウザで開いてください。

本番用ファイルは次のコマンドで`dist/`に生成されます。

```sh
npm run build
```

テストを実行する場合は次のコマンドを使います。

```sh
npm test
```

## PixelCPUの仕様

PixelCPUは、プログラムとデータが同じRAMを共有するフォン・ノイマン型の小さなCPUです。

| 項目 | 内容 |
|---|---|
| データ幅 | 8bit |
| 汎用レジスタ | A、B、C、D |
| 専用レジスタ | PC、SP、IR、MAR |
| フラグ | Z（ゼロ）、C（キャリー）、N（負数） |
| RAM | 256byte |
| スタック | 0xFFから下方向へ成長 |

利用できる命令は次のとおりです。

```text
NOP HLT MOV LOAD STORE
ADD SUB INC DEC
AND OR XOR NOT CMP
JMP JZ JNZ JC
PUSH POP CALL RET
```

アセンブリでは、レジスタ名に`A`〜`D`、数値に10進数または`0x`から始まる16進数を使えます。

```asm
; 1から10までの合計をAに求める
    MOV A, 0
    MOV B, 10

loop:
    ADD A, B
    DEC B
    JNZ loop
    HLT
```

## サンプルプログラム

`src/samples/`には、次のプログラムを収録しています。

1. 1から10までの合計
2. フィボナッチ数列
3. 足し算の繰り返しによる掛け算
4. メモリ範囲のコピー
5. CALL/RETを使ったサブルーチン
6. バブルソート

## 技術構成

- Vanilla JavaScript
- SVG
- Vite
- Vitest

CPUコアはUIに依存しない状態機械として実装し、各クロックで発生したイベントを画面の描画と日本語解説へ渡します。外部のUIライブラリやアニメーションライブラリには依存せず、CPUの動きに合わせた表示をJavaScriptとSVGで構成しています。
