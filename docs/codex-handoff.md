# Codex 並行作業ハンドオフ

PixelCPU (ZEN Studyコンテスト応募作品) を3日クラッシュで作っています。設計全体は
`docs/superpowers/specs/2026-09-10-pixelcpu-design.md` 参照。

Claude(私)がCPUコア/Assembler/回路可視化/アニメーションエンジンなど相互依存の強い部分を
一本で実装しています。Codexにはそれ以外の、**下記の固定仕様さえ守れば独立して作れる部分**を
お願いしたいです。仕様を変えたくなったらこのファイルに書かず、まず私(Claude)に確認してください。

## 触ってはいけないファイル(統合事故防止)

- `src/core/**`
- `src/assembler/**`
- `src/simulator/**`
- `src/ui/diagram/**`
- `src/main.js`

これらは私が実装中で頻繁に変わります。Codexは下の「担当領域」に書いたパス以外を新規作成しないでください。

## 担当領域(独立して進めてOK)

- `src/samples/*.asm` ― サンプルプログラム
- `src/ui/panels/explain.js` の**中身のテンプレート文言のみ**(下記フォーマット厳守。関数の組み込み自体は私がやります。まずは `docs/codex-drafts/explain-templates.md` にプレーンテキストで書き出してもらえればこちらで組み込みます)
- `README.md`(コンテスト応募用の説明文。スクリーンショットは `<!-- TODO screenshot -->` のプレースホルダでOK)
- `vercel.json` / デプロイ設定(静的サイトなのでビルドコマンド `npm run build`, 出力 `dist/` を指定するだけの単純なもの)

## 固定仕様1: アセンブリ構文(Assemblerが依存するので厳守)

```
; セミコロンから行末まではコメント
loop:                  ; ラベルは単独行、識別子+コロン
    MOV A, 5           ; レジスタ, 即値(10進)
    MOV B, 0x03         ; 即値は 0x プレフィックスで16進もOK
    MOV C, A            ; レジスタ, レジスタ
    ADD A, B
    LOAD A, 0x20         ; メモリアドレスも同様
    STORE A, 0x20
    JNZ loop             ; ラベル参照
    HLT
```

- 1行1命令。命令とオペランドの区切りは空白、オペランド同士はカンマ。
- レジスタ名: `A B C D` (大文字小文字どちらでも可、大文字が正)。
- 数値は10進 (`5`, `42`) か `0x` 始まりの16進 (`0x10`, `0xFF`)。範囲は0-255。
- 命令一覧(これ以外の命令は存在しません): `NOP HLT MOV LOAD STORE ADD SUB INC DEC AND OR XOR NOT CMP JMP JZ JNZ JC PUSH POP CALL RET`
  - `MOV` はレジスタ→レジスタ、レジスタ→即値の2形式のみ(メモリは `LOAD`/`STORE` 経由)
  - `INC/DEC/NOT/PUSH/POP` はレジスタ1個のみ
  - `JMP/JZ/JNZ/JC/CALL` はラベルまたは数値アドレス1個のみ
  - `NOP/HLT/RET` はオペランドなし
- RAMは256byte(アドレス0-255)。プログラムはアドレス0から配置される想定。

## 固定仕様2: サンプルプログラム6本の仕様

`src/samples/` に1ファイル1プログラム。ファイル先頭に `;` コメントで日本語の説明(何をするプログラムか、
レジスタ/メモリのどこに結果が入るか)を書くこと。

| ファイル名 | 内容 |
|---|---|
| `01-sum-1-to-10.asm` | 1から10までの和をレジスタAに求める |
| `02-fibonacci.asm` | フィボナッチ数列をNステップ分メモリに書き込む(Nは適当に決めてコメントに明記) |
| `03-multiply-by-add.asm` | 掛け算をADDの繰り返しだけで実装(例: A×Bを求める) |
| `04-memcpy.asm` | メモリのある範囲を別の範囲へコピー |
| `05-stack-subroutine.asm` | CALL/RETを使ったサブルーチン呼び出しの例 |
| `06-bubble-sort.asm` | メモリ上の数列をバブルソート |

**重要**: 上の構文どおりに書いても、私のAssembler実装がまだ完成していないため実際にアセンブル・実行できるかは
私が後で検証します。Codex側での動作確認は不要です(できません)。構文を守って書くことだけお願いします。

