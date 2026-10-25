CREATE TABLE "buildings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"phone" varchar(32),
	"manager_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buildings_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"building_id" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"floor" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_building_name_unique" UNIQUE("building_id","name")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "room_id" integer;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Backfill: each distinct free-text location becomes a building with a single "Umum" room,
-- and assets move into that room. The location column is dropped in the next migration.
INSERT INTO "buildings" ("name")
SELECT DISTINCT trim("location") FROM "assets" WHERE nullif(trim("location"), '') IS NOT NULL;--> statement-breakpoint
INSERT INTO "rooms" ("building_id", "name")
SELECT "id", 'Umum' FROM "buildings";--> statement-breakpoint
UPDATE "assets" AS a
SET "room_id" = r."id"
FROM "buildings" AS b
JOIN "rooms" AS r ON r."building_id" = b."id" AND r."name" = 'Umum'
WHERE b."name" = trim(a."location");