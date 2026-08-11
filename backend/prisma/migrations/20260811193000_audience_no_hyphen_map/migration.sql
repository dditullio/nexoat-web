-- Revierte el @map de valores del enum Audience: el Prisma Client nunca
-- reflejó el string con guion en runtime (@map solo afecta el valor
-- guardado en DB), así que la traducción al formato del frontend se maneja
-- en código (articles/audience.util.ts) y el enum vuelve a guardarse tal
-- cual el identificador Prisma.
BEGIN;
CREATE TYPE "Audience_new" AS ENUM ('cuidadores_familiares', 'profesionales', 'mixto');
ALTER TABLE "articles" ALTER COLUMN "audience" TYPE "Audience_new"[] USING ("audience"::text::"Audience_new"[]);
ALTER TYPE "Audience" RENAME TO "Audience_old";
ALTER TYPE "Audience_new" RENAME TO "Audience";
DROP TYPE "public"."Audience_old";
COMMIT;
