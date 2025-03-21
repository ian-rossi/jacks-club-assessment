import { APIGatewayProxyResult } from "aws-lambda";
import { assert, describe, expect, it } from "vitest";
import { UsersRepository } from "../../../src/repositories/users.repository";
import { setContext } from "../../../src/services/context.service";
import { UsersService } from '../../../src/services/users.service';
describe('User service', () => {
    describe('checkIfUserExists', () => {
        it('should do nothing', () => expect(() => new UsersService(new UsersRepository).checkIfUserExists('')).not.toThrow());
        it('should throw 404 not found', () => {
            // Arrange
            setContext({ instanceURI: '', accountId: '', region: '' });

            const usersService = new UsersService({ notExistsById: (_) => true } as UsersRepository);
            const expectedError: APIGatewayProxyResult = {
                statusCode: 404, body: JSON.stringify({
                    status: 404,
                    title: "Not found",
                    instance: '',
                    detail: "User not found."
                })
            };

            // Act and Assert
            try {
                usersService.checkIfUserExists('');
                assert.fail('User not found should be thrown.');
            } catch (e) {
                expect(e).toStrictEqual(expectedError)
            }
        });
    })
});