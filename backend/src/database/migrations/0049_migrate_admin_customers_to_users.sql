-- Migration 0049: Migrate existing admin customer accounts into users and user_roles tables

INSERT INTO "users" ("id", "tenant_id", "email", "password_hash", "first_name", "last_name", "phone", "created_at", "updated_at")
SELECT 
    c.id,
    c.tenant_id,
    c.email,
    COALESCE(c.password_hash, '$2a$10$UnusedPlaceholderPasswordHashForMigratedUser0000000'),
    c.first_name,
    c.last_name,
    c.phone,
    c.created_at,
    c.updated_at
FROM "customers" c
WHERE c.is_admin = true
ON CONFLICT DO NOTHING;

INSERT INTO "user_roles" ("id", "tenant_id", "user_id", "role", "permissions", "created_at")
SELECT 
    gen_random_uuid(),
    c.tenant_id,
    c.id,
    CASE 
        WHEN c.tenant_id IS NULL THEN 'PLATFORM_ADMIN'
        ELSE 'TENANT_ADMIN'
    END,
    NULL,
    NOW()
FROM "customers" c
WHERE c.is_admin = true
ON CONFLICT DO NOTHING;
