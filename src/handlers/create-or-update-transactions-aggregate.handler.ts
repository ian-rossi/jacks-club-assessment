import {
    type DynamoDBBatchResponse,
    type DynamoDBStreamEvent,
} from "aws-lambda";
import { convertKeysFromDynamoDBRecordToCamelCase } from "../repositories/repository.utils.ts";
import { getCreateOrUpdateTransactionsAggregateUseCase } from "./use-case-factory.utils.ts";

export const handler = async (event: DynamoDBStreamEvent) => {
    const response: DynamoDBBatchResponse = { batchItemFailures: [] };
    event.Records.forEach(async (record) => {
        const useCase = getCreateOrUpdateTransactionsAggregateUseCase(
            record.awsRegion
        );
        const dynamodb = record.dynamodb;
        const input = convertKeysFromDynamoDBRecordToCamelCase(dynamodb?.NewImage);
        try {
            await useCase.execute(input);
        } catch (e) {
            console.error(e);
            const sequenceNumber = dynamodb?.SequenceNumber;
            if (sequenceNumber) {
                response.batchItemFailures.push({ itemIdentifier: sequenceNumber });
            }
        }
    });
    return response;
};
