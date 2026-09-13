// Step 64: time-travel dashboard scrubber.
//
// getParcelCalculatedStatus/getDashboardSummary/getNationalSummary/
// getAttentionParcels/getActionCenterQueue (rules.ts, risk.ts) already accept
// an asOfDate — but that only changes the *days-elapsed* arithmetic against
// the parcel's *current* stage/documents/objections, it does not reconstruct
// what the parcel actually looked like on that past date. This module is the
// missing piece: it replays parcel.history (which already carries
// enteredOn/exitedOn per stage) plus filters documents/objections by their
// own date fields, producing a parcel snapshot as of an arbitrary date.
// Everything downstream — the map, the counts, the risk queue, the Action
// Center — is reused completely unmodified once fed a snapshot instead of
// live data (paired with that same asOfDate). Pure and deterministic, like
// rules.ts/risk.ts/lapse.ts.
//
// Known simplification (disclosed, not hidden): ParcelObjection and
// ParcelDocument each carry only a single updatedOn/reviewedOn timestamp, not
// a full status-change history. So an objection/document counts in the
// snapshot if it existed by asOfDate (by submittedOn/uploadedOn), but is
// shown with its *current* status rather than its true status on that date.
import { parseISODate } from './rules';
import type { AcquisitionParcel, ISODateString, StageHistoryEntry } from './types';

function findStageHistoryEntryAsOf(
  history: StageHistoryEntry[],
  asOfDateMs: number,
): StageHistoryEntry | undefined {
  return history.find((entry) => {
    if (parseISODate(entry.enteredOn) > asOfDateMs) {
      return false;
    }
    return !entry.exitedOn || parseISODate(entry.exitedOn) > asOfDateMs;
  });
}

export function getParcelStateAsOf(
  parcel: AcquisitionParcel,
  asOfDate: ISODateString,
): AcquisitionParcel | undefined {
  const asOfDateMs = parseISODate(asOfDate);
  const historyEntry = findStageHistoryEntryAsOf(parcel.history, asOfDateMs);

  if (!historyEntry) {
    // asOfDate predates the parcel's first history entry — it didn't exist
    // yet in the workflow at this point in time.
    return undefined;
  }

  return {
    ...parcel,
    currentStage: historyEntry.stage,
    stageEnteredOn: historyEntry.enteredOn,
    documents: parcel.documents.filter((document) => parseISODate(document.uploadedOn) <= asOfDateMs),
    objections: parcel.objections.filter((objection) => parseISODate(objection.submittedOn) <= asOfDateMs),
  };
}

export function getParcelsStateAsOf(
  parcels: AcquisitionParcel[],
  asOfDate: ISODateString,
): AcquisitionParcel[] {
  return parcels
    .map((parcel) => getParcelStateAsOf(parcel, asOfDate))
    .filter((parcel): parcel is AcquisitionParcel => parcel !== undefined);
}
