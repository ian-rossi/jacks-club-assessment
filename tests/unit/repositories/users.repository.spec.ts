import { describe, expect, it } from "vitest";
import { UsersRepository } from '../../../src/repositories/users.repository'

describe('Users repository', () => {
    it('should return true', () => {
        expect(new UsersRepository().notExistsById('')).toBeFalsy();
    })
});