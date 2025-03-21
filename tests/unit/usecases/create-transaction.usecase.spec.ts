import { ConditionalCheckFailedException, IdempotentParameterMismatchException, TransactionConflictException } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyResult } from "aws-lambda";
import Big from "big.js";
import { describe, expect, it, Mock, vi } from "vitest";
import { CreateTransactionInput } from "../../../src/models/create-transaction-input";
import { RFC9457Output } from "../../../src/models/rfc-9457-output.interface";
import { TransactionType } from "../../../src/models/transaction-type.enum";
import { UnlockTransactionAggregateByUserIdInput } from "../../../src/models/unlock-transaction-aggregate-by-user-id-input";
import { DynamoDBRepository } from "../../../src/repositories/dynamodb.repository";
import { TransactionsAggregateRepository } from "../../../src/repositories/transactions-aggregate.repository";
import { setContext } from "../../../src/services/context.service";
import { UsersService } from "../../../src/services/users.service";
import { CreateTransactionUseCaseImpl } from "../../../src/usecases/create-transaction.usecase";
import { UseCase } from "../../../src/usecases/usecase.interface";
import { randomUUID } from "crypto";

describe('Create transaction use case', () => {
    describe('execute', () => {

        it('should throw exception when, on first try to lock transactions_aggregate register, exception is not of type ConditionalCheckFailedException', async () => {
            // Arrange
            const dynamoDBRepositoryMock = {} as DynamoDBRepository;
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                lockAndSetDefaultBalanceIfNotExistsReturning: vi.fn().mockRejectedValueOnce({})
            } as any;
            const usersServiceMock: UsersService = {
                checkIfUserExists: vi.fn()
            } as any;
            const unlockTransactionAggregateByUserIdUseCaseMock: UseCase<UnlockTransactionAggregateByUserIdInput, void> = {} as any;
            const useCase = new CreateTransactionUseCaseImpl(
                dynamoDBRepositoryMock,
                transactionsAggregateRepositoryMock,
                usersServiceMock,
                unlockTransactionAggregateByUserIdUseCaseMock
            );
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: '3',
                type: TransactionType.DEBIT
            };

            // Act and Assert
            await expect(async () => await useCase.execute(input)).rejects.toStrictEqual({});
            expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
        });


        it('should throw exception when 1 second timeout is achieved due to locked transactions_aggregate register', async () => {
            // Arrange
            setContext({ instanceURI: '', region: '', accountId: '' });

            const dynamoDBRepositoryMock = {} as DynamoDBRepository;
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                lockAndSetDefaultBalanceIfNotExistsReturning: vi.fn()
                    .mockRejectedValue(new ConditionalCheckFailedException({ message: '', $metadata: {} }))
            } as any;
            const usersServiceMock: UsersService = {
                checkIfUserExists: vi.fn()
            } as any;
            const unlockTransactionAggregateByUserIdUseCaseMock: UseCase<UnlockTransactionAggregateByUserIdInput, void> = {} as any;
            const useCase = new CreateTransactionUseCaseImpl(
                dynamoDBRepositoryMock,
                transactionsAggregateRepositoryMock,
                usersServiceMock,
                unlockTransactionAggregateByUserIdUseCaseMock
            );
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: '3',
                type: TransactionType.DEBIT
            };
            const expectedBody: RFC9457Output = {
                status: 503,
                title: "Service Unavailable",
                instance: '',
                detail: "One or more transactions for this user are taking more time to process than expected. " +
                    "Please, try again later."
            };
            const expectedThrownObject: APIGatewayProxyResult = {
                statusCode: expectedBody.status, body: JSON.stringify(expectedBody)
            };

            // Act and Assert
            await expect(async () => await useCase.execute(input)).rejects.toStrictEqual(expectedThrownObject);
            expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(
                (transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning as Mock).mock.calls.length
            ).toBeGreaterThan(1);
            expect(transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning)
                .toBeCalledWith(input.userId);
        });

        it('should throw unprocessable entity response when user balance is zero and transaction type is debit', async () => {
            // Arrange
            setContext({ instanceURI: '', region: '', accountId: '' });
            const dynamoDBRepositoryMock = {} as DynamoDBRepository;
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                lockAndSetDefaultBalanceIfNotExistsReturning: vi.fn()
                    .mockRejectedValueOnce(new ConditionalCheckFailedException({ message: '', $metadata: {} }))
                    .mockResolvedValueOnce(new Big(0))
            } as any;
            const usersServiceMock: UsersService = {
                checkIfUserExists: vi.fn()
            } as any;
            const unlockTransactionAggregateByUserIdUseCaseMock: UseCase<UnlockTransactionAggregateByUserIdInput, void> = {} as any;
            const useCase = new CreateTransactionUseCaseImpl(
                dynamoDBRepositoryMock,
                transactionsAggregateRepositoryMock,
                usersServiceMock,
                unlockTransactionAggregateByUserIdUseCaseMock
            );
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: '3',
                type: TransactionType.DEBIT
            };
            const expectedBody: RFC9457Output = {
                status: 422,
                title: 'Unprocessable entity',
                instance: '',
                detail: "Your balance can't be negative."
            };
            const expectedThrownObject: APIGatewayProxyResult = {
                statusCode: expectedBody.status, body: JSON.stringify(expectedBody)
            };

            // Act and Assert
            await expect(async () => await useCase.execute(input)).rejects.toStrictEqual(expectedThrownObject);
            expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning)
                .toBeCalledTimes(2);
            expect(transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning)
                .toBeCalledWith(input.userId);
        });

        it('should throw unprocessable entity response when user has balance but transaction type is debit and ammount is greater than balance', async () => {
            // Arrange
            setContext({ instanceURI: '', region: '', accountId: '' });

            const dynamoDBRepositoryMock = {} as DynamoDBRepository;
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                lockAndSetDefaultBalanceIfNotExistsReturning: vi.fn().mockResolvedValueOnce(new Big(1))
            } as any;
            const usersServiceMock: UsersService = {
                checkIfUserExists: vi.fn()
            } as any;
            const unlockTransactionAggregateByUserIdUseCaseMock: UseCase<UnlockTransactionAggregateByUserIdInput, void> = {} as any;
            const useCase = new CreateTransactionUseCaseImpl(
                dynamoDBRepositoryMock,
                transactionsAggregateRepositoryMock,
                usersServiceMock,
                unlockTransactionAggregateByUserIdUseCaseMock
            );
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: '2',
                type: TransactionType.DEBIT
            };
            const expectedBody: RFC9457Output = {
                status: 422,
                title: 'Unprocessable entity',
                instance: '',
                detail: "Your balance can't be negative."
            };
            const expectedThrownObject: APIGatewayProxyResult = {
                statusCode: expectedBody.status, body: JSON.stringify(expectedBody)
            };

            // Act and Assert
            await expect(async () => await useCase.execute(input)).rejects.toStrictEqual(expectedThrownObject);
            expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning)
                .toHaveBeenCalledExactlyOnceWith(input.userId);
        });

        it('should create transaction successfully', async () => {
            // Arrange
            const expectedTransactionId = randomUUID();
            const dynamoDBRepositoryMock: DynamoDBRepository = {
                createTransactionAndUpdateTransactionAggregateUnlockingInTransaction: vi.fn()
                    .mockResolvedValueOnce(expectedTransactionId)
            } as any;
            const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                lockAndSetDefaultBalanceIfNotExistsReturning: vi.fn().mockResolvedValueOnce(new Big(0))
            } as any;
            const usersServiceMock: UsersService = {
                checkIfUserExists: vi.fn()
            } as any;
            const unlockTransactionAggregateByUserIdUseCaseMock: UseCase<UnlockTransactionAggregateByUserIdInput, void> = {} as any;
            const useCase = new CreateTransactionUseCaseImpl(
                dynamoDBRepositoryMock,
                transactionsAggregateRepositoryMock,
                usersServiceMock,
                unlockTransactionAggregateByUserIdUseCaseMock
            );
            const input: CreateTransactionInput = {
                idempotentKey: '1',
                userId: '2',
                ammount: '3',
                type: TransactionType.CREDIT
            };
            const expectedNewBalance = new Big(3);
            // Act
            const { id, newBalance } = await useCase.execute(input);

            // Assert
            expect(id).toBe(expectedTransactionId);
            expect(newBalance.cmp(expectedNewBalance)).toBe(0);
            expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning)
                .toHaveBeenCalledExactlyOnceWith(input.userId);
            expect(dynamoDBRepositoryMock.createTransactionAndUpdateTransactionAggregateUnlockingInTransaction)
                .toHaveBeenCalledExactlyOnceWith(input, newBalance);
        });

        it(
            'should throw service unavailable error when TransactionConflictException is thrown on call ' +
            'DynamoDBRepository#createTransactionAndUpdateTransactionAggregateUnlockingInTransaction method',
            async () => {
                // Arrange
                const targetErr = new TransactionConflictException({ message: '', $metadata: {} });
                const dynamoDBRepositoryMock: DynamoDBRepository = {
                    createTransactionAndUpdateTransactionAggregateUnlockingInTransaction: vi.fn().mockRejectedValueOnce(targetErr)
                } as any;
                const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                    lockAndSetDefaultBalanceIfNotExistsReturning: vi.fn().mockResolvedValueOnce(new Big(4))
                } as any;
                const usersServiceMock: UsersService = {
                    checkIfUserExists: vi.fn()
                } as any;
                const unlockTransactionAggregateByUserIdUseCaseMock: UseCase<UnlockTransactionAggregateByUserIdInput, void> = {} as any;
                const useCase = new CreateTransactionUseCaseImpl(
                    dynamoDBRepositoryMock,
                    transactionsAggregateRepositoryMock,
                    usersServiceMock,
                    unlockTransactionAggregateByUserIdUseCaseMock
                );
                const input: CreateTransactionInput = {
                    idempotentKey: '1',
                    userId: '2',
                    ammount: '3',
                    type: TransactionType.DEBIT
                };
                const expectedNewBalance = new Big(1);
                const consoleErrorSpy = vi.spyOn(console, 'error');
                const expectedBody: RFC9457Output = {
                    status: 503,
                    title: "Service Unavailable",
                    instance: '',
                    detail: "One or more transactions for this user are taking more time to process than expected. " +
                        "Please, try again later."
                };
                const expectedThrownObject: APIGatewayProxyResult = {
                    statusCode: expectedBody.status, body: JSON.stringify(expectedBody)
                };

                // Act and Assert
                await expect(async () => await useCase.execute(input)).rejects.toStrictEqual(expectedThrownObject);
                expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning)
                    .toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(dynamoDBRepositoryMock.createTransactionAndUpdateTransactionAggregateUnlockingInTransaction)
                    .toHaveBeenCalledExactlyOnceWith(input, expectedNewBalance);
                expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(targetErr);
            });

        it(
            'should throw error with severe log when ConditionalCheckFailedException is thrown on call ' +
            'DynamoDBRepository#createTransactionAndUpdateTransactionAggregateUnlockingInTransaction method',
            async () => {
                // Arrange
                const expectedError = new ConditionalCheckFailedException({ message: '', $metadata: {} });
                const dynamoDBRepositoryMock: DynamoDBRepository = {
                    createTransactionAndUpdateTransactionAggregateUnlockingInTransaction: vi.fn().mockRejectedValueOnce(expectedError)
                } as any;
                const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                    lockAndSetDefaultBalanceIfNotExistsReturning: vi.fn().mockResolvedValueOnce(new Big(4))
                } as any;
                const usersServiceMock: UsersService = {
                    checkIfUserExists: vi.fn()
                } as any;
                const unlockTransactionAggregateByUserIdUseCaseMock: UseCase<UnlockTransactionAggregateByUserIdInput, void> = {} as any;
                const useCase = new CreateTransactionUseCaseImpl(
                    dynamoDBRepositoryMock,
                    transactionsAggregateRepositoryMock,
                    usersServiceMock,
                    unlockTransactionAggregateByUserIdUseCaseMock
                );
                const input: CreateTransactionInput = {
                    idempotentKey: '1',
                    userId: '2',
                    ammount: '3',
                    type: TransactionType.DEBIT
                };
                const expectedNewBalance = new Big(1);
                const consoleErrorSpy = vi.spyOn(console, 'error');

                // Act and Assert
                await expect(async () => await useCase.execute(input)).rejects.toThrow(expectedError);
                expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning)
                    .toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(dynamoDBRepositoryMock.createTransactionAndUpdateTransactionAggregateUnlockingInTransaction)
                    .toHaveBeenCalledExactlyOnceWith(input, expectedNewBalance);
                expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(
                    '[SEVERE] Expected transactions_aggregate register with user ID 2 to be locked, but was unlocked.'
                );
            });

        it(
            'should try invoke unlock transaction aggregate and throw when any error is thrown on call ' +
            'DynamoDBRepository#createTransactionAndUpdateTransactionAggregateUnlockingInTransaction method',
            async () => {
                // Arrange
                const dynamoDBRepositoryMock: DynamoDBRepository = {
                    createTransactionAndUpdateTransactionAggregateUnlockingInTransaction: vi.fn().mockRejectedValueOnce({})
                } as any;
                const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                    lockAndSetDefaultBalanceIfNotExistsReturning: vi.fn().mockResolvedValueOnce(new Big(4))
                } as any;
                const usersServiceMock: UsersService = {
                    checkIfUserExists: vi.fn()
                } as any;
                const unlockTransactionAggregateByUserIdUseCaseMock: UseCase<UnlockTransactionAggregateByUserIdInput, void> = {
                    execute: vi.fn()
                };
                const useCase = new CreateTransactionUseCaseImpl(
                    dynamoDBRepositoryMock,
                    transactionsAggregateRepositoryMock,
                    usersServiceMock,
                    unlockTransactionAggregateByUserIdUseCaseMock
                );
                const input: CreateTransactionInput = {
                    idempotentKey: '1',
                    userId: '2',
                    ammount: '3',
                    type: TransactionType.DEBIT
                };
                const unlockInput = new UnlockTransactionAggregateByUserIdInput();
                unlockInput.userId = input.userId;
                unlockInput.isNotBeingRunByTheScheduler = true;

                const expectedNewBalance = new Big(1);

                // Act and Assert
                await expect(async () => await useCase.execute(input)).rejects.toStrictEqual({});
                expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning)
                    .toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(dynamoDBRepositoryMock.createTransactionAndUpdateTransactionAggregateUnlockingInTransaction)
                    .toHaveBeenCalledExactlyOnceWith(input, expectedNewBalance);
                expect(unlockTransactionAggregateByUserIdUseCaseMock.execute)
                    .toHaveBeenCalledExactlyOnceWith(unlockInput);

            });

        it(
            'should try and fail invoke unlock transaction aggregate and throw Preconditions failed when IdempotentParameterMismatchException is thrown on call ' +
            'DynamoDBRepository#createTransactionAndUpdateTransactionAggregateUnlockingInTransaction method',
            async () => {
                // Arrange
                setContext({ instanceURI: '', region: '', accountId: '' })

                const expectedError = new IdempotentParameterMismatchException({ message: '', $metadata: {} });
                const dynamoDBRepositoryMock: DynamoDBRepository = {
                    createTransactionAndUpdateTransactionAggregateUnlockingInTransaction: vi.fn().mockRejectedValueOnce(expectedError)
                } as any;
                const transactionsAggregateRepositoryMock: TransactionsAggregateRepository = {
                    lockAndSetDefaultBalanceIfNotExistsReturning: vi.fn().mockResolvedValueOnce(new Big(4))
                } as any;
                const usersServiceMock: UsersService = {
                    checkIfUserExists: vi.fn()
                } as any;
                const unlockTransactionAggregateByUserIdUseCaseMock: UseCase<UnlockTransactionAggregateByUserIdInput, void> = {
                    execute: vi.fn().mockRejectedValueOnce({})
                };
                const useCase = new CreateTransactionUseCaseImpl(
                    dynamoDBRepositoryMock,
                    transactionsAggregateRepositoryMock,
                    usersServiceMock,
                    unlockTransactionAggregateByUserIdUseCaseMock
                );
                const input: CreateTransactionInput = {
                    idempotentKey: '1',
                    userId: '2',
                    ammount: '3',
                    type: TransactionType.DEBIT
                };
                const unlockInput = new UnlockTransactionAggregateByUserIdInput();
                unlockInput.userId = input.userId;
                unlockInput.isNotBeingRunByTheScheduler = true;
                const expectedNewBalance = new Big(1);
                const consoleErrorSpy = vi.spyOn(console, 'error');
                const expectedBody: RFC9457Output = {
                    status: 412,
                    title: 'Precondition failed',
                    instance: '',
                    detail: "Transaction with idempotent key 1 already processed."
                };
                const expectedThrownObject: APIGatewayProxyResult = {
                    statusCode: expectedBody.status, body: JSON.stringify(expectedBody)
                };

                // Act and Assert
                await expect(async () => await useCase.execute(input)).rejects.toStrictEqual(expectedThrownObject);
                expect(usersServiceMock.checkIfUserExists).toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(transactionsAggregateRepositoryMock.lockAndSetDefaultBalanceIfNotExistsReturning)
                    .toHaveBeenCalledExactlyOnceWith(input.userId);
                expect(dynamoDBRepositoryMock.createTransactionAndUpdateTransactionAggregateUnlockingInTransaction)
                    .toHaveBeenCalledExactlyOnceWith(input, expectedNewBalance);
                expect(unlockTransactionAggregateByUserIdUseCaseMock.execute)
                    .toHaveBeenCalledExactlyOnceWith(unlockInput);
                expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith({});
            });

    });
});