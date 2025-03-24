import { Put, TransactWriteItemsCommand, type DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    GetItemCommand
} from "@aws-sdk/client-dynamodb";
import Big from "big.js";
import { type TransactionAggregate } from "../models/transaction-aggregate.interface.ts";
import {
    convertKeysFromCamelCaseToDynamoDBRecord,
    getISO8601UTCDate,
} from "./repository.utils.ts";

export class TransactionsAggregateRepository {
    private readonly TABLE_NAME = "transactions_aggregate";
    private readonly BALANCE = "balance";

    constructor(private readonly client: DynamoDBClient) { }

    async createOrUpdate(input: TransactionAggregate): Promise<void> {
        const iso8601Date = getISO8601UTCDate();
        const idempotencyKey = `${input.userId
            }:${input.balance.toString()}:${iso8601Date}`;
        return this.client
            .send(
                new TransactWriteItemsCommand({
                    TransactItems: [
                        {
                            Put: this.getPutCommmand(input),
                        },
                    ],
                    ClientRequestToken: idempotencyKey,
                })
            )
            .then((result) => { })
            .catch((e) => {
                console.error(e);
                throw e;
            });
    }

    async findBalanceByUserId(userId: string): Promise<Big | null> {
        return this.client
            .send(
                new GetItemCommand({
                    TableName: this.TABLE_NAME,
                    Key: { user_id: { S: userId } },
                    ProjectionExpression: this.BALANCE,
                    ConsistentRead: true,
                })
            )
            .then((output) => {
                const record = output?.Item;
                if (!record) {
                    return null;
                }
                const balance = record[this.BALANCE]?.S;
                if (!balance) {
                    return null;
                }
                return new Big(balance);
            })
            .catch((e) => {
                console.error(e);
                throw e;
            });
    }

    getPutCommmand(input: TransactionAggregate): Put {
        const dynamoDBRecord = convertKeysFromCamelCaseToDynamoDBRecord(input);
        return {
            TableName: this.TABLE_NAME,
            Item: dynamoDBRecord,
        }
    }
}
