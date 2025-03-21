import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ConflictException, CreateScheduleCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { UnlockTransactionAggregateByUserIdInput } from "../models/unlock-transaction-aggregate-by-user-id-input.ts";
import { TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { getContext } from "../services/context.service.ts";
import { UseCase } from "./usecase.interface.ts";

export class UnlockTransactionAggregateByUserIdUseCaseImpl extends UseCase<UnlockTransactionAggregateByUserIdInput, void> {

    constructor(
        private readonly client: SchedulerClient,
        private readonly transactionsAggregateRepository: TransactionsAggregateRepository
    ) {
        super();
    }

    override async execute(input: UnlockTransactionAggregateByUserIdInput): Promise<void> {
        const tryNumber = input.tryNumber + 1;
        const userId = input.userId;
        const ruleName = `unlock-aggregate-user-id-${userId}-${tryNumber}`;
        try {
            if (
                process.env['ENVIRONMENT']?.trim()?.toLowerCase() !== 'prod' &&
                process.env['TEST_SCHEDULER']?.trim()?.toLowerCase() === 'true'
            ) {
                throw new Error(`Test error to create ${ruleName} scheduler.`);
            }
            await this.transactionsAggregateRepository.unlock(userId);
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                if (input.isNotBeingRunByTheScheduler) {
                    console.error(`[SEVERE] Expected transactions_aggregate register with user ID ${userId} to be locked, but was unlocked.`);
                    throw e;
                }
                console.warn(e);
            } else {
                const date = new Date();
                date.setMinutes(date.getMinutes() + 5);
                const { accountId, region } = getContext();
                const isoStringWithoutTimezoneAndMillis = date.toISOString().split('.')[0];
                try {
                    await this.client.send(
                        new CreateScheduleCommand({
                            Name: ruleName,
                            ScheduleExpression: `at(${isoStringWithoutTimezoneAndMillis})`,
                            FlexibleTimeWindow: {
                                Mode: "OFF"
                            },
                            Target: {
                                Arn: `arn:aws:lambda:${region}:${accountId}:function:UnlockTransactionAggregateByUserIdLambda`,
                                RoleArn: `arn:aws:iam::${accountId}:role/UnlockTransactionAggregateByUserIdLambdaExecutionRole`,
                                Input: JSON.stringify({ account: accountId, region, detail: { userId, tryNumber } })
                            },
                            ActionAfterCompletion: "DELETE"
                        }));
                } catch (ex) {
                    this.logWarnIfNotBeingRunBySchedulerAndIsConflictElseLogSevereError(input, ex);
                }
                throw e;
            }
        }
    }

    private logWarnIfNotBeingRunBySchedulerAndIsConflictElseLogSevereError(
        input: UnlockTransactionAggregateByUserIdInput, ex: unknown
    ) {
        if (input.isNotBeingRunByTheScheduler && ex instanceof ConflictException) {
            console.warn(ex);
        } else {
            console.error(
                `[SEVERE] CreateScheduleCommand on method ` +
                `UnlockTransactionAggregateByUserIdUseCaseImpl#execute failed for user ID ${input.userId}.`
            );
            console.error(ex);
        }
    }
}
