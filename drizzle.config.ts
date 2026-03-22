import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'postgresql',
    schema: './packages/core/database/schema/schema.ts',
    driver: 'pglite',
    dbCredentials: {
        //database folder
        url: './cosmodb/',
    },
    out: './migrations',
});
