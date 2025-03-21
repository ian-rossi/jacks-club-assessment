import { describe, expect, it } from "vitest";
import { createTransactionExpectingSuccess, randomUserId, getBalanceExpectingSuccess, randomUUIDToUpperCase } from "./client";
import { TransactionType } from "../../src/models/transaction-type.enum";

describe('Task 1', () => {
    it('should return last transaction ammount', async () => {
        const transaction = { userId: randomUserId(), idempotentKey: randomUUIDToUpperCase(), ammount: '1', type: TransactionType.CREDIT };
        await createTransactionExpectingSuccess(transaction);
        const balance = await getBalanceExpectingSuccess(transaction.userId);
        expect(balance).toBe(transaction.ammount);
    })
    it('should return default balance', async () => {
        const balance = await getBalanceExpectingSuccess(randomUserId());
        expect(balance).toBe('100');
    });
})