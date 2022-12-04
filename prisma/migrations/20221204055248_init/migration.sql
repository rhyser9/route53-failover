-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "access_key" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Credentials" (
    "access_key" TEXT NOT NULL PRIMARY KEY,
    "secret_key" TEXT NOT NULL,
    CONSTRAINT "Credentials_access_key_fkey" FOREIGN KEY ("access_key") REFERENCES "Account" ("access_key") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Zone" (
    "zone_id" TEXT NOT NULL PRIMARY KEY,
    "zone_name" TEXT NOT NULL,
    "zone_private" BOOLEAN NOT NULL,
    "account_id" TEXT NOT NULL,
    CONSTRAINT "Zone_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Site" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "fqdn" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "last_update" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notif_email" TEXT,
    "notif_teams" TEXT,
    "monitoring_link" TEXT,
    "enabled" BOOLEAN NOT NULL,
    CONSTRAINT "Site_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "Zone" ("zone_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FailoverRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "site_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "healthcheck_id" TEXT,
    "ttl" INTEGER NOT NULL,
    "weight" INTEGER,
    "managed" BOOLEAN NOT NULL,
    CONSTRAINT "FailoverRecord_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FailoverRecord_healthcheck_id_fkey" FOREIGN KEY ("healthcheck_id") REFERENCES "HealthCheck" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "port" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "fqdn" TEXT NOT NULL,
    "check_interval" INTEGER NOT NULL,
    "threshold" INTEGER NOT NULL,
    "measure_latency" BOOLEAN NOT NULL,
    "inverted" BOOLEAN NOT NULL,
    "enablesni" BOOLEAN,
    "regions" TEXT NOT NULL,
    "path" TEXT,
    "searchString" TEXT,
    "status" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "Log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "site_id" INTEGER NOT NULL,
    "user" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "log" TEXT NOT NULL,
    CONSTRAINT "Log_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Account_access_key_key" ON "Account"("access_key");

-- CreateIndex
CREATE UNIQUE INDEX "FailoverRecord_healthcheck_id_key" ON "FailoverRecord"("healthcheck_id");
