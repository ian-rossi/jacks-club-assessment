import { APIGatewayProxyResult } from "aws-lambda";
import Big from "big.js";
import { describe, expect, it, vi } from "vitest";
import { CreateTransactionInput } from "../../../src/models/create-transaction-input";
import { RetrieveBalanceByUserIdInput } from "../../../src/models/retrieve-balance-by-user-id-input";
import { RFC9457Output } from "../../../src/models/rfc-9457-output.interface";
import { TransactionAggregate } from "../../../src/models/transaction-aggregate.interface";
import { TransactionType } from "../../../src/models/transaction-type.enum";
import { TransactionsAggregateRepository } from "../../../src/repositories/transactions-aggregate.repository";
import { UsersRepository } from "../../../src/repositories/users.repository";
import { RetrieveBalanceByUserIdUseCaseImpl } from "../../../src/usecases/retrieve-balance-by-user-id.usecase";
import { UsersService } from "../../../src/services/users.service";
import { UseCase } from "../../../src/usecases/usecase.interface";
import { CreateTransactionOutput } from "../../../src/models/create-transaction-output.interface";

describe('Retrieve balance by user ID use case', () => {
    describe('execute', () => {

        it('should just return current balance when balance for user ID exists', async () => {
            // Arrange
            const expectedBalance = new Big(1);
            const createTransactionUseCaseMock: UseCase<CreateTransactionInput, CreateTransactionOutput> = {} as any;
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                findBalanceByUserId: vi.fn().mockResolvedValueOnce(expectedBalance)
            } as any;
            const usersServiceMock: UsersService = {
                checkIfUserExists: vi.fn()
            } as any;
            const useCase = new RetrieveBalanceByUserIdUseCaseImpl(
                createTransactionUseCaseMock, transactionsAggregateRepositoryMock, usersServiceMock
            );
            const input: RetrieveBalanceByUserIdInput = {
                userId: '1',
            };

            // Act
            const balance = await useCase.execute(input);

            // Assert
            expect(balance).toBe(expectedBalance);
            expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(transactionsAggregateRepositoryMock.findBalanceByUserId).toHaveBeenCalledExactlyOnceWith(input.userId);
        });

        it('should create 100 ammount credit transaction for user and revalidate current balance when balance for user ID not exists', async () => {
            // Arrange
            const expectedBalance = new Big(2);
            const createTransactionUseCaseMock: UseCase<CreateTransactionInput, CreateTransactionOutput> = {
                execute: vi.fn().mockResolvedValueOnce({ newBalance: expectedBalance })
            };
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                findBalanceByUserId: vi.fn().mockResolvedValueOnce(null)
            } as any;
            const usersServiceMock: UsersService = {
                checkIfUserExists: vi.fn()
            } as any;
            const useCase = new RetrieveBalanceByUserIdUseCaseImpl(
                createTransactionUseCaseMock, transactionsAggregateRepositoryMock, usersServiceMock
            );
            const input: RetrieveBalanceByUserIdInput = {
                userId: '1',
            };
            const expectedTransactionInput: CreateTransactionInput = {
                ammount: 100,
                idempotentKey: '1.',
                type: TransactionType.CREDIT,
                userId: input.userId
            };

            // Act
            const balance = await useCase.execute(input);

            // Act
            expect(balance).toStrictEqual(expectedBalance);
            expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(transactionsAggregateRepositoryMock.findBalanceByUserId).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(createTransactionUseCaseMock.execute).toHaveBeenCalledExactlyOnceWith(expectedTransactionInput);
        });

        it('should revalidate balance when HTTP status code thrown by create transaction use case is 412', async () => {
            // Arrange
            const expectedBalance = new Big(2);
            const expectedError = { statusCode: 412, body: 'a' };
            const createTransactionUseCaseMock: UseCase<CreateTransactionInput, CreateTransactionOutput> = {
                execute: vi.fn().mockRejectedValueOnce(expectedError)
            };
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                findBalanceByUserId: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(expectedBalance)
            } as any;
            const usersServiceMock: UsersService = {
                checkIfUserExists: vi.fn()
            } as any;
            const useCase = new RetrieveBalanceByUserIdUseCaseImpl(
                createTransactionUseCaseMock, transactionsAggregateRepositoryMock, usersServiceMock
            );
            const input: RetrieveBalanceByUserIdInput = {
                userId: '1',
            };
            const expectedTransactionInput: CreateTransactionInput = {
                ammount: 100,
                idempotentKey: '1.',
                type: TransactionType.CREDIT,
                userId: input.userId
            };
            const consoleWarnSpy = vi.spyOn(console, 'warn');

            // Act
            const balance = await useCase.execute(input);

            // Act
            expect(balance).toStrictEqual(expectedBalance);
            expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(transactionsAggregateRepositoryMock.findBalanceByUserId).toHaveBeenCalledTimes(2);
            expect(transactionsAggregateRepositoryMock.findBalanceByUserId).toHaveBeenCalledWith(input.userId);
            expect(createTransactionUseCaseMock.execute).toHaveBeenCalledExactlyOnceWith(expectedTransactionInput);
            expect(consoleWarnSpy).toHaveBeenCalledExactlyOnceWith(expectedError);
        });

        it('should throw error when any other error happens on create transaction', async () => {
            // Arrange
            const expectedError = {};
            const createTransactionUseCaseMock: UseCase<CreateTransactionInput, CreateTransactionOutput> = {
                execute: vi.fn().mockRejectedValueOnce(expectedError)
            };
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                findBalanceByUserId: vi.fn().mockResolvedValueOnce(null)
            } as any;
            const usersServiceMock: UsersService = {
                checkIfUserExists: vi.fn()
            } as any;
            const useCase = new RetrieveBalanceByUserIdUseCaseImpl(
                createTransactionUseCaseMock, transactionsAggregateRepositoryMock, usersServiceMock
            );
            const input: RetrieveBalanceByUserIdInput = {
                userId: '1',
            };
            const expectedTransactionInput: CreateTransactionInput = {
                ammount: 100,
                idempotentKey: '1.',
                type: TransactionType.CREDIT,
                userId: input.userId
            };

            // Act and Assert
            await expect(async () => await useCase.execute(input)).rejects.toStrictEqual(expectedError);

            // Act
            expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(transactionsAggregateRepositoryMock.findBalanceByUserId).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(createTransactionUseCaseMock.execute).toHaveBeenCalledExactlyOnceWith(expectedTransactionInput);
        });

    })
});