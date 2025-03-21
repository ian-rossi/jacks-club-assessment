import {
    registerDecorator,
    type ValidationArguments,
    type ValidationOptions,
} from "class-validator";

type CustomValidator = (object: Object, propertyName: string) => void;
export type CustomValidatorDecorator = (
    options?: ValidationOptions
) => CustomValidator;

type ValidateFunction = (
    value: any,
    args: ValidationArguments
) => Promise<boolean> | boolean;

type DefaultMessageFunction = (args: ValidationArguments) => string;

export const getCustomValidatorDecoratorFunction: (
    decoratorName: string,
    validateFunction: ValidateFunction,
    defaultMessageFunction: DefaultMessageFunction
) => CustomValidatorDecorator = (decoratorName, validateFunction, defaultMessageFunction) =>
        (validationOptions) => getCustomValidatorDecorator(decoratorName, validateFunction, defaultMessageFunction, validationOptions);

export const getCustomValidatorDecorator = (
    decoratorName: string,
    validateFunction: ValidateFunction,
    defaultMessageFunction: DefaultMessageFunction,
    validationOptions?: ValidationOptions
): CustomValidator => (object, propertyName) => registerDecorator({
    name: decoratorName,
    target: object.constructor,
    propertyName,
    options: validationOptions ?? {},
    validator: {
        validate: validateFunction,
        defaultMessage: defaultMessageFunction,
    }
});
