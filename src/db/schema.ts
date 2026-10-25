import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { ASSET_CONDITIONS, REPORT_PRIORITIES, REPORT_STATUSES, ROLES } from "../shared/constants";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const userRole = pgEnum("user_role", ROLES);
export const assetCondition = pgEnum("asset_condition", ASSET_CONDITIONS);
export const reportStatus = pgEnum("report_status", REPORT_STATUSES);
export const reportPriority = pgEnum("report_priority", REPORT_PRIORITIES);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  // SHA-256 of the session token; the raw token only lives in the client's cookie.
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assetCategories = pgTable("asset_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  // Prefix for generated asset tags, e.g. LPT for Laptop.
  code: varchar("code", { length: 10 }).notNull().unique(),
  description: text("description"),
  // Last number handed out for this category's asset tags; only ever increases.
  lastTagNumber: integer("last_tag_number").notNull().default(0),
  ...timestamps,
});

export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  address: text("address"),
  phone: varchar("phone", { length: 32 }),
  // Free text: the person in charge may not have an account in this app.
  managerName: varchar("manager_name", { length: 255 }),
  ...timestamps,
});

export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    floor: varchar("floor", { length: 32 }),
    ...timestamps,
  },
  (table) => [unique("rooms_building_name_unique").on(table.buildingId, table.name)],
);

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  // Generated from the category code when the asset is created, e.g. LPT-0001. Never changes.
  assetTag: varchar("asset_tag", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => assetCategories.id, { onDelete: "restrict" }),
  // Where the asset is placed; null while it hasn't been assigned a room yet.
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "restrict" }),
  purchaseDate: date("purchase_date"),
  condition: assetCondition("condition").notNull().default("baik"),
  // Routine maintenance every N days; null means the asset has no routine schedule.
  maintenanceIntervalDays: integer("maintenance_interval_days"),
  notes: text("notes"),
  ...timestamps,
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  performedAt: date("performed_at").notNull(),
  description: text("description").notNull(),
  performedById: integer("performed_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const damageReports = pgTable("damage_reports", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "restrict" }),
  reporterId: integer("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  priority: reportPriority("priority").notNull().default("sedang"),
  status: reportStatus("status").notNull().default("dilaporkan"),
  handledById: integer("handled_by_id").references(() => users.id, { onDelete: "set null" }),
  followUpNotes: text("follow_up_notes"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type AssetCategory = typeof assetCategories.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type DamageReport = typeof damageReports.$inferSelect;
