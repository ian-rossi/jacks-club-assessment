import Big from "big.js";
import { USER_NOT_FOUND } from "../constants/constants.ts";
import { CreateTransactionInput } from "../models/create-transaction-input.ts";
import { type RetrieveBalanceByUserIdInput } from "../models/retrieve-balance-by-user-id-input.ts";
import { TransactionType } from "../models/transaction-type.enum.ts";
import { getISO8601UTCDate } from "../repositories/repository.utils.ts";
import { TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { type TransactionsRepository } from "../repositories/transactions.repository.ts";
import { type UsersRepository } from "../repositories/users.repository.ts";
import { buildNotFoundResponse } from "../utils/rfc-9457-factory.utils.ts";
import { UseCase } from "./usecase.interface.ts";

export class RetrieveBalanceByUserIdUseCaseImpl extends UseCase<
    RetrieveBalanceByUserIdInput,
    Big
> {
    constructor(
        private readonly transactionsRepository: TransactionsRepository,
        private readonly transactionsAggregateRepository: TransactionsAggregateRepository,
        private readonly usersRepository: UsersRepository
    ) {
        super();
    }

    override async execute(input: RetrieveBalanceByUserIdInput): Promise<Big> {
        const userId = input.userId;
        if (this.usersRepository.notExistsById(userId)) {
            throw buildNotFoundResponse(USER_NOT_FOUND);
        }
        let balance =
            await this.transactionsAggregateRepository.findBalanceByUserId(userId);
        if (!balance) {
            const input = new CreateTransactionInput();
            input.ammount = 100;
            input.idempotentKey = `100:credit:${userId}:${getISO8601UTCDate()}`;
            input.type = TransactionType.CREDIT;
            input.userId = userId;
            await this.transactionsRepository.createAndUpdateTransactionsAggregate(
                input, { userId, balance: '100' }
            );
            balance = new Big(100);
        }
        return balance;
    }
}
