import type BigSource from "big.js";

export interface TransactionAggregate {
    userId: string;
    balance: BigSource;
    isLocked: boolean;
}
