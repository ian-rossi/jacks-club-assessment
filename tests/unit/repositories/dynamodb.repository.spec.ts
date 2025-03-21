import { DynamoDBClient, TransactWriteItemsCommand, type TransactWriteItemsCommandInput } from "@aws-sdk/client-dynamodb";
import Big from "big.js";
import { describe, expect, it, vi } from "vitest";
import { CreateTransactionInput } from "../../../src/models/create-transaction-input";
import { TransactionType } from "../../../src/models/transaction-type.enum";
import { DynamoDBRepository } from '../../../src/repositories/dynamodb.repository';

describe('DynamoDB repository', () => {
    describe('createTransactionAndUpdateTransactionAggregateUnlockingInTransaction', () => {
        it('should execute successfully', async () => {
            // Arrange
            let actualCommand: TransactWriteItemsCommand | null = null;
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockImplementationOnce(async (command: TransactWriteItemsCommand) => {
                    actualCommand = command;
                    return Promise.resolve();
                })
            } as any;
            const repository = new DynamoDBRepository(dynamoDBClientMock);
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: new Big(3),
                type: TransactionType.CREDIT
            };
            const newBalance = new Big(4);

            // Act
            const id = await repository.createTransactionAndUpdateTransactionAggregateUnlockingInTransaction(
                input, newBalance
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
                                },
                            }
                        }
                    },
                    {
                        Update: {
                            TableName: 'transactions_aggregate',
                            Key: { user_id: { S: input.userId } },
                            UpdateExpression: "SET balance = :newBalance, is_locked = :isNotLocked",
                            ConditionExpression: "attribute_exists(is_locked) AND is_locked = :isLocked",
                            ExpressionAttributeValues: {
                                ':newBalance': { S: newBalance.toString() },
                                ':isNotLocked': { BOOL: false },
                                ':isLocked': { BOOL: true },
                            }
                        }
                    }
                ],
                ClientRequestToken: input.idempotentKey
            };

            // Assert
            expect(id).match(/[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}/g);
            expect(actualCommand).toBeInstanceOf(TransactWriteItemsCommand);
            expect(actualCommand!.input).toStrictEqual(expectedCommand);
        });

        it('should throw error', async () => {
            // Arrange
            const dynamoDBClientMock: DynamoDBClient = {
                send: vi.fn().mockRejectedValueOnce({})
            } as any;
            const repository = new DynamoDBRepository(dynamoDBClientMock);
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: new Big(3),
                type: TransactionType.CREDIT
            };
            const newBalance = new Big(4);

            // Act and Assert
            await expect(async () => await repository
                .createTransactionAndUpdateTransactionAggregateUnlockingInTransaction(input, newBalance)
            ).rejects.toThrow();
        });
    });

});