import type Big from "big.js";

export interface CreateTransactionOutput {
    id: string;
    newBalance: Big;
}
