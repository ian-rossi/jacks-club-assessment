import Big from "big.js";
import { USER_NOT_FOUND } from "../constants/constants.ts";
import { type CreateTransactionInput } from "../models/create-transaction-input.ts";
import { TransactionType } from "../models/transaction-type.enum.ts";
import { type TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { type TransactionsRepository } from "../repositories/transactions.repository.ts";
import { UsersRepository } from "../repositories/users.repository.ts";
import { getNewBalance } from "../services/big-decimal.service.ts";
import {
    buildNotFoundResponse,
    buildUnprocessableEntityResponse,
} from "../utils/rfc-9457-factory.utils.ts";
import { UseCase } from "./usecase.interface.ts";

export class CreateTransactionUseCaseImpl extends UseCase<
    CreateTransactionInput,
    string
> {
    private readonly BALANCE_CANT_BE_NEGATIVE = "Your balance can't be negative.";

    constructor(
        private readonly transactionsRepository: TransactionsRepository,
        private readonly transactionsAggregateRepository: TransactionsAggregateRepository,
        private readonly usersRepository: UsersRepository
    ) {
        super();
    }

    override async execute(input: CreateTransactionInput): Promise<string> {
        const userId = input.userId;
        if (this.usersRepository.notExistsById(userId)) {
            throw buildNotFoundResponse(USER_NOT_FOUND);
        }
        let balance =
            await this.transactionsAggregateRepository.findBalanceByUserId(userId);
        if (!balance) {
            if (input.type == TransactionType.DEBIT) {
                throw buildUnprocessableEntityResponse(this.BALANCE_CANT_BE_NEGATIVE);
            }
            await this.transactionsAggregateRepository.createOrUpdate({ userId, balance: '0' });
            const newBalance = await this.transactionsAggregateRepository.findBalanceByUserId(userId);
            balance = newBalance ?? new Big(0);
        }
        const newBalance = getNewBalance(balance, input);
        if (newBalance.lt(0)) {
            throw buildUnprocessableEntityResponse(this.BALANCE_CANT_BE_NEGATIVE);
        }
        return this.transactionsRepository.createAndUpdateTransactionsAggregate(
            input, { userId, balance: newBalance }
        );
    }
}
