-- CreateEnum
CREATE TYPE "ArticleScope" AS ENUM ('publico', 'suscriptores_nivel_1', 'suscriptores_nivel_2', 'suscriptores_nivel_3');

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "scope" "ArticleScope" NOT NULL DEFAULT 'publico';
