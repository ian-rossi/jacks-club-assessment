import { MaxLength } from "class-validator";
import { IsNotBlank } from "../validators/is-not-blank.validator.ts";

export class UnlockTransactionAggregateByUserIdInput {

    @IsNotBlank()
    @MaxLength(35, { message: "Field userId can't be longer than 35 characters." })
    userId: string = "";

    isNotBeingRunByTheScheduler: boolean = false;

}
