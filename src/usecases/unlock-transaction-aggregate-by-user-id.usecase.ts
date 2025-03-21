import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ConflictException, CreateScheduleCommand, CreateScheduleInput, DeleteScheduleCommand, SchedulerClient, UpdateScheduleCommand, UpdateScheduleInput } from "@aws-sdk/client-scheduler";
import { UnlockTransactionAggregateByUserIdInput } from "../models/unlock-transaction-aggregate-by-user-id-input.ts";
import { TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { UseCase } from "./usecase.interface.ts";
import { getContext } from "../services/context.service.ts";

export class UnlockTransactionAggregateByUserIdUseCaseImpl extends UseCase<UnlockTransactionAggregateByUserIdInput, void> {

    constructor(
        private readonly client: SchedulerClient,
        private readonly transactionsAggregateRepository: TransactionsAggregateRepository
    ) {
        super();
    }

    override async execute(input: UnlockTransactionAggregateByUserIdInput): Promise<void> {
        const userId = input.userId;
        const ruleName = `unlock-aggregate-user-id-${userId}`;
        let successfullyUnlocked = false;
        try {
            if (
                process.env['ENVIRONMENT']?.trim()?.toLowerCase() !== 'prod' &&
                process.env['TEST_SCHEDULER']?.trim()?.toLowerCase() === 'true'
            ) {
                throw new Error(`Test error to create or update ${ruleName} scheduler.`);
            }
            await this.transactionsAggregateRepository.unlock(userId);
            successfullyUnlocked = true;
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
                const isoStringWithoutTimezone = date.toISOString().split('.')[0];
                try {
                    const baseScheduleInput = {
                        Name: ruleName,
                        ScheduleExpression: `at(${isoStringWithoutTimezone})`
                    };
                    const createScheduleInput = {
                        FlexibleTimeWindow: {
                            Mode: "OFF"
                        },
                        Target: {
                            Arn: `arn:aws:lambda:${region}:${accountId}:function:UnlockTransactionAggregateByUserIdLambda`,
                            RoleArn: `arn:aws:iam::${accountId}:role/UnlockTransactionAggregateByUserIdLambdaExecutionRole`,
                            Input: JSON.stringify({ userId })
                        },
                        ActionAfterCompletion: "DELETE"
                    };
                    await this.client.send(
                        input.isNotBeingRunByTheScheduler ?
                            new CreateScheduleCommand({ ...baseScheduleInput, ...createScheduleInput } as CreateScheduleInput) :
                            new UpdateScheduleCommand(baseScheduleInput as UpdateScheduleInput)
                    );
                } catch (ex) {
                    this.logWarnIfNotBeingRunBySchedulerAndIsConflictElseLogSevereError(input, ex);
                }
                throw e;
            }
        }
        await this.deleteScheduleIfUnlockedAndNotBeingByScheduler(successfullyUnlocked, input, ruleName);
    }

    private logWarnIfNotBeingRunBySchedulerAndIsConflictElseLogSevereError(
        input: UnlockTransactionAggregateByUserIdInput, ex: unknown
    ) {
        if (input.isNotBeingRunByTheScheduler && ex instanceof ConflictException) {
            console.warn(ex);
        } else {
            const createOrUpdate = input.isNotBeingRunByTheScheduler ? 'Create' : 'Update';
            console.error(
                `[SEVERE] ${createOrUpdate}ScheduleCommand on method ` +
                `UnlockTransactionAggregateByUserIdUseCaseImpl#execute failed for user ID ${input.userId}.`
            );
            console.error(ex);
        }
    }

    private async deleteScheduleIfUnlockedAndNotBeingByScheduler(
        successfullyUnlocked: boolean, input: UnlockTransactionAggregateByUserIdInput, ruleName: string
    ) {
        if (successfullyUnlocked && input.isNotBeingRunByTheScheduler) {
            try {
                await this.client.send(new DeleteScheduleCommand({ Name: ruleName }));
            } catch (e) {
                console.error(e);
            }
        }
    }
}
