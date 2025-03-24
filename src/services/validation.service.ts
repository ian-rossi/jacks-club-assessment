import { type APIGatewayProxyResult } from "aws-lambda";
import { validate, type ValidationError } from "class-validator";
import { buildBadRequestResponseWithProperties } from "../utils/rfc-9457-factory.utils.ts";

export const validateInput: (
    obj: any
) => Promise<APIGatewayProxyResult | null> = async (obj) => {
    const errors: ValidationError[] = await validate(obj);
    if (errors?.length) {
        const properties: { [key: string]: any } = {};
        errors.forEach(error => properties[error.property] = Object.values(error.constraints!));
        return buildBadRequestResponseWithProperties(
            "One or more validation errors occured",
            properties
        );
    }
    return null;
};
