import { type AttributeValue } from "@aws-sdk/client-dynamodb";

const convertKeysFromOnePatternToAnother: (
    obj: any,
    keyConverterFunction: (key: string) => string,
    valuePresenceFilterFunction: (obj: any, key: string) => boolean,
    valueConverterFunction: (value: any) => any
) => any = (
    obj,
    keyConverterFunction,
    valuePresenceFilterFunction,
    valueConverterFunction
) => {
        const newObj: any = {};

        Object.keys(obj)
            .filter((key) => valuePresenceFilterFunction(obj, key))
            .forEach((key) => {
                const newKey = keyConverterFunction(key);
                newObj[newKey] = valueConverterFunction(obj[key]);
            });

        return newObj;
    };

type DynamoDBRecord = Record<string, AttributeValue> | any;

export const convertKeysFromCamelCaseToDynamoDBRecord: (
    obj: any
) => DynamoDBRecord = (obj) =>
        convertKeysFromOnePatternToAnother(
            obj,
            (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
            (obj, key) => !!obj[key],
            (value) => ({ S: value.toString() })
        );

export const convertKeysFromDynamoDBRecordToCamelCase: (
    obj: DynamoDBRecord
) => any = (obj) =>
        convertKeysFromOnePatternToAnother(
            obj,
            (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
            (obj, key) => !!obj[key]?.S,
            (value) => value.S
        );

export const getISO8601UTCDate: () => string = () => {
    const localDate = new Date();

    const utcYear = localDate.getUTCFullYear();
    const utcMonth = localDate.getUTCMonth();
    const utcDate = localDate.getUTCDate();
    const utcHours = localDate.getUTCHours();
    const utcMinutes = localDate.getUTCMinutes();

    return `${utcYear}-${utcMonth}-${utcDate}T${utcHours}:${utcMinutes}`;
};
