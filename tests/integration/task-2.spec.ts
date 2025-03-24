import { describe, expect, it } from "vitest";
import { createTransaction, createTransactionExpectingSuccess, generateRandomString, getBalanceExpectingSuccess } from "./client";
import { TransactionType } from "../../src/models/transaction-type.enum";
import { randomUUID } from "crypto";

describe('Task 2', () => {
    it('should handle credits & debits', async () => {
        const userId = generateRandomString(17); 
        const creditTransaction = { userId, idempotentKey: randomUUID(), ammount: '1', type: TransactionType.CREDIT };
        await createTransactionExpectingSuccess(creditTransaction);
        const debitTransaction = { userId, idempotentKey: randomUUID(), ammount: '1', type: TransactionType.DEBIT };
        await createTransactionExpectingSuccess(debitTransaction);
        const balance = await getBalanceExpectingSuccess(creditTransaction.userId);
        expect(balance).toBe('0');
    });
    it('should process the transaction in an idempotent way to prevent duplicate transactions', async () => {
        const creditTransaction = { userId: generateRandomString(17), idempotentKey: randomUUID(), ammount: '1', type: TransactionType.CREDIT };
        await Promise.all([
            createTransactionExpectingSuccess(creditTransaction),
            createTransactionExpectingSuccess(creditTransaction)
        ]);
        const balance = await getBalanceExpectingSuccess(creditTransaction.userId);
        expect(balance).toBe(creditTransaction.ammount);
    });
    it('should make sure the user balance can\'t drop below 0', async () => {
        const userId = generateRandomString(17);
        const creditTransaction = { userId, idempotentKey: randomUUID(), ammount: '1', type: TransactionType.CREDIT };
        await createTransactionExpectingSuccess(creditTransaction);
        const debitTransaction = { userId, idempotentKey: randomUUID(), ammount: '2', type: TransactionType.DEBIT };
        const response = await createTransaction(debitTransaction);
        expect(response.status).toBe(422);
        const responseJson = await response.json();
        expect(responseJson).toStrictEqual({
            status: 422,
            title: 'Unprocessable entity',
            detail: "Your balance can't be negative.",
            instance: "/transactions"
        });
    });
    it('should make sure no race condition can happen', async () => {
        const userId = generateRandomString(17);
        const transactionOne = { userId, idempotentKey: randomUUID(), ammount: '1', type: TransactionType.CREDIT };
        const transactionTwo = { userId, idempotentKey: randomUUID(), ammount: '1', type: TransactionType.CREDIT };
        await Promise.all([
            createTransactionExpectingSuccess(transactionOne),
            createTransactionExpectingSuccess(transactionTwo)
        ]);
        const balance = await getBalanceExpectingSuccess(transactionOne.userId);
        expect(balance).toBe('2');
    });
})