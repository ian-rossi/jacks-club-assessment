import { RFC9457Output } from "../models/rfc-9457-output.interface.ts";
import { UsersRepository } from "../repositories/users.repository.ts";
import { buildResponse } from "../utils/rfc-9457-factory.utils.ts";
import { getContext } from "./context.service.ts";

export class UsersService {

    constructor(private readonly repository: UsersRepository) { }

    checkIfUserExists(userId: string): void {
        if (this.repository.notExistsById(userId)) {
            const bodyObj: RFC9457Output = {
                status: 404,
                title: "Not found",
                instance: getContext().instanceURI,
                detail: "User not found."
            };
            throw buildResponse(bodyObj);
        }
    }
}