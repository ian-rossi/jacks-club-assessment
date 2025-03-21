import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { type CreateTransactionInput } from "../models/create-transaction-input.ts";
import { CreateTransactionOutput } from "../models/create-transaction-output.interface.ts";
import { RetrieveBalanceByUserIdInput } from "../models/retrieve-balance-by-user-id-input.ts";
import { UnlockTransactionAggregateByUserIdInput } from "../models/unlock-transaction-aggregate-by-user-id-input.ts";
import { DynamoDBRepository } from "../repositories/dynamodb.repository.ts";
import { TransactionsAggregateRepository } from "../repositories/transactions-aggregate.repository.ts";
import { UsersRepository } from "../repositories/users.repository.ts";
import { UsersService } from "../services/users.service.ts";
import { CreateTransactionUseCaseImpl } from "../usecases/create-transaction.usecase.ts";
import { RetrieveBalanceByUserIdUseCaseImpl } from "../usecases/retrieve-balance-by-user-id.usecase.ts";
import { UnlockTransactionAggregateByUserIdUseCaseImpl } from "../usecases/unlock-transaction-aggregate-by-user-id.usecase.ts";
import { type UseCase } from "../usecases/usecase.interface.ts";

const dynamoDBClient = new DynamoDBClient;
const schedulerClient = new SchedulerClient;

export const getCreateTransactionUseCase = (): UseCase<CreateTransactionInput, CreateTransactionOutput> => {
    const transactionsAggregateRepository = new TransactionsAggregateRepository(dynamoDBClient);
    return new CreateTransactionUseCaseImpl(
        new DynamoDBRepository(dynamoDBClient),
        transactionsAggregateRepository,
        new UsersService(new UsersRepository),
        getUnlockTransactionAggregateByUserIdUseCase()
    );
};

export const getRetrieveBalanceByUserIdUseCase = (): UseCase<RetrieveBalanceByUserIdInput, Big> =>
    new RetrieveBalanceByUserIdUseCaseImpl(
        getCreateTransactionUseCase(),
        new TransactionsAggregateRepository(dynamoDBClient),
        new UsersService(new UsersRepository)
    );

export const getUnlockTransactionAggregateByUserIdUseCase = (): UseCase<UnlockTransactionAggregateByUserIdInput, void> =>
    new UnlockTransactionAggregateByUserIdUseCaseImpl(
        schedulerClient,
        new TransactionsAggregateRepository(dynamoDBClient)
    );
