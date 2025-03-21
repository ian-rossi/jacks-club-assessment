import { getRegisterDecoratorFunction } from "./validator.utils.ts";

export const IsNotBlank = getRegisterDecoratorFunction(
    'isNotBlank',
    (value, _) => typeof value === "string" && value?.trim().length > 0,
    (args) => `Field ${args.property} can't be blank.`
);
