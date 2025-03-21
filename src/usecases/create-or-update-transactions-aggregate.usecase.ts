import { type Transaction } from "../models/transaction.interface.ts";
import { type TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { getNewBalance } from "../services/big-decimal.service.ts";
import { UseCase } from "./usecase.interface.ts";

export class CreateOrUpdateTransactionsAggregateUseCaseImpl extends UseCase<
    Transaction,
    void
> {
    constructor(private readonly repository: TransactionsAggregateRepository) {
        super();
    }

    override async execute(input: Transaction): Promise<void> {
        const userId = input.userId;
        let balance = await this.repository.findBalanceByUserId(userId);
        if (!balance) {
            await this.repository.createOrUpdate({ userId, balance: 0 });
            /**
            * Recommended would be a distributed FIFO queue to get this value,
            * but refetch the value should be enought to handle some other intermediate transaction update
            */
            balance = await this.repository.findBalanceByUserId(input.userId);
        }
        const newBalance = getNewBalance(balance!, input);
        await this.repository.createOrUpdate({ userId, balance: newBalance });
    }
}
