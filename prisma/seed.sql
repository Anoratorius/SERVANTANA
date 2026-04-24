-- Servantana Database Seed Script
-- Run this in Neon SQL Editor

-- Create services (upsert style - delete existing first)
DELETE FROM "WorkerService" WHERE "serviceId" IN (
  SELECT id FROM "Service" WHERE name IN ('regular', 'deep', 'moveInOut', 'postConstruction', 'airbnb', 'office', 'window', 'carpet', 'laundry', 'organizing')
);
DELETE FROM "Service" WHERE name IN ('regular', 'deep', 'moveInOut', 'postConstruction', 'airbnb', 'office', 'window', 'carpet', 'laundry', 'organizing');

INSERT INTO "Service" (id, name, description, "basePrice", duration, category, icon, "isSpecialty", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'regular', 'Standard cleaning service for homes and apartments', 50, 120, 'cleaning', 'sparkles', false, NOW(), NOW()),
  (gen_random_uuid(), 'deep', 'Thorough deep cleaning including hard-to-reach areas', 100, 240, 'cleaning', 'sparkles', false, NOW(), NOW()),
  (gen_random_uuid(), 'moveInOut', 'Complete cleaning for move-in or move-out', 150, 300, 'cleaning', 'home', true, NOW(), NOW()),
  (gen_random_uuid(), 'postConstruction', 'Thorough cleaning after construction or renovation', 200, 360, 'cleaning', 'hammer', true, NOW(), NOW()),
  (gen_random_uuid(), 'airbnb', 'Quick turnover cleaning for short-term rentals', 80, 90, 'cleaning', 'key', true, NOW(), NOW()),
  (gen_random_uuid(), 'office', 'Professional office and commercial space cleaning', 80, 180, 'cleaning', 'building', false, NOW(), NOW()),
  (gen_random_uuid(), 'window', 'Interior and exterior window cleaning', 60, 90, 'cleaning', 'square', false, NOW(), NOW()),
  (gen_random_uuid(), 'carpet', 'Professional carpet and rug cleaning', 70, 120, 'cleaning', 'rectangle', false, NOW(), NOW()),
  (gen_random_uuid(), 'laundry', 'Laundry washing, drying, and folding service', 40, 60, 'cleaning', 'shirt', false, NOW(), NOW()),
  (gen_random_uuid(), 'organizing', 'Home organization and decluttering service', 60, 180, 'organizing', 'folder', false, NOW(), NOW());

-- Create admin user (upsert style)
DELETE FROM "User" WHERE email = 'nimda@servantana.com';

INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "emailVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'nimda@servantana.com',
  '$2b$12$.LJTGtqVrAPxHUC9XUtbf.NZlLMIhO5bUMD1qBpz6AZthZqbfEG12',
  'Admin',
  'User',
  'ADMIN',
  NOW(),
  NOW(),
  NOW()
);

-- Delete existing sample workers first (cascade delete handles related records)
DELETE FROM "Availability" WHERE "workerId" IN (
  SELECT wp.id FROM "WorkerProfile" wp
  JOIN "User" u ON wp."userId" = u.id
  WHERE u.email IN ('maria.garcia@example.com', 'james.wilson@example.com', 'sarah.johnson@example.com', 'michael.chen@example.com')
);
DELETE FROM "WorkerService" WHERE "workerId" IN (
  SELECT wp.id FROM "WorkerProfile" wp
  JOIN "User" u ON wp."userId" = u.id
  WHERE u.email IN ('maria.garcia@example.com', 'james.wilson@example.com', 'sarah.johnson@example.com', 'michael.chen@example.com')
);
DELETE FROM "WorkerProfile" WHERE "userId" IN (
  SELECT id FROM "User" WHERE email IN ('maria.garcia@example.com', 'james.wilson@example.com', 'sarah.johnson@example.com', 'michael.chen@example.com')
);
DELETE FROM "User" WHERE email IN ('maria.garcia@example.com', 'james.wilson@example.com', 'sarah.johnson@example.com', 'michael.chen@example.com');

-- Create sample workers with profiles
-- Worker 1: Maria Garcia
WITH new_user AS (
  INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'maria.garcia@example.com', '$2b$12$7A3FVzqkrWyG26fN46g43.OzSdXXqRH0DDiCp06GGgysZ/3SY7Ukq', 'Maria', 'Garcia', 'WORKER', NOW(), NOW())
  RETURNING id
),
new_profile AS (
  INSERT INTO "WorkerProfile" (id, "userId", bio, "hourlyRate", "experienceYears", city, state, country, verified, "availableNow", "averageRating", "totalBookings", "responseTime", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), id, 'Professional service provider with over 8 years of experience. I take pride in delivering excellent results. Specializing in deep cleaning and move-in/out services.', 35, 8, 'Tbilisi', '', 'USA', true, true, 4.9, 127, 15, NOW(), NOW()
  FROM new_user
  RETURNING id
)
INSERT INTO "WorkerService" (id, "workerId", "serviceId", "createdAt")
SELECT gen_random_uuid(), new_profile.id, s.id, NOW()
FROM new_profile, "Service" s
WHERE s.name IN ('regular', 'deep', 'moveInOut');

-- Add availability for Maria (Mon-Fri 9am-5pm)
INSERT INTO "Availability" (id, "workerId", "dayOfWeek", "startTime", "endTime", "createdAt", "updatedAt")
SELECT gen_random_uuid(), wp.id, day, '09:00', '17:00', NOW(), NOW()
FROM "WorkerProfile" wp
JOIN "User" u ON wp."userId" = u.id
CROSS JOIN generate_series(1, 5) AS day
WHERE u.email = 'maria.garcia@example.com';

