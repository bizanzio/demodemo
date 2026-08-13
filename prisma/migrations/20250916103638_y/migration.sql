-- AlterTable
ALTER TABLE `surveys` ADD COLUMN `ip_hash` VARCHAR(64) NULL,
    ADD COLUMN `user_agent` VARCHAR(500) NULL;

-- CreateIndex
CREATE INDEX `surveys_ip_hash_idx` ON `surveys`(`ip_hash`);
