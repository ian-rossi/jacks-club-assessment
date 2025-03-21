import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnlockTransactionAggregateByUserIdUseCaseImpl } from '../../../src/usecases/unlock-transaction-aggregate-by-user-id.usecase'
import { ConflictException, CreateScheduleCommand, DeleteScheduleCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { TransactionsAggregateRepository } from "../../../src/repositories/transactions-aggregate.repository";
import { UnlockTransactionAggregateByUserIdInput } from "../../../src/models/unlock-transaction-aggregate-by-user-id-input";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { setContext } from "../../../src/services/context.service";
describe('Unlock transaction aggregate by user ID use case', () => {
    describe('execute', () => {

        beforeEach(() => {
            const date = new Date(2021, 3, 2, 21, 0, 0, 0);
            vi.useFakeTimers()
            vi.setSystemTime(date);
        })

        afterEach(vi.useRealTimers)

        it('should just unlock when input says is been ran by the scheduler', async () => {
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

        it('should unlock and delete schedule when input says is not being ran by the scheduler', async () => {
            // Arrange
            let actualCommand: DeleteScheduleCommand | null = null;
            const clientMock: SchedulerClient = {
                send: vi.fn().mockImplementationOnce((command: DeleteScheduleCommand) => {
                    actualCommand = command;
                    return Promise.resolve()
                })
            } as any;
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                unlock: vi.fn()
            } as any;
            const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                clientMock, transactionsAggregateRepositoryMock
            );
            const input = new UnlockTransactionAggregateByUserIdInput();
            input.userId = '1';
            input.isNotBeingRunByTheScheduler = true;
            const expectedCommand = new DeleteScheduleCommand({ Name: 'unlock-aggregate-user-id-1' });

            // Act
            await useCase.execute(input);

            // Assert
            expect(actualCommand).toBeInstanceOf(DeleteScheduleCommand);
            expect(actualCommand!.input).toStrictEqual(expectedCommand.input);
            expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
        });

        it('should unlock and try delete schedule when input says is not being ran by the scheduler', async () => {
            // Arrange
            const expectedError = {};
            const clientMock: SchedulerClient = {
                send: vi.fn().mockRejectedValueOnce(expectedError)
            } as any;
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                unlock: vi.fn()
            } as any;
            const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                clientMock, transactionsAggregateRepositoryMock
            );
            const input = new UnlockTransactionAggregateByUserIdInput();
            input.userId = '1';
            input.isNotBeingRunByTheScheduler = true;
            const consoleWarnSpy = vi.spyOn(console, 'error');

            // Act
            await useCase.execute(input);

            // Assert
            expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(consoleWarnSpy).toHaveBeenCalledExactlyOnceWith(expectedError);
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

        it('should create schedule and throw when unlock fails throwing test error and input says is not being ran by the scheduler', async () => {
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
            const e = new Error('Test error to create or update unlock-aggregate-user-id-1 scheduler.');
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {} as any;
            const useCase = new UnlockTransactionAggregateByUserIdUseCaseImpl(
                clientMock, transactionsAggregateRepositoryMock
            );
            const input = new UnlockTransactionAggregateByUserIdInput();
            input.userId = '1';
            input.isNotBeingRunByTheScheduler = true;
            const expectedCommand = new CreateScheduleCommand({
                Name: 'unlock-aggregate-user-id-1',
                ScheduleExpression: 'at(2021-04-03T00:05:00)',
                FlexibleTimeWindow: {
                    Mode: "OFF"
                },
                Target: {
                    Arn: `arn:aws:lambda:3:2:function:UnlockTransactionAggregateByUserIdLambda`,
                    RoleArn: `arn:aws:iam::2:role/UnlockTransactionAggregateByUserIdLambdaExecutionRole`,
                    Input: JSON.stringify({ userId: input.userId })
                },
                ActionAfterCompletion: "DELETE"
            });

            // Act and Assert
            await expect(async () => await useCase.execute(input)).rejects.toThrow(e);
            expect(actualCommand).toBeInstanceOf(CreateScheduleCommand);
            expect(actualCommand!.input).toStrictEqual(expectedCommand.input);
        });

        it('should create schedule and throw when unlock fails throwing any other error and input says is not being ran by the scheduler', async () => {
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
                Name: 'unlock-aggregate-user-id-1',
                ScheduleExpression: 'at(2021-04-03T00:05:00)',
                FlexibleTimeWindow: {
                    Mode: "OFF"
                },
                Target: {
                    Arn: `arn:aws:lambda:3:2:function:UnlockTransactionAggregateByUserIdLambda`,
                    RoleArn: `arn:aws:iam::2:role/UnlockTransactionAggregateByUserIdLambdaExecutionRole`,
                    Input: JSON.stringify({ userId: input.userId })
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
        const scheduleFailedScenarios: [boolean, string][] = [
            [true, 'Create'],
            [false, 'Update'],
        ];
        scheduleFailedScenarios.forEach(tuple => {
            const isNotBeingRunByTheScheduler = tuple[0];
            const commandType = tuple[1];
            const executeFunction = async (
                useCase: UnlockTransactionAggregateByUserIdUseCaseImpl,
                input: UnlockTransactionAggregateByUserIdInput
            ) => await useCase.execute(input);
            it(
                'should throw and log severe when unlock fails throwing any other error and ' +
                `${commandType.toLowerCase()} schedule fails throwing any other and input says is not being ran by the scheduler`,
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
                    input.isNotBeingRunByTheScheduler = isNotBeingRunByTheScheduler;
                    const consoleErrorSpy = vi.spyOn(console, 'error');

                    // Act and Assert
                    await expect(executeFunction(useCase, input)).rejects.toStrictEqual(e);
                    expect(transactionsAggregateRepositoryMock.unlock).toHaveBeenCalledExactlyOnceWith(input.userId);
                    expect(consoleErrorSpy).toBeCalledTimes(2);
                    expect(consoleErrorSpy).toHaveBeenCalledWith(
                        `[SEVERE] ${commandType}ScheduleCommand on method ` +
                        'UnlockTransactionAggregateByUserIdUseCaseImpl#execute failed for user ID 1.'
                    );
                    expect(consoleErrorSpy).toHaveBeenCalledWith(ex);
                });
        });
    })
});