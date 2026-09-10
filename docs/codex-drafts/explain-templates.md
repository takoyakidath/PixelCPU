# micro-op 日本語解説テンプレート

イベントのフィールド値は `{フィールド名}` の形で埋め込みます。`flag-update` では `flags` 内の各値を `{Z}`、`{C}`、`{N}` として扱います。

| イベントtype | テンプレート文言 |
|---|---|
| `bus-transfer` | `{from}から{to}へ、値{value}が{bus}バスを通って送られました。` |
| `alu-op` | `計算を担当するALUが、{a}と{b}に{op}演算を行い、結果{result}を得ました。` |
| `flag-update` | `計算結果の状態を示すフラグが更新されました（Z={Z}、C={C}、N={N}）。` |
| `register-write` | `一時的に値を覚えるレジスタ{reg}に、{value}が書き込まれました。` |
| `pc-update` | `次に実行する命令の場所を示すプログラムカウンタが、{value}に進みました。` |
| `stack-op` | `値{value}をスタックで{op}し、次の位置を示すSPが{sp}になりました。` |
| `decode` | `命令を解読し、{mnemonic}（命令コード{opcode}、形式{format}）だと分かりました。` |
