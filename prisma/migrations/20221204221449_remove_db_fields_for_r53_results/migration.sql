/*
  Warnings:

  - You are about to drop the `FailoverRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HealthCheck` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Zone` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `account_id` to the `Site` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "FailoverRecord_healthcheck_id_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "FailoverRecord";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "HealthCheck";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Zone";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Site" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "fqdn" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "last_update" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notif_email" TEXT,
    "notif_teams" TEXT,
    "monitoring_link" TEXT,
    "enabled" BOOLEAN NOT NULL,
    CONSTRAINT "Site_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Site" ("enabled", "fqdn", "id", "last_update", "monitoring_link", "name", "notif_email", "notif_teams", "zone_id") SELECT "enabled", "fqdn", "id", "last_update", "monitoring_link", "name", "notif_email", "notif_teams", "zone_id" FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
