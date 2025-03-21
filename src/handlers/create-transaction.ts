import { type APIGatewayProxyEvent } from "aws-lambda";
import { CreateTransactionInput } from "../models/create-transaction-input.ts";
import { type CreateTransactionOutput } from "../models/create-transaction-output.interface.ts";
import { tryParse } from "../services/json-parse.service.ts";
import { convertToClass } from "../utils/obj-to-class-converter.utils.ts";
import { type LambdaHandler, tryHandle } from "./handler.utils.ts";
import { getCreateTransactionUseCase } from "./use-case-factory.utils.ts";

export const handler: LambdaHandler = async (event: APIGatewayProxyEvent) =>
    await tryHandle<CreateTransactionInput, CreateTransactionOutput>(
        event,
        (event) => {
            const input = convertToClass(tryParse(event.body), CreateTransactionInput);
            input.idempotentKey = event.headers['Idempotent-Key']!;
            return input;
        },
        (input) => getCreateTransactionUseCase().execute(input),
        (output) => ({
            statusCode: 201,
            headers: {
                Location: event.path + "/".repeat(+!event.path.endsWith("/")) + output.id,
            },
            body: "",
        })
    );
