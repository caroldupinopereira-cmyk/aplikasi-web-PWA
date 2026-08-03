export const AUDIT_RETENTION_MONTHS = 12;
export const DASHBOARD_ACTIVITY_DAYS = 30;

export function auditRetentionCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - AUDIT_RETENTION_MONTHS);
  return cutoff.toISOString();
}

export function dashboardActivityCutoff(now = new Date()) {
  return new Date(
    now.getTime() - DASHBOARD_ACTIVITY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}
