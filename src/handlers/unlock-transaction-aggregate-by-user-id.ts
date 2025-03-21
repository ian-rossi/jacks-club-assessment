import { EventBridgeEvent } from "aws-lambda";
import { UnlockTransactionAggregateByUserIdInput } from "../models/unlock-transaction-aggregate-by-user-id-input.ts";
import { setContext } from "../services/context.service.ts";
import { getProxyResultOptionalLoggingWarnOrError } from "../services/exception.service.ts";
import { validateInput } from "../services/validation.service.ts";
import { convertToClass } from "../utils/obj-to-class-converter.utils.ts";
import { buildInternalServerErrorResponse } from "../utils/rfc-9457-factory.utils.ts";
import { getUnlockTransactionAggregateByUserIdUseCase } from "./use-case-factory.utils.ts";

export const handler = async (event: EventBridgeEvent<string, object>): Promise<void> => {
    const { region } = event;
    setContext({ instanceURI: 'AWS EventBridge Scheduler', accountId: event.account, region });
    try {
        const input = convertToClass(event.detail, UnlockTransactionAggregateByUserIdInput);
        await validateInput(input);
        await getUnlockTransactionAggregateByUserIdUseCase().execute(input);
    } catch (e) {
        const result = getProxyResultOptionalLoggingWarnOrError(e);
        if (result !== null) {
            throw result;
        }
        throw buildInternalServerErrorResponse();
    }

}
