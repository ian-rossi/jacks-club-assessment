import Big from "big.js";
import { CreateTransactionInput } from "../models/create-transaction-input.ts";
import { TransactionType } from "../models/transaction-type.enum.ts";
import { type Transaction } from "../models/transaction.interface.ts";

export const getNewBalance: (
    balance: Big,
    transaction: Transaction | CreateTransactionInput
) => Big = (balance, transaction) => {
    const ammount = new Big(transaction.ammount);
    return transaction.type == TransactionType.CREDIT
        ? balance.add(ammount)
        : balance.minus(ammount);
};
