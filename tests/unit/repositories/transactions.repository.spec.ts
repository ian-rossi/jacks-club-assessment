import { describe, expect, it, vi } from "vitest";
import { TransactionsRepository } from '../../../src/repositories/transactions.repository'
import { DynamoDBClient, type TransactWriteItemsCommandInput, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { CreateTransactionInput } from "../../../src/models/create-transaction-input";
import Big from "big.js";
import { TransactionType } from "../../../src/models/transaction-type.enum";
import { TransactionsAggregateRepository } from "../../../src/repositories/transactions-aggregate.repository";

describe('Transactions repository', () => {
    describe('create', () => {
        it('should return generated ID', async () => {
            // Arrange
            let actualCommand: TransactWriteItemsCommand | null = null;
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockImplementation(async (command: TransactWriteItemsCommand) => {
                    actualCommand = command!;
                    return Promise.resolve();
                })
            } as any;
            const transactionsAggregateRepository = new TransactionsAggregateRepository(dynamoDBClientMock);
            const repository = new TransactionsRepository(dynamoDBClientMock, transactionsAggregateRepository);
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: new Big(3),
                type: TransactionType.CREDIT
            };

            // Act
            const id = await repository.createAndUpdateTransactionsAggregate(
                input, { userId: input.userId, balance: input.ammount.toString() }
            );

            const expectedCommand: TransactWriteItemsCommandInput = {
                TransactItems: [
                    {
                        Put: {
                            TableName: 'transactions',
                            Item: {
                                'id': { S: id },
                                'user_id': { S: input.userId },
                                'ammount': { S: input.ammount.toString() },
                                'type': {
                                    S: input.type!
                                }
                            },
                        },
                    },
                    {
                        Put: {
                            TableName: 'transactions_aggregate',
                            Item: {
                                'user_id': { S: input.userId },
                                'balance': { S: input.ammount.toString() }
                            },
                        },
                    }
                ],
                ClientRequestToken: input.idempotentKey,
            }

            // Assert
            expect(id).match(/[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}/g);
            expect(actualCommand).toBeInstanceOf(TransactWriteItemsCommand);
            expect(actualCommand!.input).toStrictEqual(expectedCommand);
        });
        it('should throw error', async () => {
            // Arrange
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockRejectedValue({})
            } as any;

            const transactionsAggregateRepository = new TransactionsAggregateRepository(dynamoDBClientMock);
            const repository = new TransactionsRepository(dynamoDBClientMock, transactionsAggregateRepository);

            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: new Big(3),
                type: TransactionType.CREDIT
            }

            // Act and Assert
            expect(async () => await repository.createAndUpdateTransactionsAggregate(
                input, { userId: input.userId, balance: input.ammount.toString() }
            )).rejects.toThrow();
        });
    });
});