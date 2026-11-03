-- CreateTable
CREATE TABLE "MetaConnection" (
    "store" TEXT NOT NULL PRIMARY KEY,
    "accessToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "metaUserId" TEXT NOT NULL,
    "metaUserName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MetaAdAccount" (
    "store" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT,
    "businessName" TEXT,
    "status" INTEGER NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("store", "id"),
    CONSTRAINT "MetaAdAccount_store_fkey" FOREIGN KEY ("store") REFERENCES "MetaConnection" ("store") ON DELETE CASCADE ON UPDATE CASCADE
);

