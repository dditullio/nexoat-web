-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "visibleArticleScopes" "ArticleScope"[] DEFAULT ARRAY['suscriptores_nivel_1']::"ArticleScope"[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
