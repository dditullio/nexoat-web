-- AlterEnum
ALTER TYPE "VerificationTokenType" ADD VALUE 'account_activation';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);

-- Backfill: las cuentas que ya existían no pasan por el onboarding nuevo
-- retroactivamente (ver docs/features/email-first-signup-and-onboarding.md,
-- decisión 9). "termsAcceptedAt" queda NULL a propósito -- nunca aceptaron
-- nada, no se simula que sí.
UPDATE "users" SET "onboardingCompletedAt" = now() WHERE "onboardingCompletedAt" IS NULL;
