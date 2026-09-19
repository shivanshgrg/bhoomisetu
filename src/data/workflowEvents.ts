// Presentation-only citizen updates. The audit ledger and repository history
// remain authoritative; this small local feed merely makes successful demo
// actions visible across the two portals.
export type WorkflowEventKind = 'document_submitted' | 'document_verified' | 'document_rejected' | 'objection_filed' | 'objection_resolved' | 'stage_advanced' | 'notice_generated' | 'sms_previewed';
export type WorkflowEvent = { id: string; parcelId: string; kind: WorkflowEventKind; message: string; createdAt: string };
const KEY = 'bhoomisetu-workflow-events';
const read = (): WorkflowEvent[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as WorkflowEvent[]; } catch { return []; } };
export function listWorkflowEvents(parcelId: string) { return read().filter(event => event.parcelId === parcelId); }
export function recordWorkflowEvent(event: Omit<WorkflowEvent, 'id' | 'createdAt'>) {
  const next = [{ ...event, id: `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString() }, ...read()].slice(0, 100);
  localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event('bhoomisetu-workflow-event'));
}
export function subscribeWorkflowEvents(listener: () => void) { window.addEventListener('bhoomisetu-workflow-event', listener); return () => window.removeEventListener('bhoomisetu-workflow-event', listener); }
export function clearWorkflowEvents() { localStorage.removeItem(KEY); window.dispatchEvent(new Event('bhoomisetu-workflow-event')); }
