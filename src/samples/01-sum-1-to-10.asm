; 1から10までの整数を足し、合計55をレジスタAに求めます。
; レジスタBは、10から1まで数えるカウンターとして使います。

    MOV A, 0
    MOV B, 10

loop:
    ADD A, B
    DEC B
    JNZ loop
    HLT
