import { IsNotBlank } from "../validators/is-not-blank.validator.ts";

export class RetrieveBalanceByUserIdInput {
    @IsNotBlank()
    userId: string = "";
}
