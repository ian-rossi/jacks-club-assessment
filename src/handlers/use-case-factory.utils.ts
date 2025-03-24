import { type CreateTransactionInput } from "../models/create-transaction-input.ts";
import { RetrieveBalanceByUserIdInput } from "../models/retrieve-balance-by-user-id-input.ts";
import { TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { TransactionsRepository } from "../repositories/transactions.repository.ts";
import { UsersRepository } from "../repositories/users.repository.ts";
import { getDynamoDBClient } from "../services/dynamodb.service.ts";
import { CreateTransactionUseCaseImpl } from "../usecases/create-transaction.usecase.ts";
import { RetrieveBalanceByUserIdUseCaseImpl } from "../usecases/retrieve-balance-by-user-id.usecase.ts";
import { type UseCase } from "../usecases/usecase.interface.ts";

export const getCreateTransactionUseCase: () => UseCase<
    CreateTransactionInput,
    string
> = () => {
    const defaultDynamoDBClient = getDynamoDBClient();
    const transactionsAggregateRepository = new TransactionsAggregateRepository(defaultDynamoDBClient);
    return new CreateTransactionUseCaseImpl(
        new TransactionsRepository(
            defaultDynamoDBClient,
            transactionsAggregateRepository
        ),
        transactionsAggregateRepository,
        new UsersRepository()
    );
};

export const getRetrieveBalanceByUserIdUseCase: () => UseCase<
    RetrieveBalanceByUserIdInput,
    Big
> = () => {
    const defaultDynamoDBClient = getDynamoDBClient();
    const transactionsAggregateRepository = new TransactionsAggregateRepository(defaultDynamoDBClient);
    return new RetrieveBalanceByUserIdUseCaseImpl(
        new TransactionsRepository(
            defaultDynamoDBClient,
            transactionsAggregateRepository
        ),
        transactionsAggregateRepository,
        new UsersRepository()
    );
};
