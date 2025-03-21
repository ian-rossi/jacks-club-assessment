import { type CreateTransactionInput } from '../../src/models/create-transaction-input';
import fs from 'fs-extra';
import { randomBytes, randomUUID } from 'crypto'

let baseURL: string | null = null;

const getBaseURL = (): string => {
    if (baseURL) {
        return baseURL;
    }
    const actualBaseURL = fs.readFileSync('base-url.txt', 'utf-8');
    baseURL = actualBaseURL;
    return baseURL;
};

export const randomUUIDToUpperCase = (): string => randomUUID().toUpperCase();

export const randomUserId = (): string => randomBytes(Math.ceil(35 / 2)).toString('hex').slice(0, 35);

export const getBalanceExpectingSuccess = async (userId: string): Promise<string> => getBalanceResponse(userId)
    .then(async (response) => {
        if (response.status !== 200) {
            const jsonResponse = await response.json();
            console.error(jsonResponse);
            throw jsonResponse;
        }
        return response.json();
    }).then(responseJson => responseJson['data']['balance']).catch(e => { throw e; });

export const getBalanceResponse = async (userId: string): Promise<Response> => {
    const baseURL = getBaseURL();
    return fetch(`${baseURL}/balance?userId=${userId}`);
}

export const createTransactionExpectingSuccess = (transaction: CreateTransactionInput): Promise<void> =>
    createTransaction(transaction)
        .then(async (response) => {
            if (response.status !== 201) {
                const jsonResponse = await response.json();
                console.error(jsonResponse);
                throw jsonResponse;
            }
        })
        .catch(e => {
            console.error(e);
            throw e;
        });

export const createTransactionRejectingUnplannedFailure = (transaction: CreateTransactionInput): Promise<void> =>
    createTransaction(transaction)
        .then(async (response) => {
            if (response.status === 201) {
                return;
            }
            const jsonResponse = await response.json();
            // TransactionConflictException thrown, other transaction will keep transaction_aggregate consistent 
            if (response.status === 503) {
                console.warn(jsonResponse);
                return Promise.reject(jsonResponse);
            }
            console.error(jsonResponse);
            throw jsonResponse;
        }).catch(e => {
            console.error(e);
            throw e;
        });

export const createTransaction = (transaction: CreateTransactionInput): Promise<Response> => {
    const baseURL = getBaseURL();
    return fetch(`${baseURL}/transactions`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Idempotent-Key": transaction.idempotentKey!
        },
        body: JSON.stringify(transaction)
    })
}

