CREATE TYPE "OrgGroupKind" AS ENUM ('COHORT', 'GOVERNANCE', 'FUNCTION', 'TEAM');
CREATE TYPE "ProfileLinkProvider" AS ENUM ('GITHUB', 'LINKEDIN', 'GRAVATAR', 'IMAGE_URL', 'MANUAL');

ALTER TABLE "Person" ADD COLUMN "profileLinkUrl" TEXT;
ALTER TABLE "Person" ADD COLUMN "profileLinkUsername" TEXT;
ALTER TABLE "Person" ADD COLUMN "profileLinkProvider" "ProfileLinkProvider";
ALTER TABLE "Person" ADD COLUMN "bio" TEXT;

CREATE TABLE "OrgGroup" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "OrgGroupKind" NOT NULL DEFAULT 'TEAM',
    "colour" TEXT,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrgGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonGroupMembership" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonGroupMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgGroup_organisationId_slug_key" ON "OrgGroup"("organisationId", "slug");
CREATE INDEX "OrgGroup_organisationId_kind_idx" ON "OrgGroup"("organisationId", "kind");
CREATE UNIQUE INDEX "PersonGroupMembership_personId_groupId_key" ON "PersonGroupMembership"("personId", "groupId");
CREATE INDEX "PersonGroupMembership_organisationId_groupId_idx" ON "PersonGroupMembership"("organisationId", "groupId");

ALTER TABLE "OrgGroup" ADD CONSTRAINT "OrgGroup_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonGroupMembership" ADD CONSTRAINT "PersonGroupMembership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonGroupMembership" ADD CONSTRAINT "PersonGroupMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonGroupMembership" ADD CONSTRAINT "PersonGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrgGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
