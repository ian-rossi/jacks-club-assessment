import { type APIGatewayProxyResult } from "aws-lambda";
import { validate, type ValidationError } from "class-validator";
import { BAD_REQUEST_TEXT } from "../constants/constants.ts";
import { buildBadRequestResponseWithProperties } from "../utils/rfc-9457-factory.utils.ts";

export const validateInput: (
    obj: any
) => Promise<APIGatewayProxyResult | null> = async (obj) => {
    const errors: ValidationError[] = await validate(obj);
    if (errors && errors.length) {
        const properties: { [key: string]: any } = {};
        errors.forEach(
            (error) =>
            (properties[error.property] = error.constraints
                ? Object.values(error.constraints)
                : BAD_REQUEST_TEXT)
        );
        return buildBadRequestResponseWithProperties(
            "One or more validation errors occured",
            properties
        );
    }
    return null;
};
