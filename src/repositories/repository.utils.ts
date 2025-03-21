import { type AttributeValue } from "@aws-sdk/client-dynamodb";

const convertKeysFromOnePatternToAnother = (
    obj: any,
    keyConverterFunction: (key: string) => string,
    valuePresenceFilterFunction: (obj: any, key: string) => boolean,
    valueConverterFunction: (value: any) => any
): any => {
    const newObj: any = {};

    Object.keys(obj)
        .filter((key) => valuePresenceFilterFunction(obj, key))
        .forEach((key) => {
            const newKey = keyConverterFunction(key);
            newObj[newKey] = valueConverterFunction(obj[key]);
        });

    return newObj;
};

type DynamoDBRecord = Record<string, AttributeValue>;

export const convertKeysFromCamelCaseToDynamoDBRecord = (obj: any): DynamoDBRecord =>
    convertKeysFromOnePatternToAnother(
        obj,
        (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
        (obj, key) => !!obj[key],
        (value) => ({ S: value.toString() })
    );
