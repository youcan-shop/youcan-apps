-- CreateTable
CREATE TABLE "OrderAttribution" (
    "store" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "platform" TEXT,
    "campaignId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "utmId" TEXT,
    "fbclid" TEXT,
    "ttclid" TEXT,
    "gclid" TEXT,
    "sccid" TEXT,
    "twclid" TEXT,
    "msclkid" TEXT,
    "landingUrl" TEXT,
    "referrer" TEXT,
    "clickedAt" DATETIME,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("store", "orderId")
);

-- CreateIndex
CREATE INDEX "OrderAttribution_store_platform_campaignId_idx" ON "OrderAttribution"("store", "platform", "campaignId");
