/*
  Warnings:

  - You are about to drop the `ledger` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ledger` DROP FOREIGN KEY `Ledger_rewardId_fkey`;

-- DropTable
DROP TABLE `ledger`;
