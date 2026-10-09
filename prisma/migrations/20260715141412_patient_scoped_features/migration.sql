-- AlterTable
ALTER TABLE "Note" ADD COLUMN "documentPath" TEXT;
ALTER TABLE "Note" ADD COLUMN "documentText" TEXT;

-- CreateTable
CREATE TABLE "OasisAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "notFound" BOOLEAN NOT NULL DEFAULT false,
    "citations" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OasisAnswer_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrendPresetQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "responseTone" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "kind" TEXT NOT NULL DEFAULT 'LIBRARY',
    "patientId" TEXT,
    "errorMessage" TEXT,
    "textChunks" INTEGER NOT NULL DEFAULT 0,
    "tableChunks" INTEGER NOT NULL DEFAULT 0,
    "imageChunks" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Document_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("errorMessage", "filename", "id", "imageChunks", "status", "storagePath", "tableChunks", "textChunks", "uploadedAt", "uploadedById") SELECT "errorMessage", "filename", "id", "imageChunks", "status", "storagePath", "tableChunks", "textChunks", "uploadedAt", "uploadedById" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_filename_key" ON "Document"("filename");
CREATE INDEX "Document_patientId_idx" ON "Document"("patientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OasisAnswer_documentId_page_idx" ON "OasisAnswer"("documentId", "page");

-- CreateIndex
CREATE INDEX "TrendPresetQuestion_order_idx" ON "TrendPresetQuestion"("order");
