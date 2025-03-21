import { type APIGatewayProxyEvent } from "aws-lambda";
import { CreateTransactionInput } from "../models/create-transaction-input.ts";
import { convertToClass } from "../utils/obj-to-class-converter.utils.ts";
import { buildBadRequestResponse } from "../utils/rfc-9457-factory.utils.ts";
import { LambdaHandler, tryHandle } from "./handler.utils.ts";
import { getCreateTransactionUseCase } from "./use-case-factory.utils.ts";

const tryParse: (bodyStr: string | null) => any = (bodyStr) => {
    if (bodyStr == null) {
        throw buildBadRequestResponse("Body can't be null.");
    }
    try {
        return JSON.parse(bodyStr);
    } catch (e) {
        console.error(e);
        const castedEx = e as Error;
        throw buildBadRequestResponse(
            "Following error happened on parse JSON: " + castedEx.message
        );
    }
};
export const handler: LambdaHandler = async (event: APIGatewayProxyEvent) =>
    await tryHandle<CreateTransactionInput, string>(
        event,
        (event) => convertToClass(tryParse(event.body), CreateTransactionInput),
        (input) => getCreateTransactionUseCase().execute(input),
        (id) => ({
            statusCode: 201,
            headers: {
                Location: event.path + "/".repeat(+!event.path.endsWith("/")) + id,
            },
            body: "",
        })
    );
