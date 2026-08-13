-- AlterTable
ALTER TABLE `survey_submissions` ADD COLUMN `points_earned` DECIMAL(10, 2) NULL,
    ADD COLUMN `points_processed_at` DATETIME(3) NULL,
    ADD COLUMN `points_status` VARCHAR(30) NULL,
    ADD COLUMN `points_total` DECIMAL(10, 2) NULL;

-- CreateIndex
CREATE INDEX `survey_submissions_points_status_idx` ON `survey_submissions`(`points_status`);
