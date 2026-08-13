-- AlterTable
ALTER TABLE `survey_submissions` ADD COLUMN `reward_processed_at` DATETIME(3) NULL,
    ADD COLUMN `reward_status` VARCHAR(30) NULL,
    ADD COLUMN `voucher_amount` DECIMAL(10, 2) NULL,
    ADD COLUMN `voucher_id` VARCHAR(100) NULL;
