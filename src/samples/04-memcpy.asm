; メモリ0xE0から0xE3の4バイトを、0xF0から0xF3へコピーします。
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
