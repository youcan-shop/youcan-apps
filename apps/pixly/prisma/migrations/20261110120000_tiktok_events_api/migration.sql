-- CreateTable
CREATE TABLE "TikTokConnection" (
    "store" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "storeDomain" TEXT,
    "pixelCode" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "testEventCode" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "collectKey" TEXT NOT NULL,
    "webPixelId" TEXT,
    "lastEventAt" DATETIME,
    "lastError" TEXT,
    "lastErrorAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TikTokVisitor" (
    "store" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ttp" TEXT,
    "ttclid" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("store", "clientId")
);

-- CreateIndex
CREATE UNIQUE INDEX "TikTokConnection_storeId_key" ON "TikTokConnection"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "TikTokConnection_collectKey_key" ON "TikTokConnection"("collectKey");

-- CreateIndex
CREATE INDEX "TikTokVisitor_updatedAt_idx" ON "TikTokVisitor"("updatedAt");

