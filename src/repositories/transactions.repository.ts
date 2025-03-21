import {
    DynamoDBClient,
    TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { type CreateTransactionInput } from "../models/create-transaction-input.ts";
import { convertKeysFromCamelCaseToDynamoDBRecord } from "./repository.utils.ts";

export class TransactionsRepository {
    private readonly TABLE_NAME = "transactions";

    constructor(private readonly client: DynamoDBClient) { }

    create(input: CreateTransactionInput): Promise<string> {
        const idempotencyKey = input.idempotentKey;
        const dynamoDBRecord = convertKeysFromCamelCaseToDynamoDBRecord(input);
        delete dynamoDBRecord["idempotency_key"];
        const id = randomUUID();
        dynamoDBRecord["id"] = { S: id };
        return this.client
            .send(
                new TransactWriteItemsCommand({
                    TransactItems: [
                        {
                            Put: {
                                TableName: this.TABLE_NAME,
                                Item: dynamoDBRecord,
                            },
                        },
                    ],
                    ClientRequestToken: idempotencyKey,
                })
            )
            .then((result) => id)
            .catch((e) => {
                console.error(e);
                throw e;
            });
    }
}
