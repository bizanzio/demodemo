-- CreateTable
CREATE TABLE `SizeSystem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `systemName` VARCHAR(50) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `SizeSystem_systemName_key`(`systemName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `Supplier_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gender` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `Gender_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `genderId` INTEGER NULL,
    `supplierId` INTEGER NULL,
    `originSystemId` INTEGER NULL,
    `predefinedSystemId` INTEGER NULL,

    INDEX `genderId`(`genderId`),
    INDEX `supplierId`(`supplierId`),
    INDEX `originSystemId`(`originSystemId`),
    UNIQUE INDEX `Category_supplierId_genderId_name_key`(`supplierId`, `genderId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Size` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `originalSize` VARCHAR(10) NOT NULL,
    `displayOrder` INTEGER NULL,
    `supplierId` INTEGER NULL,
    `categoryId` INTEGER NULL,
    `sizeSystemId` INTEGER NULL,

    INDEX `categoryId`(`categoryId`),
    INDEX `sizeSystemId`(`sizeSystemId`),
    INDEX `supplierId`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SizeValue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` VARCHAR(10) NOT NULL,
    `sizeId` INTEGER NOT NULL,
    `sizeSystemId` INTEGER NOT NULL,

    INDEX `sizeId`(`sizeId`),
    INDEX `sizeSystemId`(`sizeSystemId`),
    UNIQUE INDEX `SizeValue_sizeId_sizeSystemId_key`(`sizeId`, `sizeSystemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CategoryToSizingSystems` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CategoryToSizingSystems_AB_unique`(`A`, `B`),
    INDEX `_CategoryToSizingSystems_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `category_ibfk_1` FOREIGN KEY (`genderId`) REFERENCES `Gender`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `category_ibfk_2` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_originSystemId_fkey` FOREIGN KEY (`originSystemId`) REFERENCES `SizeSystem`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_predefinedSystemId_fkey` FOREIGN KEY (`predefinedSystemId`) REFERENCES `SizeSystem`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Size` ADD CONSTRAINT `size_ibfk_1` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Size` ADD CONSTRAINT `size_ibfk_2` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Size` ADD CONSTRAINT `size_ibfk_3` FOREIGN KEY (`sizeSystemId`) REFERENCES `SizeSystem`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SizeValue` ADD CONSTRAINT `SizeValue_sizeId_fkey` FOREIGN KEY (`sizeId`) REFERENCES `Size`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SizeValue` ADD CONSTRAINT `SizeValue_sizeSystemId_fkey` FOREIGN KEY (`sizeSystemId`) REFERENCES `SizeSystem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryToSizingSystems` ADD CONSTRAINT `_CategoryToSizingSystems_A_fkey` FOREIGN KEY (`A`) REFERENCES `Category`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryToSizingSystems` ADD CONSTRAINT `_CategoryToSizingSystems_B_fkey` FOREIGN KEY (`B`) REFERENCES `SizeSystem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
