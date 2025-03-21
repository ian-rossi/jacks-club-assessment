import { getCustomValidatorDecoratorFunction } from "./validator.utils.ts";

export const IsIntegerGreaterThanZero = getCustomValidatorDecoratorFunction(
    'isBigDecimal',
    (value, _) => value && typeof value == 'number' && Number.isInteger(value) && value > 0,
    (args) => `Field ${args.property} should be an integer number greater than zero.`
);
