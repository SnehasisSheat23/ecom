-- Migration 0041: Identity Separation, User Roles, Partner Members & Auth Config

CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid REFERENCES "tenants"("id"),
    "email" varchar(255) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "first_name" varchar(100),
    "last_name" varchar(100),
    "phone" varchar(20),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_tenant_email" ON "users" ("tenant_id", "email");

CREATE TABLE IF NOT EXISTS "user_roles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid REFERENCES "tenants"("id"),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "role" varchar(30) NOT NULL,
    "permissions" jsonb DEFAULT null,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_roles" ON "user_roles" ("tenant_id", "user_id", "role");

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors') AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partners') THEN
        ALTER TABLE "vendors" RENAME TO "partners";
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "partners" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
    "name" varchar(255) NOT NULL,
    "slug" varchar(100) NOT NULL,
    "type" varchar(30) DEFAULT 'SELLER' NOT NULL,
    "status" varchar(30) DEFAULT 'onboarding' NOT NULL,
    "email" varchar(255),
    "phone" varchar(20),
    "description" varchar(1000),
    "logo_url" varchar(500),
    "tax_id" varchar(50),
    "address" jsonb,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "type" varchar(30) DEFAULT 'SELLER' NOT NULL;

CREATE TABLE IF NOT EXISTS "partner_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
    "partner_id" uuid NOT NULL REFERENCES "partners"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL,
    "role" varchar(20) DEFAULT 'staff' NOT NULL,
    "permissions" jsonb DEFAULT null,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_partner_member_tenant_partner_user" ON "partner_members" ("tenant_id", "partner_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_partner_members_user" ON "partner_members" ("user_id");

CREATE TABLE IF NOT EXISTS "tenant_auth_config" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL UNIQUE REFERENCES "tenants"("id"),
    "enable_email_password" boolean DEFAULT true NOT NULL,
    "enable_phone_otp" boolean DEFAULT false NOT NULL,
    "enable_google_oauth" boolean DEFAULT false NOT NULL,
    "enable_magic_link" boolean DEFAULT false NOT NULL,
    "primary_identifier" varchar(20) DEFAULT 'email' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token" varchar(255) NOT NULL UNIQUE,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "customer_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
    "token" varchar(255) NOT NULL UNIQUE,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
