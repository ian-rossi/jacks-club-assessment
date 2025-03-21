import { ValidationOptions } from "class-validator";
import { getCustomValidatorDecorator } from "./validator.utils.ts";

export const IsNotBlank = (
    qualifier: string = "Field",
    validationOptions?: ValidationOptions
) => getCustomValidatorDecorator(
    'isNotBlank',
    (value, _) => typeof value === "string" && value?.trim().length > 0,
    (args) => `${qualifier} ${args.property} can't be blank.`,
    validationOptions
);
