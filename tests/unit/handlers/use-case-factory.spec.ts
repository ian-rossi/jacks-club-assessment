import { describe, expect, it } from "vitest";
import { getCreateTransactionUseCase, getRetrieveBalanceByUserIdUseCase } from "../../../src/handlers/use-case-factory.utils";
import { CreateTransactionUseCaseImpl } from "../../../src/usecases/create-transaction.usecase";
import { RetrieveBalanceByUserIdUseCaseImpl } from "../../../src/usecases/retrieve-balance-by-user-id.usecase";

describe("Use case factory", () => {
    describe('Create transaction use case', () => {
        it('should create use case', () => {
            expect(getCreateTransactionUseCase()).toBeInstanceOf(CreateTransactionUseCaseImpl);
        });
    });
    describe('Retrieve balance by user ID use case', () => {
        it('should create use case', () => {
            expect(getRetrieveBalanceByUserIdUseCase()).toBeInstanceOf(RetrieveBalanceByUserIdUseCaseImpl);
        });
    });
});