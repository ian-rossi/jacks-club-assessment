export type Context = { instanceURI: string; accountId: string; region: string; }

let context: Context;

export const getContext = (): Context => context;
export const setContext = (newContext: Context) => context = newContext;
