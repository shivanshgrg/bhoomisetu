import { PROJECT_STATUS_LABELS, type DashboardStatus, type ProjectStatus } from '../domain';

export function getBadgeTone(status: DashboardStatus) {
  if (status === 'stuck') {
    return 'warning';
  }

  if (status === 'blocked') {
    return 'danger';
  }

  if (status === 'complete') {
    return 'success';
  }

  return 'info';
}

export function getStatusLabel(status: DashboardStatus) {
  switch (status) {
    case 'stuck':
      return 'Stuck';
    case 'blocked':
      return 'Blocked';
    case 'complete':
      return 'Complete';
    case 'ready_to_advance':
      return 'Ready to advance';
    default:
      return 'On track';
  }
}

export function getStatusIcon(status: DashboardStatus) {
  switch (status) {
    case 'stuck':
      return '⚠️';
    case 'blocked':
      return '⛔';
    case 'complete':
      return '✅';
    case 'ready_to_advance':
      return '➡️';
    default:
      return '🟢';
  }
}

export function getProjectStatusTone(status: ProjectStatus) {
  if (status === 'at_risk') {
    return 'warning';
  }

  if (status === 'delayed') {
    return 'danger';
  }

  if (status === 'complete') {
    return 'success';
  }

  return 'info';
}

export function getProjectStatusLabel(status: ProjectStatus) {
  return PROJECT_STATUS_LABELS[status];
}

export function getProjectStatusIcon(status: ProjectStatus) {
  switch (status) {
    case 'at_risk':
      return '⚠️';
    case 'delayed':
      return '⛔';
    case 'complete':
      return '✅';
    default:
      return '🟢';
  }
}
