import {
    registerDecorator,
    type ValidationArguments,
    type ValidationOptions,
} from "class-validator";

export type CustomValidatorDecorator = (
    options?: ValidationOptions
) => (object: Object, propertyName: string) => void;

type ValidateFunction = (
    value: any,
    args: ValidationArguments
) => Promise<boolean> | boolean;

type DefaultMessageFunction = (args: ValidationArguments) => string;

export const getRegisterDecoratorFunction: (
    decoratorName: string,
    validateFunction: ValidateFunction,
    defaultMessageFunction: DefaultMessageFunction
) => CustomValidatorDecorator =
    (decoratorName, validateFunction, defaultMessageFunction) =>
        (validationOptions) =>
            (object, propertyName) => {
                registerDecorator({
                    name: decoratorName,
                    target: object.constructor,
                    propertyName,
                    options: validationOptions ?? {},
                    validator: {
                        validate: validateFunction,
                        defaultMessage: defaultMessageFunction,
                    },
                });
            };
