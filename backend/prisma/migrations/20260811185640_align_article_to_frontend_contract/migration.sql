-- Alinea `articles` al contrato ya usado por el frontend
-- (frontend/src/types/index.ts + frontend/src/data/mockArticles.ts):
-- categoría muchos-a-muchos, `audience` como array, `subtitle` nuevo.
--
-- Escrita a mano (no autogenerada por `prisma migrate dev`) porque el modo
-- no interactivo no puede confirmar el warning de posible pérdida de datos
-- del rename de enum; la tabla `articles` está vacía en este punto del
-- desarrollo, así que se resuelve con drop+recreate en vez del rename
-- encadenado que generó `prisma migrate diff`.

-- DropForeignKey + DropIndex + DropColumn de categoryId (en cascada, la FK
-- y el índice sobre esa columna se eliminan junto con la columna).
ALTER TABLE "articles" DROP COLUMN "categoryId";

-- audience: de enum singular a array de un enum con nuevos valores.
ALTER TABLE "articles" DROP COLUMN "audience";
DROP TYPE "Audience";
CREATE TYPE "Audience" AS ENUM ('cuidadores-familiares', 'profesionales', 'mixto');
ALTER TABLE "articles" ADD COLUMN "audience" "Audience"[] NOT NULL;

-- subtitle: nuevo campo opcional.
ALTER TABLE "articles" ADD COLUMN "subtitle" TEXT;

-- CreateTable
CREATE TABLE "article_categories" (
    "articleId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("articleId","categoryId")
);

-- AddForeignKey
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
