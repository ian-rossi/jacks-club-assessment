import { type BigSource } from "big.js";
import { IsEnum } from "class-validator";
import { IsBigDecimalGreaterThanZero } from "../validators/is-big-decimal-greater-than-zero.validator.ts";
import { IsNotBlank } from "../validators/is-not-blank.validator.ts";
import { TransactionType } from "./transaction-type.enum.ts";

export class CreateTransactionInput {
    @IsNotBlank()
    idempotentKey: string = "";

    @IsNotBlank()
    userId: string = "";

    @IsBigDecimalGreaterThanZero()
    ammount: BigSource = "";

    @IsEnum(TransactionType)
    type: TransactionType | undefined = undefined;
}
