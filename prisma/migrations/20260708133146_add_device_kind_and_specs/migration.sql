-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PHONE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totpSecret" TEXT,
    "platform" TEXT,
    "model" TEXT,
    "osVersion" TEXT,
    "cookieSecretHash" TEXT,
    "userAgent" TEXT,
    "linkedPhoneId" TEXT,
    "pairingToken" TEXT,
    "pairingExpiresAt" DATETIME,
    "pairedAt" DATETIME,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Device_linkedPhoneId_fkey" FOREIGN KEY ("linkedPhoneId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Device" ("createdAt", "id", "label", "lastUsedAt", "pairedAt", "pairingExpiresAt", "pairingToken", "status", "totpSecret") SELECT "createdAt", "id", "label", "lastUsedAt", "pairedAt", "pairingExpiresAt", "pairingToken", "status", "totpSecret" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
CREATE UNIQUE INDEX "Device_cookieSecretHash_key" ON "Device"("cookieSecretHash");
CREATE UNIQUE INDEX "Device_pairingToken_key" ON "Device"("pairingToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
