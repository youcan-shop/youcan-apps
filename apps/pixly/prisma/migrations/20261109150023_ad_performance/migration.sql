-- AlterTable
ALTER TABLE "MetaConnection" ADD COLUMN "spendSyncedAt" DATETIME;

-- CreateTable
CREATE TABLE "MetaCampaignSpend" (
    "store" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "spend" REAL NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,

    PRIMARY KEY ("store", "campaignId", "date"),
    CONSTRAINT "MetaCampaignSpend_store_fkey" FOREIGN KEY ("store") REFERENCES "MetaConnection" ("store") ON DELETE CASCADE ON UPDATE CASCADE
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
    "total" REAL NOT NULL DEFAULT 0,
    "currency" TEXT,
    "confirmationStatus" TEXT,
    "shippingStatus" TEXT,
    "statusCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("store", "orderId")
);
INSERT INTO "new_OrderAttribution" ("campaignId", "clickId", "createdAt", "landingUrl", "orderId", "orderRef", "orderedAt", "platform", "referrer", "store", "utmCampaign", "utmContent", "utmId", "utmMedium", "utmSource", "utmTerm") SELECT "campaignId", "clickId", "createdAt", "landingUrl", "orderId", "orderRef", "orderedAt", "platform", "referrer", "store", "utmCampaign", "utmContent", "utmId", "utmMedium", "utmSource", "utmTerm" FROM "OrderAttribution";
DROP TABLE "OrderAttribution";
ALTER TABLE "new_OrderAttribution" RENAME TO "OrderAttribution";
CREATE INDEX "OrderAttribution_store_platform_campaignId_idx" ON "OrderAttribution"("store", "platform", "campaignId");
CREATE INDEX "OrderAttribution_store_orderedAt_idx" ON "OrderAttribution"("store", "orderedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MetaCampaignSpend_store_date_idx" ON "MetaCampaignSpend"("store", "date");

