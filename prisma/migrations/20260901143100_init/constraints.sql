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
