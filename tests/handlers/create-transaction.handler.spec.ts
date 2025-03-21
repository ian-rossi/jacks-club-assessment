import { APIGatewayProxyEvent } from "aws-lambda";
import os from "os";
import { describe, expect, it, vi } from "vitest";
import { BAD_REQUEST_TEXT } from "../../src/constants/constants";
import { handler } from "../../src/handlers/create-transaction.handler";
import { RFC9457Output } from "../../src/models/rfc-9457-output.interface";

vi.mock("../../src/handlers/use-case-factory.utils", () => ({
    getCreateTransactionUseCase: vi.fn(() => ({
        execute: vi.fn((_) => "00000000-0000-0000-0000-000000000000"),
    })),
}));

describe("Create transaction handler", () => {
    ["/transactions", "/transactions/"].forEach((path) => {
        it(`should return 201 with path ${path} when successful`, async () => {
            const event: APIGatewayProxyEvent = {
                body: JSON.stringify({
                    idempotentKey: "1",
                    userId: "1",
                    ammount: "1",
                    type: "credit",
                }),
                path,
            } as any;

            const response = await handler(event);

            expect(response.statusCode).toBe(201);
            expect(response.headers?.Location).toBe(
                "/transactions/00000000-0000-0000-0000-000000000000"
            );
            expect(response.body).toBe("");
        });
    });

    it("should return 400 when body is null", async () => {
        const event: APIGatewayProxyEvent = {
            body: null,
            path: "/transactions",
        } as any;

        const response = await handler(event);

        const expectedBody: RFC9457Output = {
            status: 400,
            title: BAD_REQUEST_TEXT,
            instance: "/transactions",
            detail: "Body can't be null.",
            properties: {},
        };
        const expectedBodyStr = JSON.stringify(expectedBody);

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe(expectedBodyStr);
    });

    it("should return 400 when body is invalid JSON", async () => {
        const event: APIGatewayProxyEvent = {
            body: "invalid-json",
            path: "/transactions",
        } as any;

        const response = await handler(event);

        const expectedBody: RFC9457Output = {
            status: 400,
            title: BAD_REQUEST_TEXT,
            instance: "/transactions",
            detail:
                "Following error happened on parse JSON: Unexpected token i in JSON at position 0",
            properties: {},
        };
        const expectedBodyStr = JSON.stringify(expectedBody);

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe(expectedBodyStr);
    });

    const invalidValues: [any, string][] = [
        [undefined, "undefined"],
        [null, "null"],
        [true, "not string"],
        ["", "empty"],
        [" " + os.EOL, "blank"],
    ];
    const fields = ["idempotentKey", "userId", "ammount", "type"];
    const defaultMessages = [
        "Field idempotentKey can't be blank.",
        "Field userId can't be blank.",
        "Field ammount should be a number or a text that looks like a number greater than zero.",
        "type must be one of the following values: credit, debit",
    ];
    const validateErrorsScenarios: [any, string, string][] = []
    for (let i = 0; i < fields.length; i++) {
        const key = fields[i];
        for (let j = 0; j < invalidValues.length; j++) {
            const invalidValueTuple = invalidValues[j];
            const invalidValue = invalidValueTuple[0];
            const invalidValueDescription = invalidValueTuple[1];
            const defaultMessage = defaultMessages[i];
            validateErrorsScenarios.push([
                { [key]: invalidValue }, invalidValueDescription, defaultMessage
            ]);
        }
    }
    validateErrorsScenarios.push([{ ammount: "1a" }, "invalid", defaultMessages[2]]);
    validateErrorsScenarios.push([{ ammount: "-1" }, "smaller than zero as integer string", defaultMessages[2]]);
    validateErrorsScenarios.push([{ ammount: "-1.1" }, "smaller than zero as float string", defaultMessages[2]]);
    validateErrorsScenarios.push([{ ammount: -1 }, "smaller than zero as integer", defaultMessages[2]]);
    validateErrorsScenarios.push([{ ammount: -1.1 }, "smaller than zero as float", defaultMessages[2]]);
    validateErrorsScenarios.push([{ type: "anything-else" }, "not credit nor debit", defaultMessages[3]]);
    validateErrorsScenarios.forEach((tuple) => {
        const objToBeMerged = tuple[0];
        const key = Object.keys(objToBeMerged)[0];
        const validationErrorDescription = tuple[1];
        const expectedErrorMessage = tuple[2];
        it(`should return 400 when field ${key} is ${validationErrorDescription}`, async () => {
            const validInput = {
                idempotentKey: "1",
                userId: "1",
                ammount: "1",
                type: "credit",
            };
            const mergedInput = { ...validInput, ...objToBeMerged };
            const event: APIGatewayProxyEvent = {
                body: JSON.stringify(mergedInput),
                path: "/transactions",
            } as any;

            const response = await handler(event);

            const expectedBody: RFC9457Output = {
                status: 400,
                title: BAD_REQUEST_TEXT,
                instance: "/transactions",
                detail: "One or more validation errors occured",
                properties: {
                    [key]: [expectedErrorMessage],
                },
            };
            const expectedBodyStr = JSON.stringify(expectedBody);

            expect(response.statusCode).toBe(400);
            expect(response.body).toBe(expectedBodyStr);
        });
    });

    it("should return 500 when not expected error occurs", async () => {
        const event: APIGatewayProxyEvent = {
            body: JSON.stringify({
                idempotentKey: "1",
                userId: "1",
                ammount: "1",
                type: "credit",
            }),
            path: undefined
        } as any;

        const response = await handler(event);

        const expectedBody: RFC9457Output = {
            status: 500,
            title: "Internal server error"
        };
        const expectedBodyStr = JSON.stringify(expectedBody);

        expect(response.statusCode).toBe(500);
        expect(response.body).toBe(expectedBodyStr);
    });
});

