import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ConflictException, CreateScheduleCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnlockTransactionAggregateByUserIdInput } from "../../../src/models/unlock-transaction-aggregate-by-user-id-input";
import { TransactionsAggregateRepository } from "../../../src/repositories/transactions-aggregate.repository";
import { setContext } from "../../../src/services/context.service";
import { UnlockTransactionAggregateByUserIdUseCaseImpl } from '../../../src/usecases/unlock-transaction-aggregate-by-user-id.usecase';
describe('Unlock transaction aggregate by user ID use case', () => {
    describe('execute', () => {

        beforeEach(() => {
            const date = new Date(2021, 3, 2, 21, 0, 0, 0);
            vi.useFakeTimers()
            vi.setSystemTime(date);
        })

        afterEach(vi.useRealTimers)

        it('should just unlock', async () => {
            // Arrange
            const clientMock: SchedulerClient = {} as any;
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                unlock: vi.fn()
            } as any;
            const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                clientMock, transactionsAggregateRepositoryMock
            );
            const input = new UnlockTransactionAggregateByUserIdInput();
            input.userId = '';

            // Act
            await useCase.execute(input);

            // Assert
            expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
        });

        it('should throw when unlock fails throwing ConditionalCheckFailedException and input says is not been ran by the scheduler', async () => {
            // Arrange
            const clientMock: SchedulerClient = {} as any;
            const e = new ConditionalCheckFailedException({ $metadata: {}, message: '' });
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                unlock: vi.fn().mockRejectedValueOnce(e)
            } as any;
            const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                clientMock, transactionsAggregateRepositoryMock
            );
            const input = new UnlockTransactionAggregateByUserIdInput();
            input.userId = '1';
            input.isNotBeingRunByTheScheduler = true;
            const consoleErrorSpy = vi.spyOn(console, 'error');

            // Act and Assert
            await expect(async () => await useCase.execute(input)).rejects.toThrow(e);

            expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(
                '[SEVERE] Expected transactions_aggregate register with user ID 1 to be locked, but was unlocked.'
            );
        });

        it('should log warn when unlock fails throwing ConditionalCheckFailedException and input says is being ran by the scheduler', async () => {
            // Arrange
            const clientMock: SchedulerClient = {} as any;
            const e = new ConditionalCheckFailedException({ $metadata: {}, message: '' });
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                unlock: vi.fn().mockRejectedValueOnce(e)
            } as any;
            const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                clientMock, transactionsAggregateRepositoryMock
            );
            const input = new UnlockTransactionAggregateByUserIdInput();
            input.userId = '1';
            const consoleWarnSpy = vi.spyOn(console, 'warn');

            // Act
            await useCase.execute(input);

            // Assert
            expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(consoleWarnSpy).toHaveBeenCalledExactlyOnceWith(e);
        });

        it('should create schedule and throw when unlock fails throwing test error', async () => {
            // Arrange
            process.env['TEST_SCHEDULER'] = 'true';
            setContext({ instanceURI: '', accountId: '2', region: '3' });
            let actualCommand: CreateScheduleCommand | null = null;
            const clientMock: SchedulerClient = {
                send: vi.fn().mockImplementationOnce((command: CreateScheduleCommand) => {
                    actualCommand = command;
                    return Promise.resolve();
                })
            } as any;
            const e = new Error('Test error to create unlock-aggregate-user-id-1-1 scheduler.');
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {} as any;
            const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                clientMock, transactionsAggregateRepositoryMock
            );
            const input = new UnlockTransactionAggregateByUserIdInput();
            input.userId = '1';
            input.isNotBeingRunByTheScheduler = true;
            const expectedCommand = new CreateScheduleCommand({
                Name: 'unlock-aggregate-user-id-1-1',
                ScheduleExpression: 'at(2021-04-03T00:05:00)',
                FlexibleTimeWindow: {
                    Mode: "OFF"
                },
                Target: {
                    Arn: `arn:aws:lambda:3:2:function:UnlockTransactionAggregateByUserIdLambda`,
                    RoleArn: `arn:aws:iam::2:role/UnlockTransactionAggregateByUserIdLambdaExecutionRole`,
                    Input: JSON.stringify({ account: '2', region: '3', detail: { userId: input.userId, tryNumber: 1 } })
                },
                ActionAfterCompletion: "DELETE"
            });

            // Act and Assert
            await expect(async () => await useCase.execute(input)).rejects.toThrow(e);
            expect(actualCommand).toBeInstanceOf(CreateScheduleCommand);
            expect(actualCommand!.input).toStrictEqual(expectedCommand.input);
        });

        it('should create schedule and throw when unlock fails throwing any other error', async () => {
            // Arrange
            process.env['ENVIRONMENT'] = 'prod';
            setContext({ instanceURI: '', accountId: '2', region: '3' });
            let actualCommand: CreateScheduleCommand | null = null;
            const clientMock: SchedulerClient = {
                send: vi.fn().mockImplementationOnce((command: CreateScheduleCommand) => {
                    actualCommand = command;
                    return Promise.resolve();
                })
            } as any;
            const e = {};
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                unlock: vi.fn().mockRejectedValueOnce(e)
            } as any;
            const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                clientMock, transactionsAggregateRepositoryMock
            );
            const input = new UnlockTransactionAggregateByUserIdInput();
            input.userId = '1';
            input.isNotBeingRunByTheScheduler = true;
            const expectedCommand = new CreateScheduleCommand({
                Name: 'unlock-aggregate-user-id-1-1',
                ScheduleExpression: 'at(2021-04-03T00:05:00)',
                FlexibleTimeWindow: {
                    Mode: "OFF"
                },
                Target: {
                    Arn: `arn:aws:lambda:3:2:function:UnlockTransactionAggregateByUserIdLambda`,
                    RoleArn: `arn:aws:iam::2:role/UnlockTransactionAggregateByUserIdLambdaExecutionRole`,
                    Input: JSON.stringify({ account: '2', region: '3', detail: { userId: input.userId, tryNumber: 1 } })
                },
                ActionAfterCompletion: "DELETE"
            });

            // Act and Assert
            await expect(async () => await useCase.execute(input)).rejects.toBe(e);
            expect(actualCommand).toBeInstanceOf(CreateScheduleCommand);
            expect(actualCommand!.input).toStrictEqual(expectedCommand.input);
            expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
        });

        it(
            'should throw when unlock fails throwing any other error and ' +
            'create schedule fails throwing ConflictException and input says is not being ran by the scheduler',
            async () => {
                // Arrange
                setContext({ instanceURI: '', accountId: '2', region: '3' });
                const conflictEx = new ConflictException({ $metadata: {}, message: '', Message: '' })
                const clientMock: SchedulerClient = {
                    send: vi.fn().mockRejectedValueOnce(conflictEx)
                } as any;
                const e = {};
                const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                    unlock: vi.fn().mockRejectedValueOnce(e)
                } as any;
                const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                    clientMock, transactionsAggregateRepositoryMock
                );
                const input = new UnlockTransactionAggregateByUserIdInput();
                input.userId = '1';
                input.isNotBeingRunByTheScheduler = true;
                const consoleWarnSpy = vi.spyOn(console, 'warn');

                // Act and Assert
                await expect(async () => await useCase.execute(input)).rejects.toStrictEqual(e);
                expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(consoleWarnSpy).toHaveBeenCalledExactlyOnceWith(conflictEx);
            });

        it(
            'should throw and log severe when unlock fails throwing any other error and ' +
            `create schedule fails throwing any other and input says is not being ran by the scheduler`,
            async () => {
                // Arrange
                setContext({ instanceURI: '', accountId: '2', region: '3' });
                const ex = {};
                const clientMock: SchedulerClient = {
                    send: vi.fn().mockRejectedValueOnce(ex)
                } as any;
                const e = {};
                const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                    unlock: vi.fn().mockRejectedValueOnce(e)
                } as any;
                const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                    clientMock, transactionsAggregateRepositoryMock
                );
                const input = new UnlockTransactionAggregateByUserIdInput();
                input.userId = '1';
                input.isNotBeingRunByTheScheduler = true;
                const consoleErrorSpy = vi.spyOn(console, 'error');

                // Act and Assert
                await expect(async () => await useCase.execute(input)).rejects.toStrictEqual(e);
                expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(consoleErrorSpy).toBeCalledTimes(2);
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    `[SEVERE] CreateScheduleCommand on method ` +
                    'UnlockTransactionAggregateByUserIdUseCaseImpl#execute failed for user ID 1.'
                );
                expect(consoleErrorSpy).toHaveBeenCalledWith(ex);
            });

        it(
            'should throw and log severe when unlock fails throwing any other error and ' +
            `create schedule fails throwing ConflictException and input says is being ran by the scheduler`,
            async () => {
                // Arrange
                setContext({ instanceURI: '', accountId: '2', region: '3' });
                const conflictEx = new ConflictException({ $metadata: {}, message: '', Message: '' })
                const clientMock: SchedulerClient = {
                    send: vi.fn().mockRejectedValueOnce(conflictEx)
                } as any;
                const e = {};
                const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                    unlock: vi.fn().mockRejectedValueOnce(e)
                } as any;
                const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                    clientMock, transactionsAggregateRepositoryMock
                );
                const input = new UnlockTransactionAggregateByUserIdInput();
                input.userId = '1';
                const consoleErrorSpy = vi.spyOn(console, 'error');

                // Act and Assert
                await expect(async () => await useCase.execute(input)).rejects.toStrictEqual(e);
                expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(consoleErrorSpy).toBeCalledTimes(2);
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    `[SEVERE] CreateScheduleCommand on method ` +
                    'UnlockTransactionAggregateByUserIdUseCaseImpl#execute failed for user ID 1.'
                );
                expect(consoleErrorSpy).toHaveBeenCalledWith(conflictEx);
            });

    })
});