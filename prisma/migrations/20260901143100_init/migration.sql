-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."OrgRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."PersonStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."PositionType" AS ENUM ('SINGLE', 'SHARED', 'ASSISTANT', 'DEPARTMENT', 'LOCATION', 'LINKED_CHART');

-- CreateEnum
CREATE TYPE "public"."EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "public"."PositionStatus" AS ENUM ('ACTIVE', 'VACANT', 'PLANNED', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."AssignmentType" AS ENUM ('PERMANENT', 'INTERIM', 'ACTING', 'SECONDMENT', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "public"."RelationshipType" AS ENUM ('PRIMARY', 'SECONDARY', 'DOTTED_LINE', 'FUNCTIONAL', 'PROJECT');

-- CreateEnum
CREATE TYPE "public"."ChartVisibility" AS ENUM ('PRIVATE', 'ORGANISATION', 'SHARED');

-- CreateEnum
CREATE TYPE "public"."LayoutDirection" AS ENUM ('TOP_DOWN', 'LEFT_RIGHT', 'BOTTOM_UP', 'MATRIX', 'GOVERNANCE');

-- CreateEnum
CREATE TYPE "public"."NodeStyle" AS ENUM ('COMPACT', 'STANDARD', 'DETAILED');

-- CreateEnum
CREATE TYPE "public"."SnapshotSource" AS ENUM ('MANUAL', 'SCHEDULED', 'PRE_SYNC', 'PRE_IMPORT', 'SCENARIO_BASE');

-- CreateEnum
CREATE TYPE "public"."ScenarioStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED', 'APPLIED');

-- CreateEnum
CREATE TYPE "public"."ScenarioChangeType" AS ENUM ('ADD_POSITION', 'REMOVE_POSITION', 'MOVE_POSITION', 'UPDATE_POSITION', 'ASSIGN_PERSON', 'UNASSIGN_PERSON', 'ADD_RELATIONSHIP', 'REMOVE_RELATIONSHIP', 'CREATE_VACANCY');

-- CreateEnum
CREATE TYPE "public"."CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT', 'MULTI_SELECT', 'URL');

-- CreateEnum
CREATE TYPE "public"."CustomFieldTarget" AS ENUM ('PERSON', 'POSITION');

-- CreateEnum
CREATE TYPE "public"."FieldVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'ADMIN_ONLY');

-- CreateEnum
CREATE TYPE "public"."ConnectorProvider" AS ENUM ('CSV', 'MICROSOFT_MOCK', 'MICROSOFT_GRAPH', 'GOOGLE_WORKSPACE', 'BAMBOO_HR', 'GENERIC_REST');

-- CreateEnum
CREATE TYPE "public"."ConnectorStatus" AS ENUM ('NOT_CONFIGURED', 'CONNECTED', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."ExternalEntityType" AS ENUM ('PERSON', 'POSITION', 'DEPARTMENT', 'LOCATION', 'RELATIONSHIP');

-- CreateEnum
CREATE TYPE "public"."SyncStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."SyncTrigger" AS ENUM ('MANUAL', 'SCHEDULED', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "public"."SyncMode" AS ENUM ('PREVIEW', 'APPLY');

-- CreateEnum
CREATE TYPE "public"."SyncRecordAction" AS ENUM ('CREATE', 'UPDATE', 'UNCHANGED', 'DEACTIVATE', 'ERROR', 'SKIP');

-- CreateEnum
CREATE TYPE "public"."DataSource" AS ENUM ('LOCAL', 'CSV_IMPORT', 'MICROSOFT_MOCK', 'MICROSOFT_365', 'ENTRA_ID', 'GOOGLE_WORKSPACE', 'BAMBOO_HR', 'GENERIC_REST');

-- CreateEnum
CREATE TYPE "public"."SharePermission" AS ENUM ('VIEW_ONLY', 'VIEW_AND_EXPORT');

-- CreateEnum
CREATE TYPE "public"."ActorType" AS ENUM ('USER', 'SYSTEM', 'CONNECTOR', 'SHARE_LINK');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'MOVE_POSITION', 'ASSIGN_PERSON', 'UNASSIGN_PERSON', 'SYNC_APPLIED', 'IMPORT_APPLIED', 'SCENARIO_APPLIED', 'PERMISSION_CHANGED', 'SHARE_CREATED', 'SHARE_REVOKED', 'EXPORT', 'LOGIN', 'LOGIN_FAILED');

