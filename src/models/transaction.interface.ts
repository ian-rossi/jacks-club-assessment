import type BigSource from "big.js";
import { type TransactionType } from "./transaction-type.enum.ts";

export interface Transaction {
    id: string;
    userId: string;
    ammount: BigSource;
    type: TransactionType;
}