-- Worker 2: James Wilson
WITH new_user AS (
  INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'james.wilson@example.com', '$2b$12$7A3FVzqkrWyG26fN46g43.OzSdXXqRH0DDiCp06GGgysZ/3SY7Ukq', 'James', 'Wilson', 'WORKER', NOW(), NOW())
  RETURNING id
),
new_profile AS (
  INSERT INTO "WorkerProfile" (id, "userId", bio, "hourlyRate", "experienceYears", city, state, country, verified, "availableNow", "averageRating", "totalBookings", "responseTime", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), id, 'Reliable and detail-oriented professional. I use eco-friendly products and pay attention to every detail.', 30, 5, 'Tbilisi', '', 'USA', true, false, 4.7, 89, 30, NOW(), NOW()
  FROM new_user
  RETURNING id
)
INSERT INTO "WorkerService" (id, "workerId", "serviceId", "createdAt")
SELECT gen_random_uuid(), new_profile.id, s.id, NOW()
FROM new_profile, "Service" s
WHERE s.name IN ('regular', 'window', 'carpet');

-- Add availability for James (Mon-Fri 9am-5pm)
INSERT INTO "Availability" (id, "workerId", "dayOfWeek", "startTime", "endTime", "createdAt", "updatedAt")
SELECT gen_random_uuid(), wp.id, day, '09:00', '17:00', NOW(), NOW()
FROM "WorkerProfile" wp
JOIN "User" u ON wp."userId" = u.id
CROSS JOIN generate_series(1, 5) AS day
WHERE u.email = 'james.wilson@example.com';

-- Worker 3: Sarah Johnson
WITH new_user AS (
  INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'sarah.johnson@example.com', '$2b$12$7A3FVzqkrWyG26fN46g43.OzSdXXqRH0DDiCp06GGgysZ/3SY7Ukq', 'Sarah', 'Johnson', 'WORKER', NOW(), NOW())
  RETURNING id
),
new_profile AS (
  INSERT INTO "WorkerProfile" (id, "userId", bio, "hourlyRate", "experienceYears", city, state, country, verified, "availableNow", "averageRating", "totalBookings", "responseTime", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), id, 'Experienced office and residential service provider. I deliver thorough, consistent services that you can count on week after week.', 40, 10, 'Tbilisi', '', 'USA', true, true, 4.8, 215, 20, NOW(), NOW()
  FROM new_user
  RETURNING id
)
INSERT INTO "WorkerService" (id, "workerId", "serviceId", "createdAt")
SELECT gen_random_uuid(), new_profile.id, s.id, NOW()
FROM new_profile, "Service" s
WHERE s.name IN ('regular', 'deep', 'office', 'organizing');

-- Add availability for Sarah (Mon-Fri 9am-5pm)
INSERT INTO "Availability" (id, "workerId", "dayOfWeek", "startTime", "endTime", "createdAt", "updatedAt")
SELECT gen_random_uuid(), wp.id, day, '09:00', '17:00', NOW(), NOW()
FROM "WorkerProfile" wp
JOIN "User" u ON wp."userId" = u.id
CROSS JOIN generate_series(1, 5) AS day
WHERE u.email = 'sarah.johnson@example.com';

-- Worker 4: Michael Chen
WITH new_user AS (
  INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'michael.chen@example.com', '$2b$12$7A3FVzqkrWyG26fN46g43.OzSdXXqRH0DDiCp06GGgysZ/3SY7Ukq', 'Michael', 'Chen', 'WORKER', NOW(), NOW())
  RETURNING id
),
new_profile AS (
  INSERT INTO "WorkerProfile" (id, "userId", bio, "hourlyRate", "experienceYears", city, state, country, verified, "availableNow", "averageRating", "totalBookings", "responseTime", "createdAt", "updatedAt")
  SELECT gen_random_uuid(), id, 'Professional service provider specializing in carpet and upholstery care. I use industry-leading equipment for the best results.', 45, 6, 'Tbilisi', '', 'USA', false, true, 4.6, 52, 45, NOW(), NOW()
  FROM new_user
  RETURNING id
)
INSERT INTO "WorkerService" (id, "workerId", "serviceId", "createdAt")
SELECT gen_random_uuid(), new_profile.id, s.id, NOW()
FROM new_profile, "Service" s
WHERE s.name IN ('carpet', 'deep', 'laundry');

-- Add availability for Michael (Mon-Fri 9am-5pm)
INSERT INTO "Availability" (id, "workerId", "dayOfWeek", "startTime", "endTime", "createdAt", "updatedAt")
SELECT gen_random_uuid(), wp.id, day, '09:00', '17:00', NOW(), NOW()
FROM "WorkerProfile" wp
JOIN "User" u ON wp."userId" = u.id
CROSS JOIN generate_series(1, 5) AS day
WHERE u.email = 'michael.chen@example.com';

-- Verify seeding
SELECT 'Services:' as type, COUNT(*) as count FROM "Service"
UNION ALL
SELECT 'Users:', COUNT(*) FROM "User"
UNION ALL
SELECT 'WorkerProfiles:', COUNT(*) FROM "WorkerProfile"
UNION ALL
SELECT 'WorkerServices:', COUNT(*) FROM "WorkerService"
UNION ALL
SELECT 'Availability:', COUNT(*) FROM "Availability";
