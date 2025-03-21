import { DynamoDBClient, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import type Big from "big.js";
import { randomUUID } from "crypto";
import { CreateTransactionInput } from "../models/create-transaction-input.ts";
import { convertKeysFromCamelCaseToDynamoDBRecord } from "./repository.utils.ts";

export class DynamoDBRepository {

    private readonly TRANSACTIONS_TABLE_NAME = "transactions";
    private readonly TRANSACTIONS_AGGREGATE_TABLE_NAME = this.TRANSACTIONS_TABLE_NAME + "_aggregate";

    constructor(private readonly client: DynamoDBClient) { }

    async createTransactionAndUpdateTransactionAggregateUnlockingInTransaction(
        input: CreateTransactionInput, newBalance: Big
    ): Promise<string> {
        const idempotentKey = input.idempotentKey;
        const dynamoDBRecord = convertKeysFromCamelCaseToDynamoDBRecord(input);
        delete dynamoDBRecord["idempotent_key"];
        const id = randomUUID();
        dynamoDBRecord["id"] = { S: id };
        return this.client.send(
            new TransactWriteItemsCommand({
                TransactItems: [
                    {
                        Put: {
                            TableName: this.TRANSACTIONS_TABLE_NAME,
                            Item: dynamoDBRecord,
                        }
                    },
                    {
                        Update: {
                            TableName: this.TRANSACTIONS_AGGREGATE_TABLE_NAME,
                            Key: { user_id: { S: input.userId } },
                            UpdateExpression: "SET balance = :newBalance, is_locked = :isNotLocked",
                            ConditionExpression: "attribute_exists(is_locked) AND is_locked = :isLocked",
                            ExpressionAttributeValues: {
                                ':newBalance': { S: newBalance.toString() },
                                ':isNotLocked': { BOOL: false },
                                ':isLocked': { BOOL: true }
                            }
                        }
                    }
                ],
                ClientRequestToken: idempotentKey
            })
        ).then(_ => id).catch(e => { throw e; });
    }

}
