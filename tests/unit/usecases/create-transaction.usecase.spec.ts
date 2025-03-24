import { describe, expect, it, vi } from "vitest";
import { TransactionsRepository } from "../../../src/repositories/transactions.repository";
import { TransactionsAggregateRepository } from "../../../src/repositories/transactions-aggregate.repository";
import { UsersRepository } from "../../../src/repositories/users.repository";
import { CreateTransactionUseCaseImpl } from "../../../src/usecases/create-transaction.usecase";
import Big from "big.js";
import { TransactionType } from "../../../src/models/transaction-type.enum";
import { CreateTransactionInput } from "../../../src/models/create-transaction-input";
import { RFC9457Output } from "../../../src/models/rfc-9457-output.interface";
import { APIGatewayProxyResult } from "aws-lambda";

describe('Create transaction use case', () => {
    describe('execute', () => {
        it('should throw not found response when user not exists', async () => {
            // Arrange
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {} as any;
            const transactionsRepositoryMock: TransactionsRepository = {} as any;
            const userRepositoryMock: UsersRepository = {
                notExistsById: (_) => true
            };
            const useCase = new CreateTransactionUseCaseImpl(
                transactionsRepositoryMock, 
                transactionsAggregateRepositoryMock, 
                userRepositoryMock
            );
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: '3',
                type: TransactionType.CREDIT
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

        it('should throw unprocessable entity response when user has no balance and transaction type is debit', async () => {
            // Arrange
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                findBalanceByUserId: vi.fn().mockResolvedValue(null)
            } as any;
            const transactionsRepositoryMock: TransactionsRepository = {} as any;
            const userRepositoryMock: UsersRepository = {
                notExistsById: (_) => false
            };
            const useCase = new CreateTransactionUseCaseImpl(
                transactionsRepositoryMock, 
                transactionsAggregateRepositoryMock, 
                userRepositoryMock
            );
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: '3',
                type: TransactionType.DEBIT
            };
            const expectedBody: RFC9457Output = {
                status: 422,
                title: 'Unprocessable entity',
                detail: "Your balance can't be negative."
            };
            const expectedThrownObject: APIGatewayProxyResult = {
                statusCode: expectedBody.status, body: JSON.stringify(expectedBody)
            };

            // Act and Assert
            expect(async () => await useCase.execute(input)).rejects.toStrictEqual(expectedThrownObject);
        });

        it('should throw unprocessable entity response when user has balance but transaction type is debit and ammount is greater than balance', async () => {
            // Arrange
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                findBalanceByUserId: vi.fn().mockResolvedValue(new Big(1))
            } as any;
            const transactionsRepositoryMock: TransactionsRepository = {} as any;
            const userRepositoryMock: UsersRepository = {
                notExistsById: (_) => false
            };
            const useCase = new CreateTransactionUseCaseImpl(
                transactionsRepositoryMock, 
                transactionsAggregateRepositoryMock, 
                userRepositoryMock
            );
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: '2',
                type: TransactionType.DEBIT
            };
            const expectedBody: RFC9457Output = {
                status: 422,
                title: 'Unprocessable entity',
                detail: "Your balance can't be negative."
            };
            const expectedThrownObject: APIGatewayProxyResult = {
                statusCode: expectedBody.status, body: JSON.stringify(expectedBody)
            };

            // Act and Assert
            expect(async () => await useCase.execute(input)).rejects.toStrictEqual(expectedThrownObject);
        });

        it('should create transaction successfully', async () => {
            // Arrange
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                findBalanceByUserId: vi.fn().mockResolvedValue(null),
                createOrUpdate: vi.fn()
            } as any;
            const expectedTransactionId = '00000000-0000-0000-0000-0000000000000000';
            const transactionsRepositoryMock: TransactionsRepository = {
                createAndUpdateTransactionsAggregate: vi.fn().mockResolvedValueOnce(expectedTransactionId)
            } as any;
            const userRepositoryMock: UsersRepository = {
                notExistsById: (_) => false
            };
            const useCase = new CreateTransactionUseCaseImpl(
                transactionsRepositoryMock, 
                transactionsAggregateRepositoryMock, 
                userRepositoryMock
            );
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: '3',
                type: TransactionType.CREDIT
            };

            // Act
            const id = await useCase.execute(input);

            // Assert
            expect(id).toBe(expectedTransactionId);
        });

    })
});