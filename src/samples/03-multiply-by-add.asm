; 7×6を、ADDによる足し算の繰り返しで計算します。
; 答え42はレジスタCに入ります。Aは7のまま、Bは最後に0になります。

    MOV A, 7
    MOV B, 6
    MOV C, 0

multiply_loop:
    ADD C, A
    DEC B
    JNZ multiply_loop
    HLT
