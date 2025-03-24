import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionsRepository } from "../../../src/repositories/transactions.repository";
import { TransactionsAggregateRepository } from "../../../src/repositories/transactions-aggregate.repository";
import { UsersRepository } from "../../../src/repositories/users.repository";
import { RetrieveBalanceByUserIdUseCaseImpl } from "../../../src/usecases/retrieve-balance-by-user-id.usecase";
import { RetrieveBalanceByUserIdInput } from "../../../src/models/retrieve-balance-by-user-id-input";
import { RFC9457Output } from "../../../src/models/rfc-9457-output.interface";
import { APIGatewayProxyResult } from "aws-lambda";
import Big from "big.js";
import { CreateTransactionInput } from "../../../src/models/create-transaction-input";
import { TransactionType } from "../../../src/models/transaction-type.enum";
import { TransactionAggregate } from "../../../src/models/transaction-aggregate.interface";

describe('Retrieve balance by user ID use case', () => {
    describe('execute', () => {

        beforeEach(() => {
            const date = new Date(2021, 3, 2, 21, 0, 0, 0);
            vi.useFakeTimers()
            vi.setSystemTime(date);
        })

        afterEach(vi.useRealTimers)

        it('should throw not found response when user not exists', async () => {
            // Arrange
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {} as any;
            const transactionsRepositoryMock: TransactionsRepository = {} as any;
            const userRepositoryMock: UsersRepository = {
                notExistsById: (_) => true
            };
            const useCase = new RetrieveBalanceByUserIdUseCaseImpl(transactionsRepositoryMock, transactionsAggregateRepositoryMock, userRepositoryMock);
            const input: RetrieveBalanceByUserIdInput = {
                userId: '1',
            };
            const expectedBody: RFC9457Output = {
                status: 404,
                title: 'Not found',
                detail: 'User not found.'
            };
            const expectedThrownObject: APIGatewayProxyResult = {
                statusCode: expectedBody.status, body: JSON.stringify(expectedBody)
            };

            // Act and Assert
            expect(async () => await useCase.execute(input)).rejects.toStrictEqual(expectedThrownObject);
        });

        it('should just return current balance when balance for user ID exists', async () => {
            // Arrange
            const expectedBalance = new Big(1);
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                findBalanceByUserId: vi.fn().mockResolvedValueOnce(expectedBalance)
            } as any;
            const transactionsRepositoryMock: TransactionsRepository = {} as any;
            const userRepositoryMock: UsersRepository = {
                notExistsById: (_) => false
            };
            const useCase = new RetrieveBalanceByUserIdUseCaseImpl(transactionsRepositoryMock, transactionsAggregateRepositoryMock, userRepositoryMock);
            const input: RetrieveBalanceByUserIdInput = {
                userId: '1',
            };

            // Act
            const balance = await useCase.execute(input);

            // Act
            expect(balance).toBe(expectedBalance);
            expect(transactionsAggregateRepositoryMock.findBalanceByUserId).toHaveBeenCalledExactlyOnceWith(input.userId);
        });

        it('should create 100 ammount credit transaction for user and revalidate current balance when balance for user ID not exists', async () => {
            // Arrange
            const expectedBalance = new Big(100);
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                findBalanceByUserId: vi.fn().mockResolvedValueOnce(null)
            } as any;
            const transactionsRepositoryMock: TransactionsRepository = {
                createAndUpdateTransactionsAggregate: vi.fn()
            } as any;
            const userRepositoryMock: UsersRepository = {
                notExistsById: (_) => false
            };
            const useCase = new RetrieveBalanceByUserIdUseCaseImpl(transactionsRepositoryMock, transactionsAggregateRepositoryMock, userRepositoryMock);
            const input: RetrieveBalanceByUserIdInput = {
                userId: '1',
            };
            const expectedTransactionInput: CreateTransactionInput = {
                ammount: 100,
                idempotentKey: `100:credit:1:2021-3-3T0:0`,
                type: TransactionType.CREDIT,
                userId: input.userId
            };
            const expectedTransactionsAggregateInput: TransactionAggregate = {
                userId: input.userId,
                balance: expectedTransactionInput.ammount.toString()
            }

            // Act
            const balance = await useCase.execute(input);

            // Act
            expect(balance).toStrictEqual(expectedBalance);
            expect(transactionsAggregateRepositoryMock.findBalanceByUserId).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(transactionsRepositoryMock.createAndUpdateTransactionsAggregate).toHaveBeenCalledExactlyOnceWith(
                expectedTransactionInput, expectedTransactionsAggregateInput
            );
        });

    })
});