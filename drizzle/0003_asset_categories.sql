CREATE TABLE "asset_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"code" varchar(10) NOT NULL,
	"description" text,
	"last_tag_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "asset_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "asset_tag" varchar(32);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "category_id" integer;--> statement-breakpoint
-- Backfill existing assets: each distinct free-text category becomes a category with a
-- placeholder code (K001, K002, ...), and assets get tags numbered within their category.
INSERT INTO "asset_categories" ("name", "code")
SELECT "category", 'K' || lpad(row_number() OVER (ORDER BY "category")::text, 3, '0')
FROM (SELECT DISTINCT "category" FROM "assets") AS c;--> statement-breakpoint
UPDATE "assets" AS a
SET "category_id" = n."category_id",
    "asset_tag" = n."code" || '-' || lpad(n."seq"::text, 4, '0')
FROM (
  SELECT a2."id", c."id" AS "category_id", c."code",
         row_number() OVER (PARTITION BY c."id" ORDER BY a2."id") AS "seq"
  FROM "assets" AS a2
  JOIN "asset_categories" AS c ON c."name" = a2."category"
) AS n
WHERE a."id" = n."id";--> statement-breakpoint
UPDATE "asset_categories" AS c
SET "last_tag_number" = (SELECT count(*) FROM "assets" AS a WHERE a."category_id" = c."id");--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "asset_tag" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_asset_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."asset_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_asset_tag_unique" UNIQUE("asset_tag");