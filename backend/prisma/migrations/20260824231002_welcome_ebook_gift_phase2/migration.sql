-- AlterTable
ALTER TABLE "ebook_claims" ADD COLUMN     "generatedFileKey" TEXT,
ADD COLUMN     "generatedFileName" TEXT;

-- AlterTable
ALTER TABLE "welcome_ebooks" ADD COLUMN     "content" TEXT,
ADD COLUMN     "storeUrl" TEXT;
