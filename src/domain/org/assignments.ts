import { DomainError } from './cycle';
import { type AssignmentSnapshot, isActiveAssignment } from './types';

export function assertAssignmentDates(startDate: Date, endDate: Date | null): void {
  if (endDate && endDate.getTime() <= startDate.getTime()) {
    throw new DomainError('INVALID_ASSIGNMENT_DATES', 'Assignment endDate must be after startDate.');
  }
}

export function assertAllocation(percentage: number): void {
  if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
    throw new DomainError(
      'INVALID_ALLOCATION',
      'Allocation percentage must be an integer between 1 and 100.',
    );
  }
}

export function assertPrimaryAssignmentUniqueness(
  personId: string,
  assignments: readonly AssignmentSnapshot[],
  incoming: AssignmentSnapshot,
  at: Date = new Date(),
): void {
  if (!incoming.isPrimary) return;

  const conflict = assignments.find(
    (existing) =>
      existing.id !== incoming.id &&
      existing.personId === personId &&
      existing.isPrimary &&
      isActiveAssignment(existing, at) &&
      isActiveAssignment(incoming, at),
  );

  if (conflict) {
    throw new DomainError(
      'PRIMARY_ASSIGNMENT_CONFLICT',
      'A person may have only one primary assignment at a time.',
    );
  }
}

export function assertAllocationCap(
  personId: string,
  assignments: readonly AssignmentSnapshot[],
  incoming: AssignmentSnapshot,
  at: Date = new Date(),
): void {
  const total = assignments
    .filter(
      (existing) =>
        existing.personId === personId &&
        existing.id !== incoming.id &&
        isActiveAssignment(existing, at),
    )
    .reduce((sum, existing) => sum + existing.allocationPercentage, 0);

  if (isActiveAssignment(incoming, at) && total + incoming.allocationPercentage > 100) {
    throw new DomainError(
      'ALLOCATION_EXCEEDED',
      'Concurrent assignments for one person must total 100% or less.',
    );
  }
}
