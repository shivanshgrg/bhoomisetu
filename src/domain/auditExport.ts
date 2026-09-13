import { GENESIS_HASH, buildAuditChain } from './auditChain';
import { DEMO_REFERENCE_DATE } from './constants';
import type { AcquisitionParcel, AcquisitionProject, ISODateString } from './types';

// The export bundle's own JSON shape — deliberately flat and self-describing
// so a third party (an RTI applicant, a CAG auditor) can read it without any
// of this app's TypeScript types, and so verify.html (a standalone page with
// no build step) can recompute the same hashes from nothing but this file.
export type AuditExportBundle = {
  exportVersion: 1;
  exportedOn: ISODateString;
  parcel: {
    id: string;
    surveyNumber: string;
    owner: AcquisitionParcel['owner'];
    village: string;
    tehsil: string;
    district: string;
    areaHectares: number;
    currentStage: string;
    stageEnteredOn: ISODateString;
    compensationEstimate: number;
    compensationPaid: number;
    coordinates: AcquisitionParcel['coordinates'];
  };
  project: {
    id: string;
    name: string;
    sector: string;
    state: string;
    implementingAgency: string;
    sanctionedOn: ISODateString;
    targetCompletionOn: ISODateString;
  };
  stageHistory: AcquisitionParcel['history'];
  documents: {
    id: string;
    stage: string;
    kind: string;
    title: string;
    uploadedOn: ISODateString;
    uploadedByRole: string;
    status: string;
    rejectionReason?: string;
  }[];
  objections: AcquisitionParcel['objections'];
  auditChain: {
    genesisHash: string;
    algorithm: string;
    canonicalFormat: string;
    links: { entryId: string; hash: string; previousHash: string }[];
  };
  verification: {
    note: string;
    howTo: string;
  };
};

export async function buildAuditExportBundle(
  parcel: AcquisitionParcel,
  project: AcquisitionProject,
  asOfDate: ISODateString = DEMO_REFERENCE_DATE,
): Promise<AuditExportBundle> {
  const sortedHistory = [...parcel.history].sort((first, second) => first.enteredOn.localeCompare(second.enteredOn));
  const links = await buildAuditChain(sortedHistory);

  return {
    exportVersion: 1,
    exportedOn: asOfDate,
    parcel: {
      id: parcel.id,
      surveyNumber: parcel.surveyNumber,
      owner: parcel.owner,
      village: parcel.village,
      tehsil: parcel.tehsil,
      district: parcel.district,
      areaHectares: parcel.areaHectares,
      currentStage: parcel.currentStage,
      stageEnteredOn: parcel.stageEnteredOn,
      compensationEstimate: parcel.compensationEstimate,
      compensationPaid: parcel.compensationPaid,
      coordinates: parcel.coordinates,
    },
    project: {
      id: project.id,
      name: project.name,
      sector: project.sector,
      state: project.state,
      implementingAgency: project.implementingAgency,
      sanctionedOn: project.sanctionedOn,
      targetCompletionOn: project.targetCompletionOn,
    },
    stageHistory: sortedHistory,
    documents: parcel.documents.map((document) => ({
      id: document.id,
      stage: document.stage,
      kind: document.kind,
      title: document.title,
      uploadedOn: document.uploadedOn,
      uploadedByRole: document.uploadedByRole,
      status: document.status,
      rejectionReason: document.rejectionReason,
    })),
    objections: parcel.objections,
    auditChain: {
      genesisHash: GENESIS_HASH,
      algorithm: 'SHA-256, chained: hash[i] = sha256(hash[i-1] + "|" + canonical(entry[i]))',
      canonicalFormat: 'id|parcelId|stage|enteredOn|exitedOn|handledByRole|note',
      links: links.map((link) => ({ entryId: link.entry.id, hash: link.hash, previousHash: link.previousHash })),
    },
    verification: {
      note:
        'This bundle is self-contained. Anyone can independently verify the hash chain without BhoomiSetu using the standalone verifier at /verify.html — upload this exact JSON file there.',
      howTo:
        'Open /verify.html (works offline, no server call), choose this JSON file, and it will recompute every hash from stageHistory and compare it against auditChain.links. Any mismatch means the record was altered after sealing.',
    },
  };
}

export function auditExportFilename(parcel: AcquisitionParcel): string {
  const safeSurvey = parcel.surveyNumber.replace(/[^a-zA-Z0-9]+/g, '-');
  return `bhoomisetu-audit-${safeSurvey}-${parcel.id}.json`;
}
