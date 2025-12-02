-- CreateTable
CREATE TABLE "weekly_goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "weekly_zero_km" INTEGER NOT NULL,
    "weekly_emission_cap_kg" INTEGER NOT NULL,
    "weekly_commute_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "weekly_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_goals_user_id_key" ON "weekly_goals"("user_id");

-- AddForeignKey
ALTER TABLE "weekly_goals" ADD CONSTRAINT "weekly_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


