import { APIGatewayProxyResult, EventBridgeEvent } from "aws-lambda";
import os from 'os';
import { describe, expect, it, Mock, vi } from "vitest";
import { handler } from "../../../src/handlers/unlock-transaction-aggregate-by-user-id";
import { getUnlockTransactionAggregateByUserIdUseCase } from "../../../src/handlers/use-case-factory.utils";
import { RFC9457Output } from "../../../src/models/rfc-9457-output.interface";
import { BAD_REQUEST_TEXT } from "../constants/constants";
import { setContext } from "../../../src/services/context.service";

vi.mock("../../../src/handlers/use-case-factory.utils", () => ({
    getUnlockTransactionAggregateByUserIdUseCase: vi.fn(() => ({ execute: vi.fn() }))
}));

describe("Unlock transaction aggregate by user ID handler", () => {
    it('should be successfull', async () => {
        // Arrange
        const event: EventBridgeEvent<string, string> = {
            detail: JSON.stringify({ userId: '1' })
        } as any;
        const getUnlockTransactionAggregateByUserIdUseCaseMock = getUnlockTransactionAggregateByUserIdUseCase;

        // Act
        await handler(event);

        // Assert
        expect(getUnlockTransactionAggregateByUserIdUseCaseMock).toBeCalledTimes(1);
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
    const validateErrorsScenarios: [any, string, string[]][] = [];
    const userIdCantBeBlank = "Field userId can't be blank.";
    const userIdThirtyFiveMaxCharactersMessage = "Field userId can't be longer than 35 characters."
    nullAndNotStringInvalidValuesTuples.forEach(invalidValueTuple => {
        const invalidValue = invalidValueTuple[0];
        const invalidValueDescription = invalidValueTuple[1];
        validateErrorsScenarios.push([
            { userId: invalidValue }, invalidValueDescription, [userIdThirtyFiveMaxCharactersMessage, userIdCantBeBlank]
        ]);
    });
    undefinedEmptyAndBlankInvalidValuesTuples.forEach(invalidValueTuple => {
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
            const event: EventBridgeEvent<string, string> = {
                'detail-type': 'UnlockTransactionAggregateByUserId',
                source: 'aws.lambda.CreateTransactionLambda',
                detail: JSON.stringify(input)
            } as any;
            const expectedBody: RFC9457Output = {
                status: 400,
                title: BAD_REQUEST_TEXT,
                instance: "aws.lambda.CreateTransactionLambda.UnlockTransactionAggregateByUserId",
                detail: "One or more validation errors occured",
                properties: {
                    [key]: expectedErrorMessages,
                },
            };
            const expectedOutput: APIGatewayProxyResult = {
                statusCode: 400,
                body: JSON.stringify(expectedBody)
            }

            // Act and Assert
            await expect(async () => await handler(event)).rejects.toEqual(expectedOutput);
        });
    });

    it('should log error and throw Internal Server when use case throws any other error', async () => {
        // Arrange
        const event: EventBridgeEvent<string, string> = {
            detail: JSON.stringify({ userId: '1' })
        } as any;
        const err = {};
        (getUnlockTransactionAggregateByUserIdUseCase as Mock).mockImplementationOnce(() => { throw err; });
        const expectedErrorBody: RFC9457Output = {
            status: 500,
            title: "Internal server error",
            instance: 'undefined.undefined'
        };
        const expectedReturnedError: APIGatewayProxyResult = { statusCode: 500, body: JSON.stringify(expectedErrorBody) };
        const consoleErrorSpy = vi.spyOn(console, 'error');

        // Act and Assert
        await expect(async () => await handler(event)).rejects.toStrictEqual(expectedReturnedError);
        expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(err);
    });

});

