import { GetItemCommand, ReturnValue, UpdateItemCommand, type DynamoDBClient } from "@aws-sdk/client-dynamodb";
import Big from "big.js";
import { buildInternalServerErrorResponse } from "../utils/rfc-9457-factory.utils.ts";

export class TransactionsAggregateRepository {
    private readonly TABLE_NAME = "transactions_aggregate";
    private readonly BALANCE = "balance";

    constructor(private readonly client: DynamoDBClient) { }

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
            .catch((e) => { throw e; });
    }

    async lockAndSetDefaultBalanceIfNotExistsReturning(userId: string): Promise<Big> {
        return this.client
            .send(
                new UpdateItemCommand({
                    TableName: this.TABLE_NAME,
                    Key: { user_id: { S: userId } },
                    UpdateExpression: "SET balance = if_not_exists(balance, :defaultBalance), is_locked = :isLocked",
                    ConditionExpression: "attribute_not_exists(user_id) OR is_locked = :isNotLocked",
                    ExpressionAttributeValues: {
                        ':defaultBalance': { S: '0' },
                        ':isLocked': { BOOL: true },
                        ':isNotLocked': { BOOL: false },
                    },
                    ReturnValues: ReturnValue.ALL_NEW
                })
            )
            .then((result) => {
                const attributes = result.Attributes;
                if (!attributes) {
                    console.error(
                        '[SEVERE] Attributes wasn\'t returned from UpdateItemCommand ' +
                        'at TransactionsAggregate#lockReturning method with userId ' + userId
                    );
                    throw buildInternalServerErrorResponse();
                }
                const balanceStr = attributes[this.BALANCE]?.S;
                if (!balanceStr) {
                    console.error(
                        '[SEVERE] Attribute balance wasn\'t returned from UpdateItemCommand ' +
                        'at TransactionsAggregate#lockReturning method with userId ' + userId
                    );
                    throw buildInternalServerErrorResponse();
                }
                return new Big(balanceStr);
            })
            .catch((e) => { throw e; });
    }

    async unlock(userId: string): Promise<void> {
        return this.client.send(
            new UpdateItemCommand({
                TableName: this.TABLE_NAME,
                Key: { user_id: { S: userId } },
                UpdateExpression: "SET is_locked = :isNotLocked",
                ConditionExpression: "attribute_exists(is_locked) AND is_locked = :isLocked",
                ExpressionAttributeValues: {
                    ':isNotLocked': { BOOL: false },
                    ':isLocked': { BOOL: true },
                }
            })
        ).then(_ => { }).catch((e) => { throw e; });
    }

}
