import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const shares = pgTable("shares", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").unique().notNull(),
  secret_token: text("secret_token").notNull(),
  user_id: uuid("user_id"),
  storage_key: text("storage_key").notNull(),
  title: text("title"),
  noindex: boolean("noindex").default(false),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").default(sql`now()`),
  deleted_at: timestamp("deleted_at"),
  abuse_flagged_at: timestamp("abuse_flagged_at"),
  uploader_ip_hash: text("uploader_ip_hash"),
});

export type Share = typeof shares.$inferSelect;
export type NewShare = typeof shares.$inferInsert;
