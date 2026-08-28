import type { AppRole, StateName } from './constants';
import type { AcquisitionParcel, AcquisitionProject } from './types';

// Mirrors src/i18n/SessionContext.tsx's `Session` shape, redefined here
// (rather than imported) so this module doesn't create a domain -> i18n
// import cycle — SessionContext already imports AppRole/StateName from here.
export type ScopableSession = {
  role: AppRole;
  stateScope?: StateName;
  districtScope?: string;
};

function isProjectInScope(project: AcquisitionProject, session: ScopableSession): boolean {
  if (session.role === 'national_admin') {
    return true;
  }
  if (session.role === 'landowner') {
    return false;
  }
  // state_authority, district_officer, and field_officer are all scoped to
  // one state; district/field roles narrow further to a district below.
  return !!session.stateScope && project.state === session.stateScope;
}

export function isParcelInScope(
  parcel: AcquisitionParcel,
  project: AcquisitionProject | undefined,
  session: ScopableSession | undefined,
): boolean {
  if (!session || !project || !isProjectInScope(project, session)) {
    return false;
  }
  if (session.role === 'district_officer' || session.role === 'field_officer') {
    return !!session.districtScope && parcel.district === session.districtScope;
  }
  return true;
}

export function scopeProjectsToSession(
  projects: AcquisitionProject[],
  session: ScopableSession | undefined,
): AcquisitionProject[] {
  if (!session) {
    return [];
  }
  return projects.filter((project) => isProjectInScope(project, session));
}

export function scopeParcelsToSession(
  parcels: AcquisitionParcel[],
  projects: AcquisitionProject[],
  session: ScopableSession | undefined,
): AcquisitionParcel[] {
  if (!session) {
    return [];
  }
  const projectById = new Map(projects.map((project) => [project.id, project]));
  return parcels.filter((parcel) => isParcelInScope(parcel, projectById.get(parcel.projectId), session));
}
