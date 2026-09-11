// Sample program sources, inlined as plain JS strings instead of files
// loaded via a bundler-specific import (e.g. Vite's `?raw` suffix), so the
// page has zero build-tool dependency: these files can be opened straight
// from index.html via native <script type="module"> with no build step.

export const SAMPLE_SUM_1_TO_10 = `; 1から10までの整数を足し、合計55をレジスタAに求めます。
; レジスタBは、10から1まで数えるカウンターとして使います。

    MOV A, 0
    MOV B, 10

loop:
    ADD A, B
    DEC B
    JNZ loop
    HLT
`;

export const SAMPLE_FIBONACCI = `; フィボナッチ数列の最初の10項を計算します。
; 結果の 0, 1, 1, 2, 3, 5, 8, 13, 21, 34 は
; メモリ0xE0から0xE9に順番に書き込まれます。

    MOV A, 0
    MOV B, 1

    STORE A, 0xE0
    MOV C, A
    ADD C, B
    MOV A, B
    MOV B, C

    STORE A, 0xE1
    MOV C, A
    ADD C, B
    MOV A, B
    MOV B, C

    STORE A, 0xE2
    MOV C, A
    ADD C, B
    MOV A, B
    MOV B, C

    STORE A, 0xE3
    MOV C, A
    ADD C, B
    MOV A, B
    MOV B, C

    STORE A, 0xE4
    MOV C, A
    ADD C, B
    MOV A, B
    MOV B, C

    STORE A, 0xE5
    MOV C, A
    ADD C, B
    MOV A, B
    MOV B, C

    STORE A, 0xE6
    MOV C, A
    ADD C, B
    MOV A, B
    MOV B, C

    STORE A, 0xE7
    MOV C, A
    ADD C, B
    MOV A, B
    MOV B, C

    STORE A, 0xE8
    MOV C, A
    ADD C, B
    MOV A, B
    MOV B, C

    STORE A, 0xE9
    HLT
`;

export const SAMPLE_MULTIPLY_BY_ADD = `; 7×6を、ADDによる足し算の繰り返しで計算します。
; 答え42はレジスタCに入ります。Aは7のまま、Bは最後に0になります。

    MOV A, 7
    MOV B, 6
    MOV C, 0

multiply_loop:
    ADD C, A
    DEC B
    JNZ multiply_loop
    HLT
`;

export const SAMPLE_MEMCPY = `; メモリ0xE0から0xE3の4バイトを、0xF0から0xF3へコピーします。
; コピー元には例として 10, 20, 30, 40 を用意し、コピー後も元の値は残ります。

    MOV A, 10
    STORE A, 0xE0
    MOV A, 20
    STORE A, 0xE1
    MOV A, 30
    STORE A, 0xE2
    MOV A, 40
    STORE A, 0xE3

    LOAD A, 0xE0
    STORE A, 0xF0
    LOAD A, 0xE1
    STORE A, 0xF1
    LOAD A, 0xE2
    STORE A, 0xF2
    LOAD A, 0xE3
    STORE A, 0xF3
    HLT
`;

export const SAMPLE_STACK_SUBROUTINE = `; CALLで足し算サブルーチンを呼び出し、RETで呼び出し元へ戻ります。
; 5+7の答え12はレジスタAに入ります。BはPUSH/POPで7に保たれます。

    MOV A, 5
    MOV B, 7
    CALL add_values
    HLT

add_values:
    PUSH B
    ADD A, B
    POP B
    RET
`;

export const SAMPLE_BUBBLE_SORT = `; メモリ0xF0から0xF4に置いた 7, 2, 9, 1, 5 を昇順に並べ替えます。
; 終了時には同じ範囲に 1, 2, 5, 7, 9 が入ります。
; 間接アドレッシングがないため、5要素の比較を順番に展開しています。

    MOV A, 7
    STORE A, 0xF0
    MOV A, 2
    STORE A, 0xF1
    MOV A, 9
    STORE A, 0xF2
    MOV A, 1
    STORE A, 0xF3
    MOV A, 5
    STORE A, 0xF4

    LOAD A, 0xF0
    LOAD B, 0xF1
    CMP A, B
    JC pass1_pair1_done
    JZ pass1_pair1_done
    STORE B, 0xF0
    STORE A, 0xF1
pass1_pair1_done:
    LOAD A, 0xF1
    LOAD B, 0xF2
    CMP A, B
    JC pass1_pair2_done
    JZ pass1_pair2_done
    STORE B, 0xF1
    STORE A, 0xF2
pass1_pair2_done:
    LOAD A, 0xF2
    LOAD B, 0xF3
    CMP A, B
    JC pass1_pair3_done
    JZ pass1_pair3_done
    STORE B, 0xF2
    STORE A, 0xF3
pass1_pair3_done:
    LOAD A, 0xF3
    LOAD B, 0xF4
    CMP A, B
    JC pass1_pair4_done
    JZ pass1_pair4_done
    STORE B, 0xF3
    STORE A, 0xF4
pass1_pair4_done:

    LOAD A, 0xF0
    LOAD B, 0xF1
    CMP A, B
    JC pass2_pair1_done
    JZ pass2_pair1_done
    STORE B, 0xF0
    STORE A, 0xF1
pass2_pair1_done:
    LOAD A, 0xF1
    LOAD B, 0xF2
    CMP A, B
    JC pass2_pair2_done
    JZ pass2_pair2_done
    STORE B, 0xF1
    STORE A, 0xF2
pass2_pair2_done:
    LOAD A, 0xF2
    LOAD B, 0xF3
    CMP A, B
    JC pass2_pair3_done
    JZ pass2_pair3_done
    STORE B, 0xF2
    STORE A, 0xF3
pass2_pair3_done:

    LOAD A, 0xF0
    LOAD B, 0xF1
    CMP A, B
    JC pass3_pair1_done
    JZ pass3_pair1_done
    STORE B, 0xF0
    STORE A, 0xF1
pass3_pair1_done:
    LOAD A, 0xF1
    LOAD B, 0xF2
    CMP A, B
    JC pass3_pair2_done
    JZ pass3_pair2_done
    STORE B, 0xF1
    STORE A, 0xF2
pass3_pair2_done:

    LOAD A, 0xF0
    LOAD B, 0xF1
    CMP A, B
    JC sorted
    JZ sorted
    STORE B, 0xF0
    STORE A, 0xF1

sorted:
    HLT
`;
