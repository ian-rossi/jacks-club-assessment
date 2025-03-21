import { type APIGatewayProxyResult } from "aws-lambda";
import { BAD_REQUEST_TEXT } from "../constants/constants.ts";
import { type RFC9457Output } from "../models/rfc-9457-output.interface.ts";
import { getInstanceURI } from "../services/instance-uri.service.ts";

type DetailToAPIGatewayProxyResultFunction = (
    detail: string
) => APIGatewayProxyResult;

export const buildBadRequestResponse: DetailToAPIGatewayProxyResultFunction = (
    detail
) => buildBadRequestResponseWithProperties(detail, {});

export const buildBadRequestResponseWithProperties: (
    detail: string,
    properties: { [key: string]: any }
) => APIGatewayProxyResult = (detail, properties) => {
    const bodyObj: RFC9457Output = {
        status: 400,
        title: BAD_REQUEST_TEXT,
        instance: getInstanceURI(),
        detail,
        properties,
    };
    return buildResponse(bodyObj);
};

export const buildNotFoundResponse: DetailToAPIGatewayProxyResultFunction = (
    detail
) => {
    const bodyObj: RFC9457Output = {
        status: 404,
        title: "Not found",
        instance: getInstanceURI(),
        detail,
    };
    return buildResponse(bodyObj);
};

export const buildUnprocessableEntityResponse: DetailToAPIGatewayProxyResultFunction =
    (detail) => {
        const bodyObj: RFC9457Output = {
            status: 422,
            title: "Unprocessable entity",
            instance: getInstanceURI(),
            detail,
        };
        return buildResponse(bodyObj);
    };

export const buildInternalServerErrorResponse: () => APIGatewayProxyResult =
    () => {
        const bodyObj: RFC9457Output = {
            status: 500,
            title: "Internal server error",
            instance: getInstanceURI(),
        };
        return buildResponse(bodyObj);
    };

const buildResponse: (bodyObj: RFC9457Output) => APIGatewayProxyResult = (
    bodyObj
) => {
    const body = JSON.stringify(bodyObj);
    return { statusCode: bodyObj.status, body };
};
