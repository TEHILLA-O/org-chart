ALTER TYPE "ConnectorProvider" ADD VALUE IF NOT EXISTS 'SUPABASE';

CREATE TYPE "SkillSource" AS ENUM ('MANUAL', 'GITHUB', 'LINKEDIN', 'BIO', 'TITLE', 'DIRECTORY');
CREATE TYPE "ObjectiveStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonSkill" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "source" "SkillSource" NOT NULL DEFAULT 'MANUAL',
    "evidence" TEXT NOT NULL DEFAULT '',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonSkill_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cycleLabel" TEXT NOT NULL DEFAULT '',
    "status" "ObjectiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerPersonId" TEXT,
    "ownerPositionId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KeyResult" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '%',
    "startValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeyResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChartPresence" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "focusPositionId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChartPresence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Skill_organisationId_slug_key" ON "Skill"("organisationId", "slug");
CREATE INDEX "Skill_organisationId_name_idx" ON "Skill"("organisationId", "name");
CREATE UNIQUE INDEX "PersonSkill_personId_skillId_key" ON "PersonSkill"("personId", "skillId");
CREATE INDEX "PersonSkill_organisationId_skillId_idx" ON "PersonSkill"("organisationId", "skillId");
CREATE INDEX "Objective_organisationId_status_idx" ON "Objective"("organisationId", "status");
CREATE INDEX "Objective_ownerPersonId_idx" ON "Objective"("ownerPersonId");
CREATE INDEX "KeyResult_objectiveId_idx" ON "KeyResult"("objectiveId");
CREATE UNIQUE INDEX "ChartPresence_organisationId_userId_key" ON "ChartPresence"("organisationId", "userId");
CREATE INDEX "ChartPresence_organisationId_lastSeenAt_idx" ON "ChartPresence"("organisationId", "lastSeenAt");

ALTER TABLE "Skill" ADD CONSTRAINT "Skill_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonSkill" ADD CONSTRAINT "PersonSkill_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonSkill" ADD CONSTRAINT "PersonSkill_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonSkill" ADD CONSTRAINT "PersonSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KeyResult" ADD CONSTRAINT "KeyResult_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChartPresence" ADD CONSTRAINT "ChartPresence_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChartPresence" ADD CONSTRAINT "ChartPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
