import { describe, expect, it } from "vitest";
import { createTransactionExpectingSuccess, generateRandomString, getBalanceExpectingSuccess } from "./client";
import { TransactionType } from "../../src/models/transaction-type.enum";
import { randomUUID } from "crypto";

describe('Task 1', () => {
    it('should return last transaction ammount', async () => {
        const transaction = { userId: generateRandomString(17), idempotentKey: randomUUID(), ammount: '1', type: TransactionType.CREDIT };
        await createTransactionExpectingSuccess(transaction);
        const balance = await getBalanceExpectingSuccess(transaction.userId);
        expect(balance).toBe(transaction.ammount);
    })
    it('should return default balance', async () => {
        const balance = await getBalanceExpectingSuccess(generateRandomString(17));
        expect(balance).toBe('100');
    });
})