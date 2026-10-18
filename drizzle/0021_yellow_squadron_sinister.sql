CREATE TABLE "travel_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"installment_id" text,
	"amount" integer NOT NULL,
	"date" text NOT NULL,
	"method" text DEFAULT 'Transferencia' NOT NULL,
	"reference" text,
	"receipt_number" text,
	"notes" text,
	"media_asset_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_quote" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"contact_id" text,
	"lead_id" text,
	"assigned_user_id" text,
	"quote_number" text NOT NULL,
	"booking_number" text,
	"is_booking" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"booking_status" text,
	"client_name" text NOT NULL,
	"client_phone" text,
	"client_email" text,
	"origin_city" text,
	"destination" text NOT NULL,
	"departure_airport" text,
	"arrival_airport" text,
	"flight_type" text DEFAULT 'round-trip',
	"start_date" text,
	"end_date" text,
	"nights" integer DEFAULT 0,
	"passengers" integer DEFAULT 1 NOT NULL,
	"child_passengers" integer DEFAULT 0,
	"child_ages" text,
	"rooms" integer DEFAULT 1,
	"travel_reason" text,
	"flexibility" text,
	"preferences" jsonb,
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
	"validity_hours" integer DEFAULT 48,
	"option_titles" jsonb,
	"is_comparison_mode" boolean DEFAULT false,
	"active_options_count" integer DEFAULT 1,
	"days" jsonb NOT NULL,
	"amortization_schedule" jsonb,
	"travelers" jsonb,
	"inclusions" text,
	"exclusions" text,
	"policies" text,
	"booking_confirmation" text,
	"pnr_expiration" text,
	"billing_name" text,
	"billing_id" text,
	"counter_name" text,
	"advisor_name" text,
	"observations" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_supplier" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"contact" jsonb,
	"negotiated_rates" jsonb,
	"commission" integer,
	"sla" text,
	"rating" integer DEFAULT 5,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"operating_cities" jsonb,
	"hotel_meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_voucher" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"voucher_number" text NOT NULL,
	"travelers" jsonb,
	"check_in_reminder" boolean DEFAULT true NOT NULL,
	"documents_checklist" jsonb,
	"hotel_details" jsonb,
	"flight_details" jsonb,
	"service_details" jsonb,
	"transfers" jsonb,
	"transfers_confirmation_number" text,
	"activities" jsonb,
	"assistance_info" jsonb,
	"additional_info" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "travel_payment" ADD CONSTRAINT "travel_payment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_payment" ADD CONSTRAINT "travel_payment_quote_id_travel_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."travel_quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_payment" ADD CONSTRAINT "travel_payment_media_asset_id_media_asset_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_quote" ADD CONSTRAINT "travel_quote_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_quote" ADD CONSTRAINT "travel_quote_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_quote" ADD CONSTRAINT "travel_quote_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_quote" ADD CONSTRAINT "travel_quote_assigned_user_id_user_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_supplier" ADD CONSTRAINT "travel_supplier_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_voucher" ADD CONSTRAINT "travel_voucher_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_voucher" ADD CONSTRAINT "travel_voucher_quote_id_travel_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."travel_quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "travel_payment_org_quote_idx" ON "travel_payment" USING btree ("organization_id","quote_id");--> statement-breakpoint
CREATE INDEX "travel_payment_org_date_idx" ON "travel_payment" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "travel_quote_org_created_idx" ON "travel_quote" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "travel_quote_org_contact_idx" ON "travel_quote" USING btree ("organization_id","contact_id");--> statement-breakpoint
CREATE INDEX "travel_quote_org_booking_idx" ON "travel_quote" USING btree ("organization_id","is_booking");--> statement-breakpoint
CREATE INDEX "travel_quote_org_status_idx" ON "travel_quote" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "travel_supplier_org_name_idx" ON "travel_supplier" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "travel_supplier_org_type_idx" ON "travel_supplier" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "travel_voucher_org_quote_idx" ON "travel_voucher" USING btree ("organization_id","quote_id");--> statement-breakpoint
CREATE UNIQUE INDEX "travel_voucher_org_number_uq" ON "travel_voucher" USING btree ("organization_id","voucher_number");