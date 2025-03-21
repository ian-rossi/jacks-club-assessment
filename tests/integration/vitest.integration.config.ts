import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        teardownTimeout: 600000,
        testTimeout: 60000,
        include: ['tests/integration/**/*.spec.ts'],
        typecheck: {
            tsconfig: "tests/integration/tsconfig.integration.spec.json",
        },
        globalSetup: "tests/integration/setup.ts"
    },
});