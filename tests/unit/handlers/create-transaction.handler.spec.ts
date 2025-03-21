import { APIGatewayProxyEvent } from "aws-lambda";
import { randomUUID } from "crypto";
import os from "os";
import { describe, expect, it, vi } from "vitest";
import { handler } from "../../../src/handlers/create-transaction";
import { RFC9457Output } from "../../../src/models/rfc-9457-output.interface";
import { BAD_REQUEST_TEXT } from "../constants/constants";

vi.mock("../../../src/handlers/use-case-factory.utils", () => ({
    getCreateTransactionUseCase: vi.fn(() => ({
        execute: vi.fn((_) => ({ id: "00000000-0000-0000-0000-000000000000" })),
    })),
}));

describe("Create transaction handler", () => {
    ["/transactions", "/transactions/"].forEach((path) => {
        it(`should return 201 with path ${path} when successful`, async () => {
            // Arrange
            const event: APIGatewayProxyEvent = {
                headers: {
                    'Idempotent-Key': randomUUID()
                },
                body: JSON.stringify({
                    userId: "2",
                    ammount: "3",
                    type: "credit",
                }),
                path,
                requestContext: {}
            } as any;

            // Act
            const response = await handler(event);

            // Assert
            expect(response.statusCode).toBe(201);
            expect(response.headers?.Location).toBe(
                "/transactions/00000000-0000-0000-0000-000000000000"
            );
            expect(response.body).toBe("");
        });
    });

    it("should return 400 when body is null", async () => {
        // Arrange
        const event: APIGatewayProxyEvent = {
            body: null,
            path: "/transactions",
            requestContext: {}
        } as any;

        const expectedBody: RFC9457Output = {
            status: 400,
            title: BAD_REQUEST_TEXT,
            instance: "/transactions",
            detail: "Body can't be null.",
            properties: {},
        };

        const expectedBodyStr = JSON.stringify(expectedBody);

        // Act
        const response = await handler(event);

        // Assert
        expect(response.statusCode).toBe(400);
        expect(response.body).toBe(expectedBodyStr);
    });

    it("should return 400 when body is invalid JSON", async () => {
        // Arrange
        const event: APIGatewayProxyEvent = {
            body: "invalid-json",
            path: "/transactions",
            requestContext: {}
        } as any;

        const expectedBody: RFC9457Output = {
            status: 400,
            title: BAD_REQUEST_TEXT,
            instance: "/transactions",
            detail:
                "Following error happened on parse JSON: " +
                "Unexpected token 'i', \"invalid-json\" is not valid JSON",
            properties: {},
        };
        const expectedBodyStr = JSON.stringify(expectedBody);

        // Act
        const response = await handler(event);

        // Assert
        expect(response.statusCode).toBe(400);
        expect(response.body).toBe(expectedBodyStr);
    });

    const nullAndNotStringInvalidValuesTuples: [any, string][] = [
        [null, "null"],
        [true, "not string"],
    ];
    const undefinedEmptyAndBlankInvalidValuesTuples: [any, string][] = [
        [undefined, "undefined"],
        ["", "empty"],
        [" " + os.EOL, "blank"]
    ];
    const invalidValuesTuples: [any, string][] = [
        ...nullAndNotStringInvalidValuesTuples, ...undefinedEmptyAndBlankInvalidValuesTuples
    ];
    const qualifiers = ["header", "field"];
    const fields = ["Idempotent-Key", "ammount", "type"];
    const defaultMessages = [
        "Header Idempotent-Key should be a v4 UUID string.",
        "Field ammount should be a number or a text that looks like a number greater than zero.",
        "type must be one of the following values: credit, debit",
    ];
    const validateErrorsScenarios: [string, any, string, string[]][] = []
    for (let i = 0; i < fields.length; i++) {
        const key = fields[i];
        for (const invalidValueTuple of invalidValuesTuples) {
            const invalidValue = invalidValueTuple[0];
            const invalidValueDescription = invalidValueTuple[1];
            const defaultMessage = defaultMessages[i];
            const qualifier = i < qualifiers.length ? qualifiers[i] : qualifiers[qualifiers.length - 1];
            validateErrorsScenarios.push([
                qualifier, { [key]: invalidValue }, invalidValueDescription, [defaultMessage]
            ]);
        }
    }
    const userIdCantBeBlank = "Field userId can't be blank.";
    const userIdThirtyFiveMaxCharactersMessage = "Field userId can't be longer than 35 characters."
    nullAndNotStringInvalidValuesTuples.forEach(invalidValueTuple => {
        const invalidValue = invalidValueTuple[0];
        const invalidValueDescription = invalidValueTuple[1];
        validateErrorsScenarios.push([
            qualifiers[0], { userId: invalidValue }, invalidValueDescription, [userIdThirtyFiveMaxCharactersMessage, userIdCantBeBlank]
        ]);
    });
    undefinedEmptyAndBlankInvalidValuesTuples.forEach(invalidValueTuple => {
        const invalidValue = invalidValueTuple[0];
        const invalidValueDescription = invalidValueTuple[1];
        validateErrorsScenarios.push([
            qualifiers[0], { userId: invalidValue }, invalidValueDescription, [userIdCantBeBlank]
        ]);
    });
    validateErrorsScenarios.push([qualifiers[0], { 'Idempotent-Key': "000000000000000000000000000000000000" }, "not a v4 UUID string", [defaultMessages[0]]]);
    validateErrorsScenarios.push([qualifiers[0], { userId: "000000000000000000000000000000000000" }, "longer than 35 characters", [userIdThirtyFiveMaxCharactersMessage]]);
    validateErrorsScenarios.push([qualifiers[1], { ammount: "1a" }, "invalid", [defaultMessages[1]]]);
    validateErrorsScenarios.push([qualifiers[1], { ammount: "-1" }, "smaller than zero as integer string", [defaultMessages[1]]]);
    validateErrorsScenarios.push([qualifiers[1], { ammount: "-1.1" }, "smaller than zero as float string", [defaultMessages[1]]]);
    validateErrorsScenarios.push([qualifiers[1], { ammount: -1 }, "smaller than zero as integer", [defaultMessages[1]]]);
    validateErrorsScenarios.push([qualifiers[1], { ammount: -1.1 }, "smaller than zero as float", [defaultMessages[1]]]);
    validateErrorsScenarios.push([qualifiers[1], { type: "anything-else" }, "not credit nor debit", [defaultMessages[2]]]);
    validateErrorsScenarios.forEach((tuple) => {
        const qualifier = tuple[0];
        const objToBeMerged = tuple[1];
        const key = Object.keys(objToBeMerged)[0];
        const validationErrorDescription = tuple[2];
        const expectedErrorMessages = tuple[3];

        it(`should return 400 when ${qualifier} ${key} is ${validationErrorDescription}`, async () => {
            // Arrange
            const validHeaders = {
                'Idempotent-Key': randomUUID()
            };
            const validBody = {
                userId: "1",
                ammount: "2",
                type: "credit",
            };
            const mergedHeaders = { ...validHeaders, ...objToBeMerged };
            const mergedBody = { ...validBody, ...objToBeMerged };
            const event: APIGatewayProxyEvent = {
                headers: mergedHeaders,
                body: JSON.stringify(mergedBody),
                path: "/transactions",
                requestContext: {}
            } as any;

            const expectedBody: RFC9457Output = {
                status: 400,
                title: BAD_REQUEST_TEXT,
                instance: "/transactions",
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

    it("should return 500 when not expected error occurs", async () => {
        // Arrange
        const event: APIGatewayProxyEvent = {
            headers: {
                'Idempotent-Key': randomUUID()
            },
            body: JSON.stringify({
                userId: "1",
                ammount: "2",
                type: "credit",
            }),
            path: undefined,
            requestContext: {}
        } as any;

        const expectedBody: RFC9457Output = {
            status: 500,
            title: "Internal server error"
        };
        const expectedBodyStr = JSON.stringify(expectedBody);

        // Act
        const response = await handler(event);

        // Assert
        expect(response.statusCode).toBe(500);
        expect(response.body).toStrictEqual(expectedBodyStr);
    });
});

