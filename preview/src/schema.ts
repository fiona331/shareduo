// MIRROR: keep in sync with web/src/lib/db/schema.ts — both services query this table.
import { pgTable, uuid, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const shares = pgTable("shares", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").unique().notNull(),
  secret_token: text("secret_token").notNull(),
  user_id: uuid("user_id"),
  storage_key: text("storage_key").notNull(),
  title: text("title"),
  noindex: boolean("noindex").default(true).notNull(),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").default(sql`now()`),
  deleted_at: timestamp("deleted_at"),
  abuse_flagged_at: timestamp("abuse_flagged_at"),
  uploader_ip_hash: text("uploader_ip_hash"),
  password_hash: text("password_hash"),
  view_count: integer("view_count").default(0).notNull(),
  last_viewed_at: timestamp("last_viewed_at"),
  updated_at: timestamp("updated_at"),
  ga_tag: text("ga_tag"),
  gsc_tag: text("gsc_tag"),
  uploader_email: text("uploader_email"),
  manage_url: text("manage_url"),
});

export type Share = typeof shares.$inferSelect;
