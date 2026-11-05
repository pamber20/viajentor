CREATE TABLE IF NOT EXISTS "ycloud_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"phone_number" text NOT NULL,
	"display_phone_number" text,
	"verified_name" text,
	"api_key_cipher" text NOT NULL,
	"api_key_iv" text NOT NULL,
	"api_key_tag" text NOT NULL,
	"webhook_secret_cipher" text,
	"webhook_secret_iv" text,
	"webhook_secret_tag" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ycloud_credentials" ADD CONSTRAINT "ycloud_credentials_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ycloud_credentials_org_uq" ON "ycloud_credentials" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ycloud_credentials_phone_uq" ON "ycloud_credentials" USING btree ("phone_number");
