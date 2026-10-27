CREATE TABLE "travel_package" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"destination" text NOT NULL,
	"origin_city" text,
	"departure_airport" text,
	"arrival_airport" text,
	"flight_type" text DEFAULT 'round-trip',
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"nights" integer DEFAULT 0,
	"passengers" integer DEFAULT 2 NOT NULL,
	"child_passengers" integer DEFAULT 0,
	"currency" text DEFAULT 'COP' NOT NULL,
	"exchange_rate" integer DEFAULT 1,
	"markup_percentage" integer DEFAULT 15,
	"taxes" integer DEFAULT 0,
	"agency_commission" integer DEFAULT 0,
	"minimum_deposit" integer DEFAULT 0,
	"administrative_fee" integer DEFAULT 0,
	"medical_assistance" integer DEFAULT 0,
	"profitability" integer DEFAULT 75,
	"freelance_commission" integer DEFAULT 10,
	"selected_hotel_id" text,
	"days" jsonb NOT NULL,
	"inclusions" text,
	"exclusions" text,
	"policies" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "travel_package" ADD CONSTRAINT "travel_package_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "travel_package_org_created_idx" ON "travel_package" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "travel_package_org_status_idx" ON "travel_package" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "travel_package_org_destination_idx" ON "travel_package" USING btree ("organization_id","destination");