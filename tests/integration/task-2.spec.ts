import { describe, expect, it } from "vitest";
import { createTransaction, createTransactionExpectingSuccess, randomUserId, getBalanceExpectingSuccess, randomUUIDToUpperCase, createTransactionRejectingUnplannedFailure } from "./client";
import { TransactionType } from "../../src/models/transaction-type.enum";

describe('Task 2', () => {
    it('should handle credits & debits', async () => {
        const userId = randomUserId();
        const creditTransaction = { userId, idempotentKey: randomUUIDToUpperCase(), ammount: '1', type: TransactionType.CREDIT };
        await createTransactionExpectingSuccess(creditTransaction);
        const debitTransaction = { userId, idempotentKey: randomUUIDToUpperCase(), ammount: '1', type: TransactionType.DEBIT };
        await createTransactionExpectingSuccess(debitTransaction);
        const balance = await getBalanceExpectingSuccess(creditTransaction.userId);
        expect(balance).toBe('0');
    });
    it('should process the transaction in an idempotent way to prevent duplicate transactions', async () => {
        const creditTransaction = { userId: randomUserId(), idempotentKey: randomUUIDToUpperCase(), ammount: '1', type: TransactionType.CREDIT };
        await Promise.all([
            createTransaction(creditTransaction),
            createTransaction(creditTransaction)
        ]);
        const balance = await getBalanceExpectingSuccess(creditTransaction.userId);
        expect(balance).toBe(creditTransaction.ammount);
    });
    it('should make sure the user balance can\'t drop below 0', async () => {
        const userId = randomUserId();
        const creditTransaction = { userId, idempotentKey: randomUUIDToUpperCase(), ammount: '1', type: TransactionType.CREDIT };
        await createTransactionExpectingSuccess(creditTransaction);
        const debitTransaction = { userId, idempotentKey: randomUUIDToUpperCase(), ammount: '2', type: TransactionType.DEBIT };
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
        const userId = randomUserId();
        const transactionGenerator = () => ({ userId, idempotentKey: randomUUIDToUpperCase(), ammount: '1', type: TransactionType.CREDIT });
        const results = await Promise.allSettled([
            createTransactionRejectingUnplannedFailure(transactionGenerator()),
            createTransactionRejectingUnplannedFailure(transactionGenerator())
        ]);
        const expectedBalance = results.length - results.filter(result => result.status === 'rejected').length;
        const actualBalance = await getBalanceExpectingSuccess(userId);
        expect(actualBalance).toBe(expectedBalance.toString());
    });
})