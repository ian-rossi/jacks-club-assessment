import { validate, ValidationError } from "class-validator";
import { buildBadRequestResponseWithProperties } from "../utils/rfc-9457-factory.utils.ts";

export const validateInput = async (input: any): Promise<void> => {
    const errors: ValidationError[] = await validate(input);
    if (errors?.length) {
        const properties: { [key: string]: any } = {};
        errors.forEach(error => {
            const context = error.contexts;
            let propertyName = error.property;
            if (context) {
                propertyName = context['isUuid']['propertyName'];
            }
            properties[propertyName] = Object.values(error.constraints!)
        });
        const validationErrors = buildBadRequestResponseWithProperties(
            "One or more validation errors occured",
            properties
        );
        throw validationErrors;
    }
}
