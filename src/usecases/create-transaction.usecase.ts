import { ConditionalCheckFailedException, IdempotentParameterMismatchException, TransactionConflictException } from "@aws-sdk/client-dynamodb";
import { Retrier } from "@humanwhocodes/retry";
import Big from "big.js";
import { type CreateTransactionInput } from "../models/create-transaction-input.ts";
import { CreateTransactionOutput } from "../models/create-transaction-output.interface.ts";
import { RFC9457Output } from "../models/rfc-9457-output.interface.ts";
import { TransactionType } from "../models/transaction-type.enum.ts";
import { UnlockTransactionAggregateByUserIdInput } from "../models/unlock-transaction-aggregate-by-user-id-input.ts";
import { DynamoDBRepository } from "../repositories/dynamodb.repository.ts";
import { type TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { getContext } from "../services/context.service.ts";
import { UsersService } from "../services/users.service.ts";
import {
    buildResponse,
    buildServiceUnavailableResponse,
    buildUnprocessableEntityResponse,
} from "../utils/rfc-9457-factory.utils.ts";
import { UseCase } from "./usecase.interface.ts";

export class CreateTransactionUseCaseImpl extends UseCase<CreateTransactionInput, CreateTransactionOutput> {

    private readonly BALANCE_CANT_BE_NEGATIVE = "Your balance can't be negative.";

    constructor(
        private readonly dynamoDBRepository: DynamoDBRepository,
        private readonly transactionsAggregateRepository: TransactionsAggregateRepository,
        private readonly usersService: UsersService,
        private readonly unlockTransactionAggregateByUserIdUseCase: UseCase<UnlockTransactionAggregateByUserIdInput, void>
    ) {
        super();
    }

    override async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
        const userId = input.userId;
        this.usersService.checkIfUserExists(userId);
        const balance = await this.tryLockTransactionAggregate(userId);
        try {
            if (balance.cmp(0) === 0 && input.type === TransactionType.DEBIT) {
                throw buildUnprocessableEntityResponse(this.BALANCE_CANT_BE_NEGATIVE);
            }
            const ammount = new Big(input.ammount);
            const newBalance = input.type === TransactionType.CREDIT ?
                balance.add(ammount) : balance.minus(ammount);
            if (newBalance.lt(0)) {
                throw buildUnprocessableEntityResponse(this.BALANCE_CANT_BE_NEGATIVE);
            }
            const id = await this.dynamoDBRepository
                .createTransactionAndUpdateTransactionAggregateUnlockingInTransaction(
                    input, newBalance
                );
            return { id, newBalance };
        } catch (e) {
            if (e instanceof TransactionConflictException) {
                console.error(e);
                throw buildServiceUnavailableResponse();
            }
            if (e instanceof ConditionalCheckFailedException) {
                console.error(
                    `[SEVERE] Expected transactions_aggregate register with user ID ${userId} to be locked, but was unlocked.`
                );
                throw e;
            }
            const unlockInput = new UnlockTransactionAggregateByUserIdInput();
            unlockInput.userId = userId;
            unlockInput.isNotBeingRunByTheScheduler = true;
            try {
                await this.unlockTransactionAggregateByUserIdUseCase.execute(unlockInput);
            } catch (ex) {
                console.error(ex);
            }
            if (e instanceof IdempotentParameterMismatchException) {
                const bodyObj: RFC9457Output = {
                    status: 412,
                    title: "Precondition failed",
                    instance: getContext().instanceURI,
                    detail: `Transaction with idempotent key ${input.idempotentKey} already processed.`,
                };
                throw buildResponse(bodyObj);
            }
            throw e;
        }
    }

    private async tryLockTransactionAggregate(userId: string): Promise<Big> {
        const retrier = new Retrier((e: any) => {
            if (e instanceof ConditionalCheckFailedException) {
                console.warn(e);
                return true;
            }
            return false;
        }, { timeout: 1000 });
        try {
            return await retrier.retry(async () => await this.transactionsAggregateRepository
                .lockAndSetDefaultBalanceIfNotExistsReturning(userId));
        } catch (e) {
            if (e instanceof ConditionalCheckFailedException) {
                console.error(e);
                throw buildServiceUnavailableResponse();
            }
            throw e;
        }
    }
}
