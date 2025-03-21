import { MaxLength } from "class-validator";
import { IsNotBlank } from "../validators/is-not-blank.validator.ts";

export class RetrieveBalanceByUserIdInput {

    @IsNotBlank("Query param")
    @MaxLength(35, { message: "Query param userId can't be longer than 35 characters."})
    userId: string = "";

}
