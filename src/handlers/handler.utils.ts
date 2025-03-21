import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { setInstanceURI } from "../services/instance-uri.service.ts";
import { validateInput } from "../services/validation.service.ts";
import { buildInternalServerErrorResponse } from "../utils/rfc-9457-factory.utils.ts";

export type LambdaHandler = (
    event: APIGatewayProxyEvent
) => Promise<APIGatewayProxyResult>;

export async function tryHandle<I extends object, O>(
    event: APIGatewayProxyEvent,
    inputMapper: (event: APIGatewayProxyEvent) => I,
    handlerFunction: (input: I) => Promise<O>,
    postHandlerFunction: (output: O) => APIGatewayProxyResult
): Promise<APIGatewayProxyResult> {
    setInstanceURI(event.path);
    try {
        const input = inputMapper(event);
        const validationErrors = await validateInput(input);
        if (validationErrors) {
            return validationErrors;
        }
        const handlerResult = await handlerFunction(input);
        return postHandlerFunction(handlerResult);
    } catch (e) {
        console.error(e);
        if (typeof e == "object") {
            const castedEx = e as object;
            if (
                castedEx.hasOwnProperty("statusCode") &&
                castedEx.hasOwnProperty("body")
            ) {
                return e as APIGatewayProxyResult;
            }
        }
        return buildInternalServerErrorResponse();
    }
}
