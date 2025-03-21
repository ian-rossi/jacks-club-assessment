import { type APIGatewayProxyEvent } from "aws-lambda";
import type Big from "big.js";
import { RetrieveBalanceByUserIdInput } from "../models/retrieve-balance-by-user-id-input.ts";
import { convertToClass } from "../utils/obj-to-class-converter.utils.ts";
import { tryHandle } from "./handler.utils.ts";
import { getRetrieveBalanceByUserIdUseCase } from "./use-case-factory.utils.ts";

export const handler = async (event: APIGatewayProxyEvent) =>
    await tryHandle<RetrieveBalanceByUserIdInput, Big>(
        event,
        (event) => convertToClass(event.queryStringParameters, RetrieveBalanceByUserIdInput),
        (input) => getRetrieveBalanceByUserIdUseCase().execute(input),
        (balance) => ({
            statusCode: 200,
            body: JSON.stringify({
                data: {
                    balance: balance.toString(),
                },
            }),
        })
    );
