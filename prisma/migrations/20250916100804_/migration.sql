/*
  Warnings:

  - You are about to alter the column `wait_time_range` on the `surveys` table. The data in that column could be lost. The data in that column will be cast from `VarChar(10)` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[survey_id]` on the table `survey_submissions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `surveys` MODIFY `wait_time_range` ENUM('less2', '2to5', '5to10', 'more10') NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `survey_submissions_survey_id_key` ON `survey_submissions`(`survey_id`);

-- CreateIndex
CREATE INDEX `survey_submissions_survey_id_idx` ON `survey_submissions`(`survey_id`);

-- CreateIndex
CREATE INDEX `surveys_locale_submitted_at_idx` ON `surveys`(`locale`, `submitted_at`);

-- AddForeignKey
ALTER TABLE `survey_submissions` ADD CONSTRAINT `survey_submissions_survey_id_fkey` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
