import { describe, expect, it, vi } from "vitest";
import { getProxyResultOptionalLoggingWarnOrError } from '../../../src/services/exception.service';

describe('Exception service', () => {
    describe('getProxyResultOptionalLoggingWarnOrError', () => {
        const httpStatusCodeLogLevelTuples: [number, 'warn' | 'error'][] = [
            [400, 'warn'],
            [499, 'warn'],
            [500, 'error'],
            [399, 'error'],
        ];
        httpStatusCodeLogLevelTuples.forEach(tuple => {
            const httpStatusCode = tuple[0];
            const logLevel = tuple[1];
                it(`should log ${logLevel} when HTTP status code is ${httpStatusCode}`, () => {
                // Arrange
                const err = { statusCode: httpStatusCode, body: '' };
                const consoleSpy = vi.spyOn(console, logLevel);

                // Act
                const result = getProxyResultOptionalLoggingWarnOrError(err);

                // Assert
                expect(result).toBe(err);
                expect(consoleSpy).toHaveBeenCalledExactlyOnceWith(err);
            });
        });
    })
});