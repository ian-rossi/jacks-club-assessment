export function convertToClass<T extends object>(
    obj: any,
    cls: new () => T
): T {
    const instance = new cls();
    for (const key in obj) {
        if (obj.hasOwnProperty(key) && key in instance) {
            (instance as any)[key] = obj[key];
        }
    }
    return instance;
}
