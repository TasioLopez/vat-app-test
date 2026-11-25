/**
 * Bijlage 2 consistency helpers from dossier activities (G5 lite).
 */
import type { VGRApplication } from '@/lib/vgr/schema';
import { monthKeyFromDate, newVgrId } from '@/lib/vgr/schema';
import type { VgrActivity, VgrApplicationStatus } from './types';

const APP_STATUS_TO_VGR: Partial<Record<VgrApplicationStatus, string>> = {
  considered: 'open sollicitatie',
  draft: 'open sollicitatie',
  ready: 'open sollicitatie',
  sent: 'open sollicitatie',
  response_received: 'in procedure',
  interview_planned: 'gesprek',
  interview_completed: 'gesprek',
  worktrial_planned: 'meelopen',
  worktrial_completed: 'meelopen',
  hired: 'aangenomen',
  rejected: 'afgewezen',
  withdrawn: 'ingetrokken',
};

/**
 * Propose VGR application rows from dossier application activities.
 * Never invents sent/interview without matching application_status.
 * Does not auto-apply (D01) — caller presents as suggestions.
 */
export function proposeApplicationsFromActivities(activities: VgrActivity[]): VGRApplication[] {
  return activities
    .filter((a) => a.activity_type === 'application' || a.application_status !== 'none')
    .filter(
      (a) =>
        a.application_status !== 'draft' &&
        a.application_status !== 'considered' &&
        a.application_status !== 'ready' &&
        a.application_status !== 'none',
    )
    .map((a) => {
      const date = a.activity_date || '';
      return {
        id: newVgrId('app'),
        date,
        month_key: monthKeyFromDate(date) || (date ? date.slice(0, 7) : ''),
        type: 'sollicitatie',
        functie: a.position_or_purpose || '',
        organisatie: a.organization || '',
        status: APP_STATUS_TO_VGR[a.application_status] || 'open sollicitatie',
        note: a.result || '',
      };
    })
    .filter((row) => row.organisatie || row.functie);
}

/** True when activity claims verzonden/meegelopen without adequate status. */
export function activityOverstatesExecution(a: VgrActivity): boolean {
  if (a.activity_status === 'planned' || a.activity_status === 'not_started') {
    return (
      a.application_status === 'sent' ||
      a.application_status === 'interview_completed' ||
      a.application_status === 'worktrial_completed'
    );
  }
  if (a.activity_type === 'letter_work' && a.application_status === 'sent' && a.activity_status !== 'completed') {
    return true;
  }
  return false;
}
