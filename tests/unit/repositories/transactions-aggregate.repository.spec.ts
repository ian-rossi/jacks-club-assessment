import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionsAggregateRepository } from '../../../src/repositories/transactions-aggregate.repository'
import { DynamoDBClient, type TransactWriteItemsCommandInput, TransactWriteItemsCommand, GetItemCommand, GetItemCommandInput } from "@aws-sdk/client-dynamodb";
import { type TransactionAggregate } from "../../../src/models/transaction-aggregate.interface";
import Big from "big.js";

describe('Transactions aggregate repository', () => {
    describe('createOrUpdate', () => {

        beforeEach(() => {
            const date = new Date(2021, 3, 2, 21, 0, 0, 0);
            vi.useFakeTimers()
            vi.setSystemTime(date);
        })

        afterEach(vi.useRealTimers)

        it('should execute successfully', async () => {
            // Arrange
            let actualCommand: TransactWriteItemsCommand | null = null;
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockImplementation(async (command: TransactWriteItemsCommand) => {
                    actualCommand = command!;
                    return Promise.resolve();
                })
            } as any;
            const repository = new TransactionsAggregateRepository(dynamoDBClientMock);
            const input: TransactionAggregate = {
                userId: '1',
                balance: new Big(2)
            };

            // Act
            await repository.createOrUpdate(input);

            const expectedCommand: TransactWriteItemsCommandInput = {
                TransactItems: [
                    {
                        Put: {
                            TableName: 'transactions_aggregate',
                            Item: {
                                user_id: { S: '1' },
                                balance: { S: '2' }
                            },
                        },
                    },
                ],
                ClientRequestToken: '1:2:2021-3-3T0:0'
            };

            // Assert
            expect(actualCommand).toBeInstanceOf(TransactWriteItemsCommand);
            expect(actualCommand!.input).toStrictEqual(expectedCommand);
        });

        it('should throw error', async () => {
            // Arrange
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockRejectedValue({})
            } as any;
            const repository = new TransactionsAggregateRepository(dynamoDBClientMock);
            const input: TransactionAggregate = {
                userId: '1',
                balance: new Big(2)
            };

            // Act and Assert
            expect(async () => await repository.createOrUpdate(input)).rejects.toThrow();
        });
    });
    
    describe('findBalanceByUserId', () => {
        const outputIsFalsyScenarios: [any, string][] = [
            [{}, 'Item'],
            [{ Item: {} }, "Item['balance']"],
            [{ Item: { balance: { S: undefined } } }, "Item['balance'].S"]
        ];
        outputIsFalsyScenarios.forEach(tuple => {
            const mockedOutput = tuple[0];
            const projection = tuple[1];
            it(`should return null when ${projection} is falsy`, async () => {
                // Arrange
                const dynamoDBClientMock: DynamoDBClient = {
                    send: vi.fn().mockResolvedValue(mockedOutput)
                } as any;
                const repository = new TransactionsAggregateRepository(dynamoDBClientMock);

                // Act
                const balance = await repository.findBalanceByUserId('');

                // Assert
                expect(balance).toBeNull();
            });

        });

        it(`should successfully return balance`, async () => {
            // Arrange
            const expectedValue = new Big(100);
            let actualCommand: GetItemCommand | null = null;
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockImplementation((command: GetItemCommand) => {
                    actualCommand = command;
                    return Promise.resolve({ Item: { balance: { S: expectedValue.toString() } } });
                })
            } as any;
            const repository = new TransactionsAggregateRepository(dynamoDBClientMock);
            const expectedInput: GetItemCommandInput = {
                TableName: 'transactions_aggregate',
                Key: { user_id: { S: '1' } },
                ProjectionExpression: 'balance',
                ConsistentRead: true,
            };

            // Act
            const balance = await repository.findBalanceByUserId('1');

            // Assert
            expect(expectedValue.cmp(balance!)).toBe(0);
            expect(actualCommand).toBeInstanceOf(GetItemCommand);
            expect(actualCommand!.input).toStrictEqual(expectedInput);
        });


        it('should throw error', async () => {
            // Arrange
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockRejectedValue({})
            } as any;

            const repository = new TransactionsAggregateRepository(dynamoDBClientMock);

            // Act and Assert
            expect(async () => await repository.findBalanceByUserId('')).rejects.toThrow();
        });
    });
});