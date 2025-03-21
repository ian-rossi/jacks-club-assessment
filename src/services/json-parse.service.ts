import { buildBadRequestResponse } from "../utils/rfc-9457-factory.utils.ts";

export const tryParse = (bodyStr: string | null): any => {
    if (bodyStr == null) {
        throw buildBadRequestResponse("Body can't be null.");
    }
    let bodyJSON = {};
    try {
        bodyJSON = JSON.parse(bodyStr);
    } catch (e) {
        const castedEx = e as Error;
        throw buildBadRequestResponse(
            "Following error happened on parse JSON: " + castedEx.message
        );
    }
    return bodyJSON;
}
