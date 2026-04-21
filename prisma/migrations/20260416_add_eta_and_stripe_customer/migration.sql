-- CreateEnum
CREATE TYPE "EtaStatus" AS ENUM ('ON_THE_WAY', 'ARRIVED', 'STARTED', 'COMPLETED');

-- AlterTable: Add etaStatus to Booking
ALTER TABLE "Booking" ADD COLUMN "etaStatus" "EtaStatus";

-- AlterTable: Add stripeCustomerId to User
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
