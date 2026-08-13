-- CreateTable
CREATE TABLE `Int_Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referenceId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `Int_Category_referenceId_key`(`referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_IntCategoryToCategory` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_IntCategoryToCategory_AB_unique`(`A`, `B`),
    INDEX `_IntCategoryToCategory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_IntCategoryToCategory` ADD CONSTRAINT `_IntCategoryToCategory_A_fkey` FOREIGN KEY (`A`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_IntCategoryToCategory` ADD CONSTRAINT `_IntCategoryToCategory_B_fkey` FOREIGN KEY (`B`) REFERENCES `Int_Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
