import os from 'os';
import { APIGatewayProxyEvent } from "aws-lambda";
import Big from "big.js";
import { describe, expect, it, vi } from "vitest";
import { handler } from "../../../src/handlers/retrieve-balance-by-user-id";
import { BAD_REQUEST_TEXT } from "../constants/constants";
import { RFC9457Output } from '../../../src/models/rfc-9457-output.interface';

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
            requestContext: {}
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

    const undefinedNullAndNotStringInvalidValuesTuples: [any, string][] = [
        [undefined, "undefined"],
        [null, "null"],
        [true, "not string"],
    ];
    const emptyAndBlankInvalidValuesTuples: [any, string][] = [
        ["", "empty"],
        [" " + os.EOL, "blank"]
    ];
    const validateErrorsScenarios: [any, string, string[]][] = [];
    const userIdCantBeBlank = "Query param userId can't be blank.";
    const userIdThirtyFiveMaxCharactersMessage = "Query param userId can't be longer than 35 characters."
    undefinedNullAndNotStringInvalidValuesTuples.forEach(invalidValueTuple => {
        const invalidValue = invalidValueTuple[0];
        const invalidValueDescription = invalidValueTuple[1];
        validateErrorsScenarios.push([
            { userId: invalidValue }, invalidValueDescription, [userIdThirtyFiveMaxCharactersMessage, userIdCantBeBlank]
        ]);
    });
    emptyAndBlankInvalidValuesTuples.forEach(invalidValueTuple => {
        const invalidValue = invalidValueTuple[0];
        const invalidValueDescription = invalidValueTuple[1];
        validateErrorsScenarios.push([
            { userId: invalidValue }, invalidValueDescription, [userIdCantBeBlank]
        ]);
    });
    validateErrorsScenarios.push([{ userId: '000000000000000000000000000000000000' }, 'longer than 35 characters', [userIdThirtyFiveMaxCharactersMessage]]);
    validateErrorsScenarios.forEach((tuple) => {
        const input = tuple[0];
        const key = Object.keys(input)[0];
        const validationErrorDescription = tuple[1];
        const expectedErrorMessages = tuple[2];

        it(`should return 400 when query param ${key} is ${validationErrorDescription}`, async () => {
            // Arrange
            const event: APIGatewayProxyEvent = {
                queryStringParameters: input,
                path: "/balance",
                requestContext: {}
            } as any;

            const expectedBody: RFC9457Output = {
                status: 400,
                title: BAD_REQUEST_TEXT,
                instance: "/balance",
                detail: "One or more validation errors occured",
                properties: {
                    [key]: expectedErrorMessages,
                },
            };
            const expectedBodyStr = JSON.stringify(expectedBody);

            // Act
            const response = await handler(event);

            // Assert
            expect(response.statusCode).toBe(400);
            expect(response.body).toBe(expectedBodyStr);
        });
    });

});

