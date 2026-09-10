; CALLで足し算サブルーチンを呼び出し、RETで呼び出し元へ戻ります。
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
