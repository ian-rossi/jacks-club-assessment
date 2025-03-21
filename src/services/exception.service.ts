import { APIGatewayProxyResult } from "aws-lambda";

export const getProxyResultOptional = (err: any): APIGatewayProxyResult | null => {
    if (typeof err === "object") {
        const castedEx = err as object;
        if (
            castedEx.hasOwnProperty("statusCode") &&
            castedEx.hasOwnProperty("body")
        ) {
            return err as APIGatewayProxyResult;
        }
    }
    return null;

}

export const getProxyResultOptionalLoggingWarnOrError = (err: any): APIGatewayProxyResult | null => {
    const result = getProxyResultOptional(err);
    if (result !== null) {
        const consoleLogType = result.statusCode >= 400 && result.statusCode <= 499 ? 'warn' : 'error';
        const consoleLogFunction = console[consoleLogType];
        consoleLogFunction(result);
        return result;
    }
    console.error(err);
    return null;
}