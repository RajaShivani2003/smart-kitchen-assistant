-- CreateTable
CREATE TABLE `user_recipes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `cuisine` VARCHAR(191) NOT NULL DEFAULT 'Other',
    `mealType` VARCHAR(191) NOT NULL,
    `cookingTime` INTEGER NOT NULL,
    `servings` INTEGER NOT NULL,
    `difficulty` VARCHAR(191) NOT NULL DEFAULT 'Medium',
    `nutritionalInfo` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_recipes_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_recipe_ingredients` (
    `id` VARCHAR(191) NOT NULL,
    `userRecipeId` VARCHAR(191) NOT NULL,
    `ingredient` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NULL,

    INDEX `user_recipe_ingredients_userRecipeId_idx`(`userRecipeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_recipe_steps` (
    `id` VARCHAR(191) NOT NULL,
    `userRecipeId` VARCHAR(191) NOT NULL,
    `stepNumber` INTEGER NOT NULL,
    `instruction` VARCHAR(191) NOT NULL,
    `estimatedTime` INTEGER NULL,

    INDEX `user_recipe_steps_userRecipeId_idx`(`userRecipeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_recipes` ADD CONSTRAINT `user_recipes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_recipe_ingredients` ADD CONSTRAINT `user_recipe_ingredients_userRecipeId_fkey` FOREIGN KEY (`userRecipeId`) REFERENCES `user_recipes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_recipe_steps` ADD CONSTRAINT `user_recipe_steps_userRecipeId_fkey` FOREIGN KEY (`userRecipeId`) REFERENCES `user_recipes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
