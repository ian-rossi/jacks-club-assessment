import {
    DynamoDBClient,
    IdempotentParameterMismatchException,
    TransactWriteItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { type CreateTransactionInput } from "../models/create-transaction-input.ts";
import { convertKeysFromCamelCaseToDynamoDBRecord } from "./repository.utils.ts";
import { TransactionsAggregateRepository } from "./transactions-aggregate.repository.ts";
import { TransactionAggregate } from "../models/transaction-aggregate.interface.ts";

export class TransactionsRepository {
    private readonly TABLE_NAME = "transactions";

    constructor(
        private readonly client: DynamoDBClient,
        private readonly transactionsAggregateRepository: TransactionsAggregateRepository
    ) { }

    async createAndUpdateTransactionsAggregate(
        input: CreateTransactionInput,
        transactionAggregate: TransactionAggregate
    ): Promise<string> {
        const idempotentKey = input.idempotentKey;
        const dynamoDBRecord = convertKeysFromCamelCaseToDynamoDBRecord(input);
        delete dynamoDBRecord["idempotent_key"];
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
                            }
                        },
                        {
                            Put: this.transactionsAggregateRepository.getPutCommmand(transactionAggregate)
                        },
                    ],
                    ClientRequestToken: idempotentKey.substring(0, 35),
                })
            )
            .then((result) => id)
            .catch((e) => {
                if (!(e instanceof IdempotentParameterMismatchException)) {
                    console.error(e);
                    throw e;
                }
                return id;
            });
    }
}
