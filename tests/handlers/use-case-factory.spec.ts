import { describe, expect, it, vi } from "vitest";
import { getCreateOrUpdateTransactionsAggregateUseCase, getCreateTransactionUseCase, getRetrieveBalanceByUserIdUseCase } from "../../src/handlers/use-case-factory.utils";
import { CreateOrUpdateTransactionsAggregateUseCaseImpl } from "../../src/usecases/create-or-update-transactions-aggregate.usecase";
import { CreateTransactionUseCaseImpl } from "../../src/usecases/create-transaction.usecase";
import { RetrieveBalanceByUserIdUseCaseImpl } from "../../src/usecases/retrieve-balance-by-user-id.usecase";

vi.mock("../../src/services/dynamodb.service", () => ({
    getDynamoDBClient: vi.fn(() => { }),
}));

describe("Use case factory", () => {
    describe('Create or update transactions aggregate use case', () => {
        it('should create use case ', () => {
            expect(getCreateOrUpdateTransactionsAggregateUseCase()).toBeInstanceOf(CreateOrUpdateTransactionsAggregateUseCaseImpl);
        });
    });
    describe('Create transaction use case', () => {
        it('should create use case ', () => {
            expect(getCreateTransactionUseCase()).toBeInstanceOf(CreateTransactionUseCaseImpl);
        });
    });
    describe('Retrieve balance by user ID use case', () => {
        it('should create use case ', () => {
            expect(getRetrieveBalanceByUserIdUseCase()).toBeInstanceOf(RetrieveBalanceByUserIdUseCaseImpl);
        });
    });

});