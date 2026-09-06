import { createInsertSchema } from "drizzle-zod";
import { pgTable, real, text, timestamp, integer } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const paperOrdersTable = pgTable("paper_orders", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(),
  stake: real("stake").notNull(),
  duration: integer("duration").notNull(),
  status: text("status").notNull(),
  result: real("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPaperOrderSchema = createInsertSchema(paperOrdersTable).omit({
  createdAt: true,
});

export type InsertPaperOrder = z.infer<typeof insertPaperOrderSchema>;
export type PaperOrder = typeof paperOrdersTable.$inferSelect;