-- CreateTable
CREATE TABLE "welcome_ebooks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "slug" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "coverImage" TEXT,
    "coverImagePublicId" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "welcome_ebooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebook_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ebookId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ebook_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "welcome_ebooks_slug_key" ON "welcome_ebooks"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ebook_claims_userId_key" ON "ebook_claims"("userId");

-- CreateIndex
CREATE INDEX "ebook_claims_ebookId_idx" ON "ebook_claims"("ebookId");

-- AddForeignKey
ALTER TABLE "ebook_claims" ADD CONSTRAINT "ebook_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebook_claims" ADD CONSTRAINT "ebook_claims_ebookId_fkey" FOREIGN KEY ("ebookId") REFERENCES "welcome_ebooks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
