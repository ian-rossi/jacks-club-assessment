import { DynamoDBClient, GetItemCommand, GetItemCommandInput, ReturnValue, UpdateItemCommand, UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";
import Big from "big.js";
import { describe, expect, it, vi } from "vitest";
import { TransactionsAggregateRepository } from '../../../src/repositories/transactions-aggregate.repository';
import { APIGatewayProxyResult } from "aws-lambda";
import { RFC9457Output } from "../../../src/models/rfc-9457-output.interface";
import { setContext } from "../../../src/services/context.service";

describe('Transactions aggregate repository', () => {

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
                    send: vi.fn().mockResolvedValueOnce(mockedOutput)
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
                send: vi.fn().mockImplementationOnce((command: GetItemCommand) => {
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
                send: vi.fn().mockRejectedValueOnce({})
            } as any;
            const repository = new TransactionsAggregateRepository(dynamoDBClientMock);

            // Act and Assert
            await expect(async () => await repository.findBalanceByUserId('')).rejects.toThrow();
        });
    });

    describe('lockAndSetDefaultBalanceIfNotExistsReturning', () => {
        const attributesLogMessage = '[SEVERE] Attributes wasn\'t returned from UpdateItemCommand ' +
            'at TransactionsAggregate#lockReturning method with userId ';
        const attributesBalanceLogMessage = '[SEVERE] Attribute balance wasn\'t returned from UpdateItemCommand ' +
            'at TransactionsAggregate#lockReturning method with userId ';
        const outputIsFalsyScenarios: [any, string, string][] = [
            [{}, 'Attributes', attributesLogMessage],
            [{ Attributes: {} }, "Attributes['balance']", attributesBalanceLogMessage],
            [{ Attributes: { balance: { S: undefined } } }, "Attributes['balance'].S", attributesBalanceLogMessage]
        ];
        const lockFunction = async (repository: TransactionsAggregateRepository) => await repository
            .lockAndSetDefaultBalanceIfNotExistsReturning('');
        outputIsFalsyScenarios.forEach(tuple => {
            const mockedOutput = tuple[0];
            const projection = tuple[1];
            const expectedLoggedErrorMessage = tuple[2];
            it(`should throw Internal Server Error when ${projection} is falsy`, async () => {
                // Arrange
                setContext({ accountId: '', instanceURI: '', region: '' });
                const dynamoDBClientMock: DynamoDBClient = {
                    send: vi.fn().mockResolvedValueOnce(mockedOutput)
                } as any;
                const repository = new TransactionsAggregateRepository(dynamoDBClientMock);
                const expectedBody: RFC9457Output = {
                    status: 500,
                    title: "Internal server error",
                    instance: ''
                };
                const expectedOutput: APIGatewayProxyResult = {
                    statusCode: 500,
                    body: JSON.stringify(expectedBody)
                };
                const consoleErrorMock = vi.spyOn(console, 'error');
                // Act and Assert
                await expect(lockFunction(repository)).rejects.toStrictEqual(expectedOutput);
                expect(consoleErrorMock).toHaveBeenCalledExactlyOnceWith(expectedLoggedErrorMessage);
            });
        });

        it('should successfully return balance', async () => {
            // Arrange
            let actualCommand: UpdateItemCommand | null = null;
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockImplementationOnce(async (command: UpdateItemCommand) => {
                    actualCommand = command!;
                    return Promise.resolve({ Attributes: { balance: { S: '0' } } });
                })
            } as any;
            const repository = new TransactionsAggregateRepository(dynamoDBClientMock);

            // Act
            const balance = await repository.lockAndSetDefaultBalanceIfNotExistsReturning('');

            const expectedCommand: UpdateItemCommandInput = {
                TableName: 'transactions_aggregate',
                Key: { user_id: { S: '' } },
                UpdateExpression: "SET balance = if_not_exists(balance, :defaultBalance), is_locked = :isLocked",
                ConditionExpression: "attribute_not_exists(user_id) OR is_locked = :isNotLocked",
                ExpressionAttributeValues: {
                    ':defaultBalance': { S: '0' },
                    ':isLocked': { BOOL: true },
                    ':isNotLocked': { BOOL: false },
                },
                ReturnValues: ReturnValue.ALL_NEW
            };

            // Assert
            expect(balance.cmp(new Big(0))).toBe(0);
            expect(actualCommand).toBeInstanceOf(UpdateItemCommand);
            expect(actualCommand!.input).toStrictEqual(expectedCommand);
        });

        it('should throw error', async () => {
            // Arrange
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockRejectedValueOnce({})
            } as any;
            const repository = new TransactionsAggregateRepository(dynamoDBClientMock);

            // Act and Assert
            await expect(async () => await repository.lockAndSetDefaultBalanceIfNotExistsReturning('')).rejects.toThrow();
        });

    });

    describe('unlock', () => {
        it('should successfully return balance', async () => {
            // Arrange
            let actualCommand: UpdateItemCommand | null = null;
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockImplementationOnce(async (command: UpdateItemCommand) => {
                    actualCommand = command!;
                    return Promise.resolve();
                })
            } as any;
            const repository = new TransactionsAggregateRepository(dynamoDBClientMock);

            // Act
            await repository.unlock('');

            const expectedCommand: UpdateItemCommandInput = {
                TableName: 'transactions_aggregate',
                Key: { user_id: { S: '' } },
                UpdateExpression: "SET is_locked = :isNotLocked",
                ConditionExpression: "attribute_exists(is_locked) AND is_locked = :isLocked",
                ExpressionAttributeValues: {
                    ':isNotLocked': { BOOL: false },
                    ':isLocked': { BOOL: true },
                }
            };

            // Assert
            expect(actualCommand).toBeInstanceOf(UpdateItemCommand);
            expect(actualCommand!.input).toStrictEqual(expectedCommand);
        });

        it('should throw error', async () => {
            // Arrange
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockRejectedValueOnce({})
            } as any;
            const repository = new TransactionsAggregateRepository(dynamoDBClientMock);

            // Act and Assert
            await expect(async () => await repository.unlock('')).rejects.toEqual({});
        });

    });
});