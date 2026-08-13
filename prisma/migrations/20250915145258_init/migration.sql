-- CreateTable
CREATE TABLE `surveys` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(100) NOT NULL,
    `csat_score` TINYINT NOT NULL,
    `nps_score` TINYINT NOT NULL,
    `salesperson_rating` TINYINT NOT NULL,
    `found_everything` BOOLEAN NOT NULL,
    `wait_time_range` VARCHAR(10) NOT NULL,
    `comment` TEXT NULL,
    `locale` VARCHAR(5) NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `surveys_ticket_id_key`(`ticket_id`),
    INDEX `surveys_ticket_id_idx`(`ticket_id`),
    INDEX `surveys_submitted_at_idx`(`submitted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(100) NOT NULL,
    `survey_id` VARCHAR(191) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'completed',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `survey_submissions_ticket_id_key`(`ticket_id`),
    INDEX `survey_submissions_ticket_id_idx`(`ticket_id`),
    INDEX `survey_submissions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
