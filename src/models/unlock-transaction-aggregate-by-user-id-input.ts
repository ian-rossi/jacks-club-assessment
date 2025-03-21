import { MaxLength } from "class-validator";
import { IsIntegerGreaterThanZero } from "../validators/is-integer-greater-than-zero.validator.ts";
import { IsNotBlank } from "../validators/is-not-blank.validator.ts";

export class UnlockTransactionAggregateByUserIdInput {

    @IsNotBlank()
    @MaxLength(35, { message: "Field userId can't be longer than 35 characters." })
    userId: string = "";

    @IsIntegerGreaterThanZero()
    tryNumber: number = 0;

    isNotBeingRunByTheScheduler: boolean = false;

}