-- CreateEnum
CREATE TYPE "public"."ImportJobStatus" AS ENUM ('UPLOADED', 'ANALYSED', 'MAPPED', 'VALIDATED', 'PREVIEWED', 'APPLYING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ImportRowStatus" AS ENUM ('PENDING', 'NEW', 'CHANGED', 'UNCHANGED', 'MISSING', 'DUPLICATE', 'INVALID', 'APPLIED', 'SKIPPED');

-- CreateTable
CREATE TABLE "public"."Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."OrganisationMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "role" "public"."OrgRole" NOT NULL,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganisationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Person" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "preferredName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "profilePhotoUrl" TEXT,
    "status" "public"."PersonStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "employeeId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Position" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "departmentId" TEXT,
    "locationId" TEXT,
    "positionType" "public"."PositionType" NOT NULL DEFAULT 'SINGLE',
    "employmentType" "public"."EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "public"."PositionStatus" NOT NULL DEFAULT 'ACTIVE',
    "plannedHireDate" TIMESTAMP(3),
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Assignment" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "assignmentType" "public"."AssignmentType" NOT NULL DEFAULT 'PERMANENT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "allocationPercentage" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReportingRelationship" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "subordinatePositionId" TEXT NOT NULL,
    "managerPositionId" TEXT NOT NULL,
    "relationshipType" "public"."RelationshipType" NOT NULL DEFAULT 'PRIMARY',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReportingRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Department" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parentDepartmentId" TEXT,
    "colour" TEXT,
    "headPositionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "timezone" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Chart" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "rootPositionId" TEXT,
    "scenarioId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "public"."ChartVisibility" NOT NULL DEFAULT 'ORGANISATION',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Chart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChartConfiguration" (
    "id" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "layoutDirection" "public"."LayoutDirection" NOT NULL DEFAULT 'TOP_DOWN',
    "nodeStyle" "public"."NodeStyle" NOT NULL DEFAULT 'STANDARD',
    "showPhotos" BOOLEAN NOT NULL DEFAULT true,
    "showVacancies" BOOLEAN NOT NULL DEFAULT true,
    "showSecondaryLines" BOOLEAN NOT NULL DEFAULT true,
    "showDirectReportCount" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "visibleFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultFilters" JSONB NOT NULL DEFAULT '{}',
    "collapsedPositionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Snapshot" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "source" "public"."SnapshotSource" NOT NULL,
    "changeCount" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Scenario" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "baseSnapshotId" TEXT NOT NULL,
    "status" "public"."ScenarioStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScenarioChange" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "changeType" "public"."ScenarioChangeType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "public"."CustomFieldType" NOT NULL,
    "appliesTo" "public"."CustomFieldTarget" NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" "public"."FieldVisibility" NOT NULL DEFAULT 'INTERNAL',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isSearchable" BOOLEAN NOT NULL DEFAULT false,
    "isFilterable" BOOLEAN NOT NULL DEFAULT false,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomFieldValue" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "personId" TEXT,
    "positionId" TEXT,
    "value" JSONB NOT NULL,
    "source" "public"."DataSource" NOT NULL DEFAULT 'LOCAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Connector" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "provider" "public"."ConnectorProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."ConnectorStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "config" JSONB NOT NULL DEFAULT '{}',
    "encryptedCredentials" BYTEA,
    "syncCursor" TEXT,
    "syncSchedule" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "isReadOnly" BOOLEAN NOT NULL DEFAULT true,
    "autoDeactivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalIdentity" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "provider" "public"."ConnectorProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "entityType" "public"."ExternalEntityType" NOT NULL,
    "personId" TEXT,
    "positionId" TEXT,
    "departmentId" TEXT,
    "locationId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "sourceModifiedAt" TIMESTAMP(3),
    "syncHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FieldMapping" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "entityType" "public"."ExternalEntityType" NOT NULL,
    "sourceField" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "transform" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncJob" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "status" "public"."SyncStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" "public"."SyncTrigger" NOT NULL,
    "mode" "public"."SyncMode" NOT NULL DEFAULT 'PREVIEW',
    "correlationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "deactivatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "cursorBefore" TEXT,
    "cursorAfter" TEXT,
    "error" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncRecord" (
    "id" TEXT NOT NULL,
    "syncJobId" TEXT NOT NULL,
    "entityType" "public"."ExternalEntityType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "action" "public"."SyncRecordAction" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FieldProvenance" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "source" "public"."DataSource" NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "isLocallyOverridden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldProvenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImportJob" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "public"."ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "columnMap" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImportRow" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "raw" JSONB NOT NULL,
    "status" "public"."ImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShareLink" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "passwordHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "permissions" "public"."SharePermission" NOT NULL DEFAULT 'VIEW_ONLY',
    "allowedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowEmbed" BOOLEAN NOT NULL DEFAULT false,
    "allowedFrameAncestors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditEvent" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" "public"."ActorType" NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousState" JSONB,
    "newState" JSONB,
    "source" "public"."DataSource" NOT NULL DEFAULT 'LOCAL',
    "correlationId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "public"."Organisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "OrganisationMembership_organisationId_role_idx" ON "public"."OrganisationMembership"("organisationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationMembership_userId_organisationId_key" ON "public"."OrganisationMembership"("userId", "organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_userId_key" ON "public"."Person"("userId");

-- CreateIndex
CREATE INDEX "Person_organisationId_status_idx" ON "public"."Person"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Person_organisationId_displayName_idx" ON "public"."Person"("organisationId", "displayName");

-- CreateIndex
CREATE INDEX "Person_organisationId_lastName_firstName_idx" ON "public"."Person"("organisationId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Person_organisationId_deletedAt_idx" ON "public"."Person"("organisationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Person_organisationId_email_key" ON "public"."Person"("organisationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_organisationId_employeeId_key" ON "public"."Person"("organisationId", "employeeId");

-- CreateIndex
CREATE INDEX "Position_organisationId_status_idx" ON "public"."Position"("organisationId", "status");

-- CreateIndex
CREATE INDEX "Position_organisationId_departmentId_idx" ON "public"."Position"("organisationId", "departmentId");

-- CreateIndex
CREATE INDEX "Position_organisationId_locationId_idx" ON "public"."Position"("organisationId", "locationId");

-- CreateIndex
CREATE INDEX "Position_organisationId_title_idx" ON "public"."Position"("organisationId", "title");

-- CreateIndex
CREATE INDEX "Position_organisationId_deletedAt_idx" ON "public"."Position"("organisationId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Position_organisationId_code_key" ON "public"."Position"("organisationId", "code");

-- CreateIndex
CREATE INDEX "Assignment_positionId_endDate_idx" ON "public"."Assignment"("positionId", "endDate");

-- CreateIndex
CREATE INDEX "Assignment_personId_endDate_idx" ON "public"."Assignment"("personId", "endDate");

-- CreateIndex
CREATE INDEX "Assignment_organisationId_isPrimary_idx" ON "public"."Assignment"("organisationId", "isPrimary");

-- CreateIndex
CREATE INDEX "ReportingRelationship_organisationId_effectiveTo_idx" ON "public"."ReportingRelationship"("organisationId", "effectiveTo");

-- CreateIndex
CREATE INDEX "ReportingRelationship_subordinatePositionId_relationshipTyp_idx" ON "public"."ReportingRelationship"("subordinatePositionId", "relationshipType");

-- CreateIndex
CREATE INDEX "ReportingRelationship_managerPositionId_relationshipType_idx" ON "public"."ReportingRelationship"("managerPositionId", "relationshipType");

-- CreateIndex
CREATE INDEX "ReportingRelationship_organisationId_isPrimary_effectiveTo_idx" ON "public"."ReportingRelationship"("organisationId", "isPrimary", "effectiveTo");

-- CreateIndex
CREATE INDEX "Department_organisationId_name_idx" ON "public"."Department"("organisationId", "name");

-- CreateIndex
CREATE INDEX "Department_parentDepartmentId_idx" ON "public"."Department"("parentDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_organisationId_code_key" ON "public"."Department"("organisationId", "code");

-- CreateIndex
CREATE INDEX "Location_organisationId_name_idx" ON "public"."Location"("organisationId", "name");

-- CreateIndex
CREATE INDEX "Chart_organisationId_isDefault_idx" ON "public"."Chart"("organisationId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "ChartConfiguration_chartId_key" ON "public"."ChartConfiguration"("chartId");

-- CreateIndex
CREATE INDEX "Snapshot_organisationId_capturedAt_idx" ON "public"."Snapshot"("organisationId", "capturedAt");

-- CreateIndex
CREATE INDEX "Scenario_organisationId_status_idx" ON "public"."Scenario"("organisationId", "status");

-- CreateIndex
CREATE INDEX "ScenarioChange_scenarioId_createdAt_idx" ON "public"."ScenarioChange"("scenarioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioChange_scenarioId_sequence_key" ON "public"."ScenarioChange"("scenarioId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_organisationId_appliesTo_key_key" ON "public"."CustomFieldDefinition"("organisationId", "appliesTo", "key");

-- CreateIndex
CREATE INDEX "CustomFieldValue_definitionId_idx" ON "public"."CustomFieldValue"("definitionId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_personId_idx" ON "public"."CustomFieldValue"("personId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_positionId_idx" ON "public"."CustomFieldValue"("positionId");

-- CreateIndex
CREATE INDEX "Connector_organisationId_provider_idx" ON "public"."Connector"("organisationId", "provider");

-- CreateIndex
CREATE INDEX "ExternalIdentity_personId_idx" ON "public"."ExternalIdentity"("personId");

-- CreateIndex
CREATE INDEX "ExternalIdentity_positionId_idx" ON "public"."ExternalIdentity"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalIdentity_organisationId_provider_entityType_externa_key" ON "public"."ExternalIdentity"("organisationId", "provider", "entityType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldMapping_connectorId_entityType_sourceField_key" ON "public"."FieldMapping"("connectorId", "entityType", "sourceField");

-- CreateIndex
CREATE INDEX "SyncJob_organisationId_createdAt_idx" ON "public"."SyncJob"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncJob_connectorId_createdAt_idx" ON "public"."SyncJob"("connectorId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncJob_correlationId_idx" ON "public"."SyncJob"("correlationId");

-- CreateIndex
CREATE INDEX "SyncRecord_syncJobId_action_idx" ON "public"."SyncRecord"("syncJobId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "FieldProvenance_organisationId_entityType_entityId_fieldNam_key" ON "public"."FieldProvenance"("organisationId", "entityType", "entityId", "fieldName");

-- CreateIndex
CREATE INDEX "ImportJob_organisationId_createdAt_idx" ON "public"."ImportJob"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_importJobId_status_idx" ON "public"."ImportRow"("importJobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_tokenHash_key" ON "public"."ShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareLink_organisationId_chartId_idx" ON "public"."ShareLink"("organisationId", "chartId");

-- CreateIndex
CREATE INDEX "AuditEvent_organisationId_createdAt_idx" ON "public"."AuditEvent"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "public"."AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "public"."AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_correlationId_idx" ON "public"."AuditEvent"("correlationId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganisationMembership" ADD CONSTRAINT "OrganisationMembership_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Person" ADD CONSTRAINT "Person_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingRelationship" ADD CONSTRAINT "ReportingRelationship_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingRelationship" ADD CONSTRAINT "ReportingRelationship_subordinatePositionId_fkey" FOREIGN KEY ("subordinatePositionId") REFERENCES "public"."Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReportingRelationship" ADD CONSTRAINT "ReportingRelationship_managerPositionId_fkey" FOREIGN KEY ("managerPositionId") REFERENCES "public"."Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_headPositionId_fkey" FOREIGN KEY ("headPositionId") REFERENCES "public"."Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Chart" ADD CONSTRAINT "Chart_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Chart" ADD CONSTRAINT "Chart_rootPositionId_fkey" FOREIGN KEY ("rootPositionId") REFERENCES "public"."Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Chart" ADD CONSTRAINT "Chart_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "public"."Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Chart" ADD CONSTRAINT "Chart_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChartConfiguration" ADD CONSTRAINT "ChartConfiguration_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "public"."Chart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Snapshot" ADD CONSTRAINT "Snapshot_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Snapshot" ADD CONSTRAINT "Snapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scenario" ADD CONSTRAINT "Scenario_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scenario" ADD CONSTRAINT "Scenario_baseSnapshotId_fkey" FOREIGN KEY ("baseSnapshotId") REFERENCES "public"."Snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Scenario" ADD CONSTRAINT "Scenario_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScenarioChange" ADD CONSTRAINT "ScenarioChange_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "public"."Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScenarioChange" ADD CONSTRAINT "ScenarioChange_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "public"."CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Connector" ADD CONSTRAINT "Connector_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FieldMapping" ADD CONSTRAINT "FieldMapping_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "public"."Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SyncJob" ADD CONSTRAINT "SyncJob_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SyncJob" ADD CONSTRAINT "SyncJob_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "public"."Connector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SyncRecord" ADD CONSTRAINT "SyncRecord_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "public"."SyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FieldProvenance" ADD CONSTRAINT "FieldProvenance_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportJob" ADD CONSTRAINT "ImportJob_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImportRow" ADD CONSTRAINT "ImportRow_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "public"."ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShareLink" ADD CONSTRAINT "ShareLink_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShareLink" ADD CONSTRAINT "ShareLink_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "public"."Chart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShareLink" ADD CONSTRAINT "ShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "public"."Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportingRelationship"
  ADD CONSTRAINT reporting_no_self_reporting
  CHECK ("subordinatePositionId" <> "managerPositionId");

ALTER TABLE "Assignment"
  ADD CONSTRAINT assignment_end_after_start
  CHECK ("endDate" IS NULL OR "endDate" > "startDate");

CREATE UNIQUE INDEX IF NOT EXISTS reporting_one_primary_manager
  ON "ReportingRelationship" ("subordinatePositionId")
  WHERE "isPrimary" = true AND "effectiveTo" IS NULL AND "deletedAt" IS NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS person_display_name_trgm
  ON "Person" USING gin ("displayName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS position_title_trgm
  ON "Position" USING gin ("title" gin_trgm_ops);

