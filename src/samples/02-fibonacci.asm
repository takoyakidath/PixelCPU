; フィボナッチ数列の最初の10項を計算します。
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
