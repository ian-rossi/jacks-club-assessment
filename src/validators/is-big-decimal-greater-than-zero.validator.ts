import { getCustomValidatorDecoratorFunction } from "./validator.utils.ts";

export const IsBigDecimalGreaterThanZero = getCustomValidatorDecoratorFunction(
    'isBigDecimal',
    (value, _) => value && ((typeof value == 'number' && value > 0) || (typeof value == 'string' && /^\d+(\.\d+)?$/.test(value))),
    (args) => `Field ${args.property} should be a number or a text that looks like a number greater than zero.`
);
