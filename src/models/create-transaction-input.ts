import { type BigSource } from "big.js";
import { IsEnum, IsUUID, MaxLength } from "class-validator";
import { IsBigDecimalGreaterThanZero } from "../validators/is-big-decimal-greater-than-zero.validator.ts";
import { IsNotBlank } from "../validators/is-not-blank.validator.ts";
import { TransactionType } from "./transaction-type.enum.ts";

export class CreateTransactionInput {

    @IsUUID('all', { message: "Header Idempotent-Key should be a v4 UUID string.", context: { propertyName: 'Idempotent-Key' } })
    idempotentKey: string = "";

    @IsNotBlank()
    @MaxLength(35, { message: "Field userId can't be longer than 35 characters." })
    userId: string = "";

    @IsBigDecimalGreaterThanZero()
    ammount: BigSource = "";

    @IsEnum(TransactionType)
    type: TransactionType | undefined = undefined;

}
