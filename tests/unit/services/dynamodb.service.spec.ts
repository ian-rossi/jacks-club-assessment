import { describe, expect, it, vi } from "vitest";
import { getDynamoDBClient } from '../../../src/services/dynamodb.service';

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn(config => ({ config })) }))

describe('Get DynamoDB client', () => {
    it('should throw error when region param nor AWS_DEFAULT_REGION are set', () => {
        expect(getDynamoDBClient).toThrow('AWS_DEFAULT_REGION env var should be set.');
    });
    it('should create client with AWS_DEFAULT_REGION env var when region is not set and cache client according to region', () => {
        // Arrange
        const region = 'us-east-1';
        process.env['AWS_DEFAULT_REGION'] = region;

        // Act
        const client = getDynamoDBClient();
        const cachedClient = getDynamoDBClient();

        // Assert
        expect(client.config.region).toBe(region)
        expect(cachedClient).toBe(client)
    });
    it('should create client with region param when region is set', () => {
        // Arrange
        const region = 'us-west-1';
        process.env['AWS_DEFAULT_REGION'] = 'us-east-1';

        // Act
        const client = getDynamoDBClient(region);

        // Assert
        expect(client.config.region).toBe(region)
    });
});