export type RelationshipKind =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'DOTTED_LINE'
  | 'FUNCTIONAL'
  | 'PROJECT';

export type PositionKind =
  | 'SINGLE'
  | 'SHARED'
  | 'ASSISTANT'
  | 'DEPARTMENT'
  | 'LOCATION'
  | 'LINKED_CHART';

export type PositionLifecycle = 'ACTIVE' | 'VACANT' | 'PLANNED' | 'FROZEN' | 'CLOSED';

export type PersonLifecycle = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PENDING';

export type EmploymentKind =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERN'
  | 'TEMPORARY'
  | 'VOLUNTEER';

export interface AssignmentSnapshot {
  id: string;
  personId: string;
  positionId: string;
  isPrimary: boolean;
  allocationPercentage: number;
  assignmentType: string;
  startDate: Date;
  endDate: Date | null;
}

export interface PersonSnapshot {
  id: string;
  displayName: string;
  preferredName: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  profilePhotoUrl: string | null;
  status: PersonLifecycle;
  groupIds?: string[];
}

export interface PositionSnapshot {
  id: string;
  title: string;
  code: string | null;
  departmentId: string | null;
  locationId: string | null;
  positionType: PositionKind;
  employmentType: EmploymentKind;
  status: PositionLifecycle;
  sortOrder: number | null;
}

export interface RelationshipSnapshot {
  id: string;
  subordinatePositionId: string;
  managerPositionId: string;
  relationshipType: RelationshipKind;
  isPrimary: boolean;
}

export interface DepartmentSnapshot {
  id: string;
  name: string;
  code: string | null;
  parentDepartmentId: string | null;
  colour: string | null;
}

export interface LocationSnapshot {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
}

export interface ChartFilter {
  departmentIds?: string[];
  locationIds?: string[];
  personStatuses?: PersonLifecycle[];
  positionStatuses?: PositionLifecycle[];
  personId?: string;
  managerPositionId?: string;
  groupIds?: string[];
}

export const PRIMARY_RELATIONSHIP: RelationshipKind = 'PRIMARY';

export function isActiveAssignment(assignment: AssignmentSnapshot, at: Date = new Date()): boolean {
  if (assignment.endDate && assignment.endDate.getTime() <= at.getTime()) {
    return false;
  }
  return assignment.startDate.getTime() <= at.getTime();
}
