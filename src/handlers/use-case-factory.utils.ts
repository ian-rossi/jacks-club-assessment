import { type CreateTransactionInput } from "../models/create-transaction-input.ts";
import { RetrieveBalanceByUserIdInput } from "../models/retrieve-balance-by-user-id-input.ts";
import { type Transaction } from "../models/transaction.interface.ts";
import { TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { TransactionsRepository } from "../repositories/transactions.repository.ts";
import { UsersRepository } from "../repositories/users.repository.ts";
import { getDynamoDBClient } from "../services/dynamodb.service.ts";
import { CreateOrUpdateTransactionsAggregateUseCaseImpl } from "../usecases/create-or-update-transactions-aggregate.usecase.ts";
import { CreateTransactionUseCaseImpl } from "../usecases/create-transaction.usecase.ts";
import { RetrieveBalanceByUserIdUseCaseImpl } from "../usecases/retrieve-balance-by-user-id.usecase.ts";
import { type UseCase } from "../usecases/usecase.interface.ts";

export const getCreateOrUpdateTransactionsAggregateUseCase: (
    region?: string | undefined
) => UseCase<Transaction, void> = (region) =>
        new CreateOrUpdateTransactionsAggregateUseCaseImpl(
            new TransactionsAggregateRepository(getDynamoDBClient(region))
        );

export const getCreateTransactionUseCase: () => UseCase<
    CreateTransactionInput,
    string
> = () => {
    const defaultDynamoDBClient = getDynamoDBClient();
    return new CreateTransactionUseCaseImpl(
        new TransactionsRepository(defaultDynamoDBClient),
        new TransactionsAggregateRepository(defaultDynamoDBClient),
        new UsersRepository()
    );
};

export const getRetrieveBalanceByUserIdUseCase: () => UseCase<
    RetrieveBalanceByUserIdInput,
    Big
> = () => {
    const defaultDynamoDBClient = getDynamoDBClient();
    return new RetrieveBalanceByUserIdUseCaseImpl(
        new TransactionsRepository(defaultDynamoDBClient),
        new TransactionsAggregateRepository(defaultDynamoDBClient),
        new UsersRepository()
    );
};
