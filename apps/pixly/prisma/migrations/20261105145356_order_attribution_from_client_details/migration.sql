-- Rows from the old theme embed beacon are dropped, the order sync refills the table from the YouCan API
-- CreateTable
CREATE TABLE "OrderSync" (
    "store" TEXT NOT NULL PRIMARY KEY,
    "lastOrderAt" DATETIME NOT NULL,
    "syncedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderAttribution" (
    "store" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "campaignId" TEXT,
    "clickId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "utmId" TEXT,
    "landingUrl" TEXT NOT NULL,
    "referrer" TEXT,
    "orderedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("store", "orderId")
);
DROP TABLE "OrderAttribution";
ALTER TABLE "new_OrderAttribution" RENAME TO "OrderAttribution";
CREATE INDEX "OrderAttribution_store_platform_campaignId_idx" ON "OrderAttribution"("store", "platform", "campaignId");
CREATE INDEX "OrderAttribution_store_orderedAt_idx" ON "OrderAttribution"("store", "orderedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
