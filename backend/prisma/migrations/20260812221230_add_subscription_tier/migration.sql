-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('gratuito', 'nivel_2', 'nivel_3');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'gratuito';
