-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totpSecret" TEXT,
    "pairingToken" TEXT,
    "pairingExpiresAt" DATETIME,
    "pairedAt" DATETIME,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_pairingToken_key" ON "Device"("pairingToken");
