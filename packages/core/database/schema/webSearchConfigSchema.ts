import {boolean, pgTable, text, timestamp, uuid} from "drizzle-orm/pg-core";

export enum WebSearchProviderTypeEnum {
    EXA = "exa",
}

export const webSearchConfig = pgTable("WebSearchConfig", {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt"),
    type: text("type").$type<WebSearchProviderTypeEnum>().notNull().unique(),
    enabled: boolean("enabled").notNull().default(true),
    apiKey: text("apiKey").notNull(),
});