## 固定仕様3: micro-opイベントタイプ(explain.js文言用)

イベントは以下のtypeを持ちます。各typeについて「今何が起きているかを表す平易な日本語1文」のテンプレートを
`docs/codex-drafts/explain-templates.md` に書いてください(プレースホルダは `{from}` `{to}` `{value}` `{reg}` など
イベントのフィールド名をそのまま `{}` で囲む形式)。

- `bus-transfer` (fields: bus, from, to, value, width) 例: 「{from}から{to}へ、値{value}がバスを流れました」
- `alu-op` (fields: op, a, b, result) 例: 「ALUが{a}と{b}を{op}演算し、結果{result}を得ました」
- `flag-update` (fields: flags = {Z,C,N}) 例: 「フラグが更新されました(Z={Z} C={C} N={N})」
- `register-write` (fields: reg, value) 例: 「レジスタ{reg}に{value}が書き込まれました」
- `pc-update` (fields: value) 例: 「プログラムカウンタが{value}に進みました」
- `stack-op` (fields: op = push|pop, value, sp) 例: 「値{value}がスタックにpushされました(SP={sp})」
- `decode` (fields: opcode, mnemonic, format) 例: 「命令{mnemonic}をデコードしました」

対象読者は「CPUを初めて触る人」です。専門用語(バス、ALU、フラグ等)は使ってよいですが、1文で「今何が起きたか」が
わかる優しい言い回しにしてください。

## 固定仕様4: 統計パネル(pillar 2、時間が余れば実装)の集計項目

まだ実装するか未定ですが、先にラベル文言だけ用意してもらえると助かります。集計はイベントストリームから
以下のフィールド名で行う想定です(実装は私がやります。文言だけお願いします)。

- `totalClocks` (実行した総クロック数)
- `totalInstructions` (実行した総命令数)
- `busTransferCount` (bus-transferイベントの総数)
- `busTransferBits` (bus-transferイベントのwidth合計、つまり流れた総bit数)
- `aluOpCount` (alu-opイベントの総数)
- `stackOpCount` (stack-opイベントの総数)
- `perInstructionBreakdown` (mnemonicごとの実行回数、例: `{mnemonic: "ADD", count: 3}`)

これらのラベル文言(パネルに表示する日本語の見出し・説明文)を `docs/codex-drafts/stats-panel-copy.md` に書いてください。

## 今後追加するタスク(随時追記)

- [x] サンプルプログラム6本 (`src/samples/*.asm`)
- [x] explain.js テンプレート文言 (`docs/codex-drafts/explain-templates.md`)
- [x] README.md ドラフト
- [x] vercel.json
- [x] `LICENSE` ファイル(MITライセンス推奨。ヘッダーはコピーライト年2026、名義は takoyakidath でお願いします)
- [x] 初回起動時オンボーディングの文言ドラフト(数ステップの案内。「これがレジスタです」的な短い説明を4〜6ステップ程度、`docs/codex-drafts/onboarding-copy.md` に。対象はCPU初心者。まだUI実装前なので、対象要素は「回路図」「レジスタビューア」「RAMビューア」「Debuggerボタン」「コードエディタ」のような抽象的な単位で書いてOK、具体的なDOM要素との紐付けは私がやります)
- [x] §固定仕様4の統計パネル文言ドラフト (`docs/codex-drafts/stats-panel-copy.md`)
- [x] コンテスト提出前チェックリストのドラフト(`docs/codex-drafts/submission-checklist.md` に。例: 公開リポジトリになっているか、README のスクリーンショットTODOが埋まっているか、デプロイURLがPC/スマホ両方のChromeで動くか、ライセンスファイルがあるか、など。ZEN Studyコンテストの提出要件を思い出しながら書いてください)
- [ ] (追加予定があればここに追記していきます)

## 連携の進め方

- Codex側の成果物はファイルとして置いておいてもらえればOK(コミットしてもしなくても、私が後で `git status` /
  該当ディレクトリを確認しに行きます)。
- 仕様を変えたい・矛盾を見つけた場合は、このファイルを直接編集せず、ユーザー経由で私に共有してください
  (私が実装中の仕様と衝突する可能性があるため)。
- 私はこのファイルの「今後追加するタスク」を実装が進むごとに更新します。
