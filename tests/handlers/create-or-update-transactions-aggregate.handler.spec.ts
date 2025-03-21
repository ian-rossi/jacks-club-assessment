import { DynamoDBStreamEvent } from "aws-lambda";
import { describe, expect, it, vi } from "vitest";
import { handler } from "../../src/handlers/create-or-update-transactions-aggregate.handler.ts";

vi.mock("../../src/handlers/use-case-factory.utils", () => ({
    getCreateOrUpdateTransactionsAggregateUseCase: (_?: string | undefined) => ({
        execute: vi.fn().mockImplementation((input) => {
            if (input.id == "exception_value") {
                throw new Error();
            }
        }),
    }),
}));

describe("Create or update transactions aggregate DynamoDB Stream handler", () => {
    it("should handle errors and return batch item failures", async () => {
        // Arrange
        const mockEvent: DynamoDBStreamEvent = {
            Records: [
                {
                    dynamodb: {
                        NewImage: {
                            user_id: { S: "functional_value" },
                            id: {},
                            ammount: { S: undefined },
                        },
                        SequenceNumber: "1",
                    },
                },
                {
                    dynamodb: {
                        NewImage: { id: { S: "exception_value" } },
                        SequenceNumber: "2",
                    },
                },
            ],
        };

        // Act
        const response = await handler(mockEvent);

        // Assert
        expect(response).toEqual({
            batchItemFailures: [{ itemIdentifier: "2" }]
        });
    });
});
