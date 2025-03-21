import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import "dotenv/config";

let defaultRegion: string;
const dynamoDBClientByRegion: Map<string, DynamoDBClient> = new Map();

export const getDynamoDBClient: (
    region?: string | undefined
) => DynamoDBClient = (region) => {
    if (!region) {
        if (defaultRegion == null) {
            defaultRegion = process.env["AWS_DEFAULT_REGION"]!;
            if (!defaultRegion) {
                throw new Error("AWS_DEFAULT_REGION env var should be set.");
            }
        }
        region = defaultRegion;
    }
    const client = dynamoDBClientByRegion.get(region);
    if (client) {
        return client;
    }
    const newClient = new DynamoDBClient({ region });
    dynamoDBClientByRegion.set(region, newClient);
    return newClient;
};
