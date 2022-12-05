-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "site_id" INTEGER,
    "user" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "log" TEXT NOT NULL,
    CONSTRAINT "Log_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Log" ("action", "id", "log", "site_id", "time", "user") SELECT "action", "id", "log", "site_id", "time", "user" FROM "Log";
DROP TABLE "Log";
ALTER TABLE "new_Log" RENAME TO "Log";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
