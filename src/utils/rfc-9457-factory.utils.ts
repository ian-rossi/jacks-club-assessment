import { type APIGatewayProxyResult } from "aws-lambda";
import { type RFC9457Output } from "../models/rfc-9457-output.interface.ts";
import { getContext } from "../services/context.service.ts";

type DetailToAPIGatewayProxyResultFunction = (
    detail: string
) => APIGatewayProxyResult;

export const buildBadRequestResponse: DetailToAPIGatewayProxyResultFunction = (
    detail
) => buildBadRequestResponseWithProperties(detail, {});

export const buildBadRequestResponseWithProperties = (
    detail: string, properties: { [key: string]: any }
): APIGatewayProxyResult => {
    const bodyObj: RFC9457Output = {
        status: 400,
        title: "Bad request",
        instance: getContext().instanceURI,
        detail,
        properties,
    };
    return buildResponse(bodyObj);
};

export const buildUnprocessableEntityResponse: DetailToAPIGatewayProxyResultFunction =
    (detail) => {
        const bodyObj: RFC9457Output = {
            status: 422,
            title: "Unprocessable entity",
            instance: getContext().instanceURI,
            detail,
        };
        return buildResponse(bodyObj);
    };

export const buildInternalServerErrorResponse: () => APIGatewayProxyResult =
    () => {
        const bodyObj: RFC9457Output = {
            status: 500,
            title: "Internal server error",
            instance: getContext().instanceURI,
        };
        return buildResponse(bodyObj);
    };

export const buildResponse: (bodyObj: RFC9457Output) => APIGatewayProxyResult = (
    bodyObj
) => {
    const body = JSON.stringify(bodyObj);
    return { statusCode: bodyObj.status, body };
};
