-- CreateEnum
CREATE TYPE "ContentTrack" AS ENUM ('acompanamiento_terapeutico', 'cuidado_de_mayores', 'recursos_profesionales_at');

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "tracks" "ContentTrack"[] DEFAULT ARRAY[]::"ContentTrack"[];
