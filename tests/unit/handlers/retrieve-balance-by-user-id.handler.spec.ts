import { APIGatewayProxyEvent } from "aws-lambda";
import Big from "big.js";
import { describe, expect, it, vi } from "vitest";
import { handler } from "../../../src/handlers/retrieve-balance-by-user-id";

vi.mock("../../../src/handlers/use-case-factory.utils", () => ({
    getRetrieveBalanceByUserIdUseCase: vi.fn(() => ({
        execute: vi.fn((_) => new Big(100)),
    })),
}));

describe("Retrieve balance by user ID handler", () => {
    it(`should return 200 with balance 100 when successful`, async () => {
        // Arrange
        const event: APIGatewayProxyEvent = {
            queryStringParameters: {
                userId: '1'
            },
            path: '/balance',
        } as any;
        const expectedBodyStr = JSON.stringify({
            data: {
                balance: '100'
            }
        });
        
        // Act
        const response = await handler(event);

        
        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body).toBe(expectedBodyStr);
    });
});

