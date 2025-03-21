import Big from "big.js";
import { CreateTransactionInput } from "../models/create-transaction-input.ts";
import { CreateTransactionOutput } from "../models/create-transaction-output.interface.ts";
import { type RetrieveBalanceByUserIdInput } from "../models/retrieve-balance-by-user-id-input.ts";
import { TransactionType } from "../models/transaction-type.enum.ts";
import { TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { UsersService } from "../services/users.service.ts";
import { UseCase } from "./usecase.interface.ts";
import { getProxyResultOptional } from "../services/exception.service.ts";

export class RetrieveBalanceByUserIdUseCaseImpl extends UseCase<RetrieveBalanceByUserIdInput, Big> {
    constructor(
        private readonly createTransactionUseCase: UseCase<CreateTransactionInput, CreateTransactionOutput>,
        private readonly transactionsAggregateRepository: TransactionsAggregateRepository,
        private readonly usersService: UsersService
    ) {
        super();
    }

    override async execute(input: RetrieveBalanceByUserIdInput): Promise<Big> {
        const userId = input.userId;
        this.usersService.checkIfUserExists(userId);
        let balance = await this.transactionsAggregateRepository.findBalanceByUserId(userId);
        if (!balance) {
            const input = new CreateTransactionInput();
            input.ammount = 100;
            input.idempotentKey = `${userId}.`;
            input.type = TransactionType.CREDIT;
            input.userId = userId;
            try {
                const { newBalance } = await this.createTransactionUseCase.execute(input);
                balance = newBalance;
            } catch (e) {
                const result = getProxyResultOptional(e);
                /**
                 * If Precondition Failed HTTP status code happen,
                 * this mean that transactions aggregate already exists,
                 * because idempotent key is blocked, 
                 * so other thread already added this register,
                 * and we can just revalidate the new value of balance :)
                 */
                if (result !== null && result.statusCode === 412) {
                    console.warn(result);
                    const newBalance = await this.transactionsAggregateRepository.findBalanceByUserId(userId);
                    return newBalance!;
                }
                throw e;
            }
        }
        return balance;
    }
}
