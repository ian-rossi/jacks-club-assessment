import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { setContext } from "../services/context.service.ts";
import { getProxyResultOptionalLoggingWarnOrError } from "../services/exception.service.ts";
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
    const { accountId } = event.requestContext;
    const region = process.env['AWS_DEFAULT_REGION']!;
    setContext({ instanceURI: event.path, accountId, region });
    try {
        const input = inputMapper(event);
        await validateInput(input);
        const handlerResult = await handlerFunction(input);
        return postHandlerFunction(handlerResult);
    } catch (e) {
        const result = getProxyResultOptionalLoggingWarnOrError(e);
        if (result !== null) {
            return result;
        }
        return buildInternalServerErrorResponse();
    }
}
