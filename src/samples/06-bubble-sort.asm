; メモリ0xF0から0xF4に置いた 7, 2, 9, 1, 5 を昇順に並べ替えます。
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
