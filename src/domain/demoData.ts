import {
  ACQUISITION_STAGES,
  DEMO_REFERENCE_DATE,
  DOCUMENT_KIND_LABELS,
  STAGE_HANDLER_ROLE,
  type DocumentKind,
  type DocumentStatus,
  type OfficialRole,
  type StageDefinition,
  type StageId,
  type StateName,
} from './constants';
import {
  addDays,
  getDashboardSummary,
  getParcelCalculatedStatus,
  getStageDefinition,
} from './rules';
import type {
  AcquisitionParcel,
  AcquisitionProject,
  GeoPoint,
  ISODateString,
  ParcelDocument,
  ParcelObjection,
  ParcelOwner,
  StageHistoryEntry,
} from './types';

export const HERO_SURVEY_NUMBER = '124/7' as const;

type ObjectionSeed = Pick<ParcelObjection, 'reason' | 'description' | 'status'> & {
  submittedOn: ISODateString;
  submittedBy?: string;
  updatedOn?: ISODateString;
  assignedToRole?: OfficialRole;
};

type ParcelSeed = {
  surveyNumber: string;
  owner: ParcelOwner;
  village: string;
  tehsil: string;
  district: string;
  areaHectares: number;
  currentStage: StageId;
  stageEnteredOn: ISODateString;
  compensationEstimate: number;
  coordinates: GeoPoint;
  withheldDocumentKinds?: readonly DocumentKind[];
  // Step 48: a required document that IS present in the current stage but
  // is not yet resolved — pending review, or rejected and awaiting
  // re-upload. Distinct from withheldDocumentKinds (never uploaded at all).
  // Hero seeds omit this, so they keep their original all-verified behavior.
  currentStageDocumentOutcomes?: Readonly<Partial<Record<DocumentKind, Exclude<DocumentStatus, 'verified'>>>>;
  objectionSeeds?: readonly ObjectionSeed[];
  // Defaults to MAHARASHTRA_PROJECT_ID when omitted — used by the
  // hand-specified hero seeds below.
  projectId?: string;
};

type Language = ParcelOwner['preferredLanguage'];

const roleByStage = STAGE_HANDLER_ROLE;

const stageNotes: Record<StageId, string> = {
  notification: 'Initial acquisition notification recorded for public notice.',
  survey: 'Joint survey and ownership verification completed with field team.',
  objection_review: 'Objection window and hearing record reviewed by the acquisition office.',
  valuation: 'Market valuation and asset assessment opened for compensation planning.',
  compensation_approval: 'Compensation calculation moved for administrative approval.',
  award: 'Award order preparation started after approval review.',
  possession: 'Possession handover and final record update initiated.',
};

// Step 47: hero parcels stay hand-specified because the demo script and the
// printed handbook quote their exact figures (124/7's 57-days-stuck valuation
// blockage; 91/6's under-review valuation objection). Every other parcel is
// expanded from DISTRICT_PROFILES by the deterministic generator below, so
// Step 48 can grow the dataset to ~250 parcels by adding profiles/counts
// instead of hand-typing more ParcelSeed literals.
export const MAHARASHTRA_PROJECT_ID = 'project-maharashtra-corridor' as const;
export const GUJARAT_PROJECT_ID = 'project-gujarat-freight-corridor' as const;
export const MADHYA_PRADESH_PROJECT_ID = 'project-mp-narmada-irrigation' as const;
export const TELANGANA_PROJECT_ID = 'project-telangana-power-grid' as const;
export const ODISHA_PROJECT_ID = 'project-odisha-paradip-port' as const;
// Step 48: seven more projects — the remaining three PROJECT_SECTORS
// (industrial corridor, urban infrastructure, mining) and the five
// remaining STATE_NAMES, plus a second project each in Maharashtra and
// Odisha so a few states carry more than one acquisition effort.
export const UTTAR_PRADESH_PROJECT_ID = 'project-up-industrial-corridor' as const;
export const RAJASTHAN_PROJECT_ID = 'project-rajasthan-lignite-mining' as const;
export const KARNATAKA_PROJECT_ID = 'project-karnataka-metro-corridor' as const;
export const TAMIL_NADU_PROJECT_ID = 'project-tn-chennai-salem-expressway' as const;
export const WEST_BENGAL_PROJECT_ID = 'project-wb-dock-rail-link' as const;
export const MAHARASHTRA_URBAN_PROJECT_ID = 'project-maharashtra-trans-harbour' as const;
export const ODISHA_MINING_PROJECT_ID = 'project-odisha-talcher-coalfield' as const;

const heroSeeds: readonly ParcelSeed[] = [
  {
    surveyNumber: HERO_SURVEY_NUMBER,
    owner: { name: 'Kavita Patil', phone: '9876501001', preferredLanguage: 'hi' },
    village: 'Dhanori',
    tehsil: 'Haveli',
    district: 'Pune',
    areaHectares: 1.42,
    currentStage: 'valuation',
    stageEnteredOn: '2026-07-01',
    compensationEstimate: 3680000,
    coordinates: { lat: 18.5962, lng: 73.9014 },
    withheldDocumentKinds: ['valuation_report'],
    objectionSeeds: [
      {
        submittedOn: '2026-06-15',
        reason: 'measurement',
        description: 'Boundary measurement was corrected after the joint survey hearing.',
        status: 'resolved',
        updatedOn: '2026-06-25',
      },
    ],
  },
  {
    surveyNumber: '91/6',
    owner: { name: 'Asha Gaikwad', phone: '9876501012', preferredLanguage: 'hi' },
    village: 'Chandur',
    tehsil: 'Chandur Railway',
    district: 'Amravati',
    areaHectares: 2.02,
    currentStage: 'objection_review',
    stageEnteredOn: '2026-07-18',
    compensationEstimate: 3550000,
    coordinates: { lat: 20.8135, lng: 77.9805 },
    objectionSeeds: [
      {
        submittedOn: '2026-07-24',
        reason: 'valuation',
        description: 'Applicant requested market-rate evidence review before valuation begins.',
        status: 'under_review',
        updatedOn: '2026-08-08',
      },
    ],
  },
];

// ── Deterministic seed generator ───────────────────────────────────────────
// xorshift32, seeded from the district name so adding a new DISTRICT_PROFILES
// entry never reshuffles any other district's output. Math.random() is never
// used here: a rehearsed pitch needs the same numbers on every reload.
function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

function createRng(seedText: string): () => number {
  let state = hashSeed(seedText);
  return function next() {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function pick<T>(rng: () => number, options: readonly T[]): T {
  return options[Math.floor(rng() * options.length)];
}

function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function roundTo(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

type NamePoolId =
  | 'maharashtrian'
  | 'gujarati'
  | 'hindi_belt'
  | 'telugu'
  | 'odia'
  | 'rajasthani'
  | 'kannada'
  | 'tamil'
  | 'bengali';

const NAME_POOLS: Record<NamePoolId, { firstNames: readonly string[]; lastNames: readonly string[] }> = {
  maharashtrian: {
    firstNames: [
      'Kavita', 'Ramesh', 'Meera', 'Sunita', 'Prakash', 'Farida', 'Bhaskar', 'Nisha', 'Arun', 'Lata',
      'Girish', 'Asha', 'Devendra', 'Rehana', 'Mahesh', 'Pooja', 'Sanjay', 'Vandana', 'Omkar', 'Chitra',
      'Suresh', 'Irfan', 'Neelam', 'Tara', 'Harish', 'Vaishali', 'Anil', 'Manisha', 'Vitthal', 'Rupali',
    ],
    lastNames: [
      'Patil', 'Shinde', 'Kulkarni', 'Deshmukh', 'More', 'Shaikh', 'Pawar', 'Jadhav', 'Kale', 'Bhosale',
      'Wagh', 'Gaikwad', 'Mali', 'Khan', 'Chavan', 'Nikam', 'Rathod', 'Korde', 'Londhe', 'Tambe',
      'Bagal', 'Ansari', 'Salunkhe', 'Ingle', 'Joshi', 'Thorat', 'Gawde', 'Sawant',
    ],
  },
  gujarati: {
    firstNames: ['Bhavesh', 'Rekha', 'Ketan', 'Falguni', 'Manoj', 'Hiral', 'Jignesh', 'Kiran', 'Nirav', 'Sonal'],
    lastNames: ['Patel', 'Trivedi', 'Vyas', 'Desai', 'Barot', 'Shah', 'Modi', 'Rana', 'Joshi', 'Chauhan'],
  },
  hindi_belt: {
    firstNames: ['Suresh', 'Anita', 'Deepak', 'Pushpa', 'Rajesh', 'Kavita', 'Vinod', 'Sarita', 'Manoj', 'Kiran'],
    lastNames: ['Chourasia', 'Sharma', 'Rajput', 'Yadav', 'Verma', 'Tiwari', 'Dubey', 'Chouhan', 'Malviya', 'Rawat'],
  },
  telugu: {
    // Telugu owners are already seeded as full initials-plus-surname names,
    // so this pool has no separate last-name half to append.
    firstNames: ['K. Srinivas Rao', 'M. Padma', 'B. Ramesh', 'G. Lakshmi', 'P. Ravi Kumar', 'S. Anitha', 'V. Suresh', 'N. Vijaya'],
    lastNames: [],
  },
  odia: {
    firstNames: ['Debasish', 'Sanjukta', 'Ashok', 'Priyanka', 'Bijay', 'Manorama', 'Rabindra', 'Sabita'],
    lastNames: ['Nayak', 'Behera', 'Mallick', 'Das', 'Mohanty', 'Sahoo', 'Rout', 'Patra'],
  },
  rajasthani: {
    firstNames: ['Mahendra', 'Kamla', 'Bhanwar', 'Sohan Kanwar', 'Ratan', 'Indira', 'Gopal', 'Kesar'],
    lastNames: ['Rathore', 'Chouhan', 'Bishnoi', 'Meena', 'Godara', 'Beniwal', 'Sisodia', 'Charan'],
  },
  kannada: {
    // Written as full initials-plus-name strings, matching the Telugu pool's
    // convention, so lastNames stays empty here too.
    firstNames: ['B. Manjunath', 'K. Lakshmi', 'H. Nagaraj', 'S. Savitri', 'G. Ravindra', 'N. Vijayalakshmi', 'C. Basavaraj', 'M. Bhagya'],
    lastNames: [],
  },
  tamil: {
    firstNames: ['M. Karthikeyan', 'S. Meenakshi', 'R. Muthu', 'P. Kamala', 'V. Elango', 'K. Selvi', 'T. Murugan', 'A. Valli'],
    lastNames: [],
  },
  bengali: {
    firstNames: ['Debashish', 'Ananya', 'Subrata', 'Mousumi', 'Partha', 'Rina', 'Amit', 'Sikha'],
    lastNames: ['Banerjee', 'Chatterjee', 'Mukherjee', 'Das', 'Ghosh', 'Sarkar', 'Bose', 'Roy'],
  },
};

function makeOwnerName(rng: () => number, namePool: NamePoolId): string {
  const pool = NAME_POOLS[namePool];
  const firstName = pick(rng, pool.firstNames);
  return pool.lastNames.length === 0 ? firstName : `${firstName} ${pick(rng, pool.lastNames)}`;
}

const OBJECTION_REASON_POOL = ['ownership', 'measurement', 'valuation', 'compensation', 'other'] as const;
const OBJECTION_STATUS_POOL = ['pending', 'under_review', 'resolved'] as const;

const OBJECTION_DESCRIPTIONS: Record<(typeof OBJECTION_REASON_POOL)[number], string> = {
  ownership: 'Co-owner name needs verification before the hearing minutes can close.',
  measurement: 'Boundary measurement is being re-checked against the joint survey sketch.',
  valuation: 'Applicant requested market-rate evidence review before valuation is finalised.',
  compensation: 'Landowner requested clarification of the compensation calculation components.',
  other: 'Access path clarification is being addressed during the local hearing.',
};

type DistrictPlace = { village: string; tehsil: string };

// Step 48: how far along its 7 stages a project's parcels tend to sit,
// independent of how long they've been there — this is what lets a project
// read as genuinely on_track / at_risk / delayed (see
// getProjectCalculatedStatus in rules.ts) instead of every project landing
// on the same status by coincidence of a uniform stage pick.
type StageBias = 'balanced' | 'behind' | 'severely_behind';

// One weight per ACQUISITION_STAGES entry, in order (notification first,
// possession last). Higher weight = more likely a parcel sits at that stage.
const STAGE_BIAS_WEIGHTS: Record<StageBias, readonly number[]> = {
  balanced: [1, 1, 1, 1, 1, 1, 1],
  behind: [3, 3, 2, 1, 1, 1, 1],
  severely_behind: [4, 3, 2, 1, 1, 0.5, 0.5],
};

function pickWeightedStage(rng: () => number, bias: StageBias): StageId {
  const weights = STAGE_BIAS_WEIGHTS[bias];
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * totalWeight;
  for (let index = 0; index < ACQUISITION_STAGES.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return ACQUISITION_STAGES[index].id;
    }
  }
  return ACQUISITION_STAGES[ACQUISITION_STAGES.length - 1].id;
}

type DistrictProfile = {
  district: string;
  state: StateName;
  projectId: string;
  namePool: NamePoolId;
  languagePool: readonly Language[];
  places: readonly DistrictPlace[];
  centroid: GeoPoint;
  // ₹ per hectare band the generator samples from to derive compensationEstimate.
  landRateBandPerHectare: readonly [number, number];
  // Fixed, spaced-out block so a later district addition can't renumber
  // this one's survey numbers.
  surveyRangeStart: number;
  parcelCount: number;
  // Defaults to 'balanced' when omitted.
  stageBias?: StageBias;
};

// Step 48 grows the dataset to ~250 parcels across 12 projects, 10 states,
// and 40 districts by adding more entries/districts here (and raising
// parcelCount) — the generator itself doesn't need to change. Every district
// profile for a given project shares that project's stageBias, since project
// status (rules.ts's getProjectCalculatedStatus) is computed across all of a
// project's parcels together.
const DISTRICT_PROFILES: readonly DistrictProfile[] = [
  {
    district: 'Pune',
    state: 'maharashtra',
    projectId: MAHARASHTRA_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [
      { village: 'Kondhwa', tehsil: 'Haveli' },
      { village: 'Baramati', tehsil: 'Baramati' },
      { village: 'Indapur', tehsil: 'Indapur' },
      { village: 'Bhor', tehsil: 'Bhor' },
      { village: 'Daund', tehsil: 'Daund' },
    ],
    centroid: { lat: 18.27, lng: 74.38 },
    landRateBandPerHectare: [1800000, 2200000],
    surveyRangeStart: 300,
    parcelCount: 12,
  },
  {
    district: 'Nagpur',
    state: 'maharashtra',
    projectId: MAHARASHTRA_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [
      { village: 'Katol', tehsil: 'Katol' },
      { village: 'Umred', tehsil: 'Umred' },
      { village: 'Saoner', tehsil: 'Saoner' },
    ],
    centroid: { lat: 21.17, lng: 78.94 },
    landRateBandPerHectare: [1750000, 1950000],
    surveyRangeStart: 320,
    parcelCount: 7,
  },
  {
    district: 'Nashik',
    state: 'maharashtra',
    projectId: MAHARASHTRA_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [
      { village: 'Sinnar', tehsil: 'Sinnar' },
      { village: 'Malegaon', tehsil: 'Malegaon' },
      { village: 'Nandgaon', tehsil: 'Nandgaon' },
      { village: 'Yeola', tehsil: 'Yeola' },
    ],
    centroid: { lat: 20.19, lng: 74.42 },
    landRateBandPerHectare: [1650000, 2200000],
    surveyRangeStart: 340,
    parcelCount: 8,
  },
  {
    district: 'Ahmednagar',
    state: 'maharashtra',
    projectId: MAHARASHTRA_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [
      { village: 'Karjat', tehsil: 'Karjat' },
      { village: 'Akole', tehsil: 'Akole' },
    ],
    centroid: { lat: 19.05, lng: 74.51 },
    landRateBandPerHectare: [1700000, 1850000],
    surveyRangeStart: 360,
    parcelCount: 4,
  },
  {
    district: 'Satara',
    state: 'maharashtra',
    projectId: MAHARASHTRA_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [
      { village: 'Koregaon', tehsil: 'Koregaon' },
      { village: 'Phaltan', tehsil: 'Phaltan' },
    ],
    centroid: { lat: 17.84, lng: 74.3 },
    landRateBandPerHectare: [1900000, 2050000],
    surveyRangeStart: 380,
    parcelCount: 4,
  },
  {
    district: 'Solapur',
    state: 'maharashtra',
    projectId: MAHARASHTRA_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [
      { village: 'Akluj', tehsil: 'Malshiras' },
      { village: 'Karmala', tehsil: 'Karmala' },
      { village: 'Pandharpur', tehsil: 'Pandharpur' },
    ],
    centroid: { lat: 17.99, lng: 75.18 },
    landRateBandPerHectare: [1750000, 1950000],
    surveyRangeStart: 400,
    parcelCount: 6,
  },
  {
    district: 'Wardha',
    state: 'maharashtra',
    projectId: MAHARASHTRA_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [
      { village: 'Pulgaon', tehsil: 'Deoli' },
      { village: 'Wardha', tehsil: 'Wardha' },
    ],
    centroid: { lat: 20.73, lng: 78.46 },
    landRateBandPerHectare: [1550000, 1950000],
    surveyRangeStart: 420,
    parcelCount: 4,
  },
  {
    district: 'Amravati',
    state: 'maharashtra',
    projectId: MAHARASHTRA_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [{ village: 'Morshi', tehsil: 'Morshi' }],
    centroid: { lat: 21.34, lng: 78.01 },
    landRateBandPerHectare: [1650000, 1800000],
    surveyRangeStart: 440,
    parcelCount: 4,
  },
  {
    district: 'Akola',
    state: 'maharashtra',
    projectId: MAHARASHTRA_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [{ village: 'Murtijapur', tehsil: 'Murtijapur' }],
    centroid: { lat: 20.73, lng: 77.37 },
    landRateBandPerHectare: [1700000, 1850000],
    surveyRangeStart: 460,
    parcelCount: 3,
  },
  {
    district: 'Ahmedabad',
    state: 'gujarat',
    projectId: GUJARAT_PROJECT_ID,
    namePool: 'gujarati',
    languagePool: ['gu', 'gu', 'gu', 'en', 'hi'],
    places: [
      { village: 'Sanand', tehsil: 'Sanand' },
      { village: 'Dholka', tehsil: 'Dholka' },
    ],
    centroid: { lat: 22.86, lng: 72.41 },
    landRateBandPerHectare: [1900000, 2200000],
    surveyRangeStart: 480,
    parcelCount: 6,
  },
  {
    district: 'Vadodara',
    state: 'gujarat',
    projectId: GUJARAT_PROJECT_ID,
    namePool: 'gujarati',
    languagePool: ['gu', 'gu', 'gu', 'en', 'hi'],
    places: [{ village: 'Padra', tehsil: 'Padra' }],
    centroid: { lat: 22.23, lng: 73.09 },
    landRateBandPerHectare: [2050000, 2200000],
    surveyRangeStart: 500,
    parcelCount: 4,
  },
  {
    district: 'Bharuch',
    state: 'gujarat',
    projectId: GUJARAT_PROJECT_ID,
    namePool: 'gujarati',
    languagePool: ['gu', 'gu', 'gu', 'en', 'hi'],
    places: [{ village: 'Ankleshwar', tehsil: 'Ankleshwar' }],
    centroid: { lat: 21.63, lng: 73.0 },
    landRateBandPerHectare: [1950000, 2100000],
    surveyRangeStart: 520,
    parcelCount: 4,
  },
  {
    district: 'Mehsana',
    state: 'gujarat',
    projectId: GUJARAT_PROJECT_ID,
    namePool: 'gujarati',
    languagePool: ['gu', 'gu', 'gu', 'en', 'hi'],
    places: [{ village: 'Kadi', tehsil: 'Kadi' }],
    centroid: { lat: 23.3, lng: 72.34 },
    landRateBandPerHectare: [1850000, 2000000],
    surveyRangeStart: 540,
    parcelCount: 3,
  },
  {
    // Step 48: biased 'severely_behind' plus a target date pulled in from
    // the original 2027-06-30 (see demoProjects) to make this project read
    // as genuinely at_risk rather than on_track by coincidence.
    district: 'Sehore',
    state: 'madhya_pradesh',
    projectId: MADHYA_PRADESH_PROJECT_ID,
    namePool: 'hindi_belt',
    languagePool: ['hi'],
    places: [{ village: 'Sehore', tehsil: 'Sehore' }],
    centroid: { lat: 23.2, lng: 77.08 },
    landRateBandPerHectare: [1300000, 1450000],
    surveyRangeStart: 560,
    parcelCount: 5,
    stageBias: 'severely_behind',
  },
  {
    district: 'Narmadapuram',
    state: 'madhya_pradesh',
    projectId: MADHYA_PRADESH_PROJECT_ID,
    namePool: 'hindi_belt',
    languagePool: ['hi'],
    places: [
      { village: 'Hoshangabad', tehsil: 'Hoshangabad' },
      { village: 'Itarsi', tehsil: 'Itarsi' },
    ],
    centroid: { lat: 22.68, lng: 77.74 },
    landRateBandPerHectare: [1450000, 1600000],
    surveyRangeStart: 580,
    parcelCount: 6,
    stageBias: 'severely_behind',
  },
  {
    district: 'Raisen',
    state: 'madhya_pradesh',
    projectId: MADHYA_PRADESH_PROJECT_ID,
    namePool: 'hindi_belt',
    languagePool: ['hi'],
    places: [{ village: 'Bareli', tehsil: 'Bareli' }],
    centroid: { lat: 23.04, lng: 78.32 },
    landRateBandPerHectare: [1550000, 1700000],
    surveyRangeStart: 600,
    parcelCount: 5,
    stageBias: 'severely_behind',
  },
  {
    // Step 48: sanctioned back in mid-2024 with a target that has nearly
    // arrived (see demoProjects) — combined with a 'behind' stage bias, this
    // project reads as genuinely delayed, not just labeled that way.
    district: 'Nalgonda',
    state: 'telangana',
    projectId: TELANGANA_PROJECT_ID,
    namePool: 'telugu',
    languagePool: ['te', 'te', 'te', 'en'],
    places: [{ village: 'Chityal', tehsil: 'Chityal' }],
    centroid: { lat: 17.25, lng: 79.15 },
    landRateBandPerHectare: [1600000, 1750000],
    surveyRangeStart: 620,
    parcelCount: 4,
    stageBias: 'behind',
  },
  {
    district: 'Suryapet',
    state: 'telangana',
    projectId: TELANGANA_PROJECT_ID,
    namePool: 'telugu',
    languagePool: ['te', 'te', 'te', 'en'],
    places: [{ village: 'Suryapet', tehsil: 'Suryapet' }],
    centroid: { lat: 17.14, lng: 79.62 },
    landRateBandPerHectare: [1550000, 1700000],
    surveyRangeStart: 640,
    parcelCount: 4,
    stageBias: 'behind',
  },
  {
    district: 'Jangaon',
    state: 'telangana',
    projectId: TELANGANA_PROJECT_ID,
    namePool: 'telugu',
    languagePool: ['te', 'te', 'te', 'en'],
    places: [{ village: 'Jangaon', tehsil: 'Jangaon' }],
    centroid: { lat: 17.72, lng: 79.18 },
    landRateBandPerHectare: [1400000, 1550000],
    surveyRangeStart: 660,
    parcelCount: 3,
    stageBias: 'behind',
  },
  {
    district: 'Karimnagar',
    state: 'telangana',
    projectId: TELANGANA_PROJECT_ID,
    namePool: 'telugu',
    languagePool: ['te', 'te', 'te', 'en'],
    places: [{ village: 'Huzurabad', tehsil: 'Huzurabad' }],
    centroid: { lat: 18.28, lng: 79.47 },
    landRateBandPerHectare: [1600000, 1750000],
    surveyRangeStart: 680,
    parcelCount: 3,
    stageBias: 'behind',
  },
  {
    // Step 48: also pulled back to a mid-2025 sanction date with a nearer
    // target (see demoProjects) plus a 'behind' bias, for the same delayed
    // shape as the Telangana project above.
    district: 'Jagatsinghpur',
    state: 'odisha',
    projectId: ODISHA_PROJECT_ID,
    namePool: 'odia',
    languagePool: ['or', 'or', 'or', 'en'],
    places: [
      { village: 'Kujang', tehsil: 'Kujang' },
      { village: 'Ersama', tehsil: 'Ersama' },
      { village: 'Balikuda', tehsil: 'Balikuda' },
      { village: 'Tirtol', tehsil: 'Tirtol' },
    ],
    centroid: { lat: 20.25, lng: 86.55 },
    landRateBandPerHectare: [1580000, 1720000],
    surveyRangeStart: 700,
    parcelCount: 12,
    stageBias: 'behind',
  },
  {
    district: 'Kendrapara',
    state: 'odisha',
    projectId: ODISHA_PROJECT_ID,
    namePool: 'odia',
    languagePool: ['or', 'or', 'or', 'en'],
    places: [
      { village: 'Rajkanika', tehsil: 'Rajkanika' },
      { village: 'Aul', tehsil: 'Aul' },
    ],
    centroid: { lat: 20.5, lng: 86.42 },
    landRateBandPerHectare: [1500000, 1650000],
    surveyRangeStart: 720,
    parcelCount: 10,
    stageBias: 'behind',
  },
  {
    district: 'Bhadrak',
    state: 'odisha',
    projectId: ODISHA_PROJECT_ID,
    namePool: 'odia',
    languagePool: ['or', 'or', 'or', 'en'],
    places: [
      { village: 'Chandbali', tehsil: 'Chandbali' },
      { village: 'Basudevpur', tehsil: 'Basudevpur' },
    ],
    centroid: { lat: 21.06, lng: 86.7 },
    landRateBandPerHectare: [1450000, 1600000],
    surveyRangeStart: 740,
    parcelCount: 8,
    stageBias: 'behind',
  },
  // Step 48: five new state projects — the remaining PROJECT_SECTORS
  // (industrial corridor, urban infrastructure, mining) and remaining
  // STATE_NAMES (uttar_pradesh, rajasthan, karnataka, tamil_nadu,
  // west_bengal) — plus a second project each for Maharashtra and Odisha.
  {
    district: 'Ghaziabad',
    state: 'uttar_pradesh',
    projectId: UTTAR_PRADESH_PROJECT_ID,
    namePool: 'hindi_belt',
    languagePool: ['hi', 'hi', 'hi', 'en'],
    places: [
      { village: 'Loni', tehsil: 'Loni' },
      { village: 'Modinagar', tehsil: 'Modinagar' },
    ],
    centroid: { lat: 28.67, lng: 77.43 },
    landRateBandPerHectare: [2600000, 3000000],
    surveyRangeStart: 760,
    parcelCount: 10,
  },
  {
    district: 'Bulandshahr',
    state: 'uttar_pradesh',
    projectId: UTTAR_PRADESH_PROJECT_ID,
    namePool: 'hindi_belt',
    languagePool: ['hi', 'hi', 'hi', 'en'],
    places: [
      { village: 'Khurja', tehsil: 'Khurja' },
      { village: 'Sikandrabad', tehsil: 'Sikandrabad' },
    ],
    centroid: { lat: 28.4, lng: 77.85 },
    landRateBandPerHectare: [1900000, 2200000],
    surveyRangeStart: 780,
    parcelCount: 10,
  },
  {
    district: 'Aligarh',
    state: 'uttar_pradesh',
    projectId: UTTAR_PRADESH_PROJECT_ID,
    namePool: 'hindi_belt',
    languagePool: ['hi', 'hi', 'hi', 'en'],
    places: [
      { village: 'Khair', tehsil: 'Khair' },
      { village: 'Atrauli', tehsil: 'Atrauli' },
    ],
    centroid: { lat: 27.88, lng: 78.08 },
    landRateBandPerHectare: [1700000, 2000000],
    surveyRangeStart: 800,
    parcelCount: 10,
  },
  {
    district: 'Hapur',
    state: 'uttar_pradesh',
    projectId: UTTAR_PRADESH_PROJECT_ID,
    namePool: 'hindi_belt',
    languagePool: ['hi', 'hi', 'hi', 'en'],
    places: [{ village: 'Garhmukteshwar', tehsil: 'Garhmukteshwar' }],
    centroid: { lat: 28.73, lng: 77.78 },
    landRateBandPerHectare: [2000000, 2300000],
    surveyRangeStart: 820,
    parcelCount: 9,
  },
  {
    district: 'Meerut',
    state: 'uttar_pradesh',
    projectId: UTTAR_PRADESH_PROJECT_ID,
    namePool: 'hindi_belt',
    languagePool: ['hi', 'hi', 'hi', 'en'],
    places: [
      { village: 'Sardhana', tehsil: 'Sardhana' },
      { village: 'Mawana', tehsil: 'Mawana' },
    ],
    centroid: { lat: 29.0, lng: 77.7 },
    landRateBandPerHectare: [2200000, 2500000],
    surveyRangeStart: 840,
    parcelCount: 9,
  },
  {
    district: 'Barmer',
    state: 'rajasthan',
    projectId: RAJASTHAN_PROJECT_ID,
    namePool: 'rajasthani',
    languagePool: ['hi', 'hi', 'hi', 'en'],
    places: [
      { village: 'Baytu', tehsil: 'Baytu' },
      { village: 'Sheo', tehsil: 'Sheo' },
    ],
    centroid: { lat: 25.75, lng: 71.38 },
    landRateBandPerHectare: [700000, 900000],
    surveyRangeStart: 860,
    parcelCount: 7,
    stageBias: 'behind',
  },
  {
    district: 'Bikaner',
    state: 'rajasthan',
    projectId: RAJASTHAN_PROJECT_ID,
    namePool: 'rajasthani',
    languagePool: ['hi', 'hi', 'hi', 'en'],
    places: [{ village: 'Kolayat', tehsil: 'Kolayat' }],
    centroid: { lat: 28.02, lng: 73.31 },
    landRateBandPerHectare: [650000, 850000],
    surveyRangeStart: 880,
    parcelCount: 5,
    stageBias: 'behind',
  },
  {
    district: 'Bengaluru Rural',
    state: 'karnataka',
    projectId: KARNATAKA_PROJECT_ID,
    namePool: 'kannada',
    languagePool: ['kn', 'kn', 'kn', 'en'],
    places: [
      { village: 'Devanahalli', tehsil: 'Devanahalli' },
      { village: 'Doddaballapura', tehsil: 'Doddaballapura' },
    ],
    centroid: { lat: 13.2, lng: 77.5 },
    landRateBandPerHectare: [3200000, 3800000],
    surveyRangeStart: 900,
    parcelCount: 8,
    stageBias: 'behind',
  },
  {
    district: 'Ramanagara',
    state: 'karnataka',
    projectId: KARNATAKA_PROJECT_ID,
    namePool: 'kannada',
    languagePool: ['kn', 'kn', 'kn', 'en'],
    places: [{ village: 'Channapatna', tehsil: 'Channapatna' }],
    centroid: { lat: 12.72, lng: 77.28 },
    landRateBandPerHectare: [2400000, 2800000],
    surveyRangeStart: 920,
    parcelCount: 6,
    stageBias: 'behind',
  },
  {
    district: 'Kanchipuram',
    state: 'tamil_nadu',
    projectId: TAMIL_NADU_PROJECT_ID,
    namePool: 'tamil',
    languagePool: ['ta', 'ta', 'ta', 'en'],
    places: [
      { village: 'Sriperumbudur', tehsil: 'Sriperumbudur' },
      { village: 'Walajabad', tehsil: 'Walajabad' },
    ],
    centroid: { lat: 12.84, lng: 79.7 },
    landRateBandPerHectare: [2100000, 2500000],
    surveyRangeStart: 940,
    parcelCount: 6,
  },
  {
    district: 'Vellore',
    state: 'tamil_nadu',
    projectId: TAMIL_NADU_PROJECT_ID,
    namePool: 'tamil',
    languagePool: ['ta', 'ta', 'ta', 'en'],
    places: [{ village: 'Arakkonam', tehsil: 'Arakkonam' }],
    centroid: { lat: 12.92, lng: 79.13 },
    landRateBandPerHectare: [1600000, 1900000],
    surveyRangeStart: 960,
    parcelCount: 4,
  },
  {
    district: 'Howrah',
    state: 'west_bengal',
    projectId: WEST_BENGAL_PROJECT_ID,
    namePool: 'bengali',
    languagePool: ['bn', 'bn', 'bn', 'en'],
    places: [
      { village: 'Uluberia', tehsil: 'Uluberia' },
      { village: 'Bagnan', tehsil: 'Bagnan' },
    ],
    centroid: { lat: 22.59, lng: 88.31 },
    landRateBandPerHectare: [1800000, 2100000],
    surveyRangeStart: 980,
    parcelCount: 6,
  },
  {
    district: 'Hooghly',
    state: 'west_bengal',
    projectId: WEST_BENGAL_PROJECT_ID,
    namePool: 'bengali',
    languagePool: ['bn', 'bn', 'bn', 'en'],
    places: [{ village: 'Uttarpara', tehsil: 'Uttarpara' }],
    centroid: { lat: 22.9, lng: 88.4 },
    landRateBandPerHectare: [1700000, 2000000],
    // 1014, not 1000 — 1000+index would cross 1001 and 1012, both of which
    // collide with a hero parcel's hardcoded phone number.
    surveyRangeStart: 1014,
    parcelCount: 4,
  },
  {
    // Step 48: a second Maharashtra project, sanctioned in late 2024 with a
    // near-term target and a 'behind' bias — reads as delayed, unlike the
    // flagship expressway project above.
    district: 'Thane',
    state: 'maharashtra',
    projectId: MAHARASHTRA_URBAN_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [
      { village: 'Bhiwandi', tehsil: 'Bhiwandi' },
      { village: 'Ambernath', tehsil: 'Ambernath' },
    ],
    centroid: { lat: 19.2, lng: 72.97 },
    landRateBandPerHectare: [3400000, 4000000],
    surveyRangeStart: 1020,
    parcelCount: 6,
    stageBias: 'behind',
  },
  {
    district: 'Raigad',
    state: 'maharashtra',
    projectId: MAHARASHTRA_URBAN_PROJECT_ID,
    namePool: 'maharashtrian',
    languagePool: ['hi', 'mr', 'en', 'mr', 'hi'],
    places: [{ village: 'Panvel', tehsil: 'Panvel' }],
    centroid: { lat: 18.52, lng: 73.18 },
    landRateBandPerHectare: [2600000, 3000000],
    surveyRangeStart: 1040,
    parcelCount: 5,
    stageBias: 'behind',
  },
  {
    // Step 48: a second Odisha project, biased 'behind' with a mid-length
    // timeline (see demoProjects) landing it as at_risk.
    district: 'Angul',
    state: 'odisha',
    projectId: ODISHA_MINING_PROJECT_ID,
    namePool: 'odia',
    languagePool: ['or', 'or', 'or', 'en'],
    places: [
      { village: 'Talcher', tehsil: 'Talcher' },
      { village: 'Kaniha', tehsil: 'Kaniha' },
    ],
    centroid: { lat: 20.84, lng: 85.1 },
    landRateBandPerHectare: [900000, 1100000],
    surveyRangeStart: 1060,
    parcelCount: 6,
    stageBias: 'behind',
  },
  {
    district: 'Dhenkanal',
    state: 'odisha',
    projectId: ODISHA_MINING_PROJECT_ID,
    namePool: 'odia',
    languagePool: ['or', 'or', 'or', 'en'],
    places: [{ village: 'Kaniha Road', tehsil: 'Kaniha Road' }],
    centroid: { lat: 20.66, lng: 85.6 },
    landRateBandPerHectare: [850000, 1050000],
    surveyRangeStart: 1080,
    parcelCount: 4,
    stageBias: 'behind',
  },
];

// Step 48: reasons shown when a current-stage document is generated with
// status 'rejected' (see pickDocumentPlan below). Covers all eight kinds so
// the lookup is always defined.
const REJECTION_REASON_BY_KIND: Record<DocumentKind, string> = {
  section_11_notification: 'Notification copy is missing the gazette publication reference.',
  joint_survey_sketch: 'Survey sketch does not match the recorded boundary markers; re-survey requested.',
  ownership_record: 'Ownership extract is more than six months old; a fresh record is required.',
  objection_hearing_minutes: 'Hearing minutes are missing a signature from the presiding officer.',
  valuation_report: 'Valuation report cites an outdated circle rate; recompute against the current rate.',
  compensation_statement: 'Compensation statement is missing the solatium component breakup.',
  award_order: 'Award order copy is missing the competent authority signature.',
  possession_memo: 'Possession memo lacks the joint physical verification photograph.',
};

type DocumentOutcome = Exclude<DocumentStatus, 'verified'>;

type DocumentPlan = {
  withheldDocumentKinds: DocumentKind[];
  currentStageDocumentOutcomes: Partial<Record<DocumentKind, DocumentOutcome>>;
};

// Step 48: previously only the Valuation stage — and only ever one document —
// could ever be missing. Now any current stage's required document(s) can be
// absent entirely (never uploaded) or present-but-unresolved (pending review,
// or rejected and awaiting re-upload): the two different "blocked" stories a
// field officer actually sees, and the source of "multiple missing
// documents" and "some rejected documents" (handbook §11.4's dataset ask).
function pickDocumentPlan(rng: () => number, stage: StageDefinition): DocumentPlan {
  const requiredKinds = stage.requiredDocumentKinds;
  if (requiredKinds.length === 0) {
    return { withheldDocumentKinds: [], currentStageDocumentOutcomes: {} };
  }

  if (rng() < 0.28) {
    const withholdBoth = requiredKinds.length > 1 && rng() < 0.4;
    const withheldDocumentKinds = withholdBoth ? [...requiredKinds] : [pick(rng, requiredKinds)];
    return { withheldDocumentKinds, currentStageDocumentOutcomes: {} };
  }

  const currentStageDocumentOutcomes: Partial<Record<DocumentKind, DocumentOutcome>> = {};
  requiredKinds.forEach((kind) => {
    const roll = rng();
    if (roll < 0.1) {
      currentStageDocumentOutcomes[kind] = 'rejected';
    } else if (roll < 0.2) {
      currentStageDocumentOutcomes[kind] = 'pending_verification';
    }
  });
  return { withheldDocumentKinds: [], currentStageDocumentOutcomes };
}

function generateDistrictSeeds(profile: DistrictProfile): ParcelSeed[] {
  const rng = createRng(`district:${profile.district}`);

  return Array.from({ length: profile.parcelCount }, (_, index) => {
    const place = profile.places[index % profile.places.length];
    const stage = pickWeightedStage(rng, profile.stageBias ?? 'balanced');
    const daysInStage = intBetween(rng, 3, 52);
    const stageEnteredOn = addDays(DEMO_REFERENCE_DATE, -daysInStage);
    const areaHectares = roundTo(intBetween(rng, 55, 355) / 100, 2);
    const [minRatePerHectare, maxRatePerHectare] = profile.landRateBandPerHectare;
    const ratePerHectare = intBetween(rng, minRatePerHectare, maxRatePerHectare);
    const compensationEstimate = Math.round((areaHectares * ratePerHectare) / 5000) * 5000;
    const surveyNumber = `${profile.surveyRangeStart + index}/${intBetween(rng, 1, 12)}`;

    const documentPlan = pickDocumentPlan(rng, getStageDefinition(stage));

    let objectionSeeds: ObjectionSeed[] = [];
    if (stage === 'objection_review' && rng() < 0.7) {
      const reason = pick(rng, OBJECTION_REASON_POOL);
      const status = pick(rng, OBJECTION_STATUS_POOL);
      const submittedOn = addDays(stageEnteredOn, intBetween(rng, 1, 6));
      objectionSeeds = [
        {
          submittedOn,
          reason,
          description: OBJECTION_DESCRIPTIONS[reason],
          status,
          updatedOn: status === 'pending' ? submittedOn : addDays(submittedOn, intBetween(rng, 3, 12)),
        },
      ];
    }

    return {
      surveyNumber,
      owner: {
        name: makeOwnerName(rng, profile.namePool),
        phone: `98765${String(profile.surveyRangeStart + index).padStart(5, '0')}`,
        preferredLanguage: pick(rng, profile.languagePool),
      },
      village: place.village,
      tehsil: place.tehsil,
      district: profile.district,
      areaHectares,
      currentStage: stage,
      stageEnteredOn,
      compensationEstimate,
      coordinates: {
        lat: roundTo(profile.centroid.lat + (rng() - 0.5) * 0.3, 4),
        lng: roundTo(profile.centroid.lng + (rng() - 0.5) * 0.3, 4),
      },
      withheldDocumentKinds:
        documentPlan.withheldDocumentKinds.length > 0 ? documentPlan.withheldDocumentKinds : undefined,
      currentStageDocumentOutcomes:
        Object.keys(documentPlan.currentStageDocumentOutcomes).length > 0
          ? documentPlan.currentStageDocumentOutcomes
          : undefined,
      objectionSeeds: objectionSeeds.length > 0 ? objectionSeeds : undefined,
      projectId: profile.projectId,
    };
  });
}

const generatedSeeds: readonly ParcelSeed[] = DISTRICT_PROFILES.flatMap((profile) =>
  generateDistrictSeeds(profile),
);

function parcelIdFromSurveyNumber(surveyNumber: string) {
  return `parcel-${surveyNumber.replace('/', '-')}`;
}

// Step 48: real per-stage bias against each stage's SLA threshold — stages
// that are procedurally fast (notification, award) run under threshold,
// stages that wait on other parties (objection hearings, valuation
// recalculation) run over it. Fixes the flat-15-day problem (handbook
// §11.4): every completed stage in every parcel's history used to take
// exactly 15 days, which made the Reports stage-duration chart decorative.
const STAGE_DURATION_BIAS: Record<StageId, number> = {
  notification: 0.55,
  survey: 0.85,
  objection_review: 1.35,
  valuation: 1.55,
  compensation_approval: 1.05,
  award: 0.75,
  possession: 0.95,
};

function stageDuration(rng: () => number, stage: StageDefinition): number {
  const base = stage.thresholdDays * STAGE_DURATION_BIAS[stage.id];
  const jitter = 0.65 + rng() * 0.7;
  // A chronic-delay outlier for ~12% of completed stages — the "a few
  // outliers" the plan asks for, not just a smooth bell curve.
  const outlierMultiplier = rng() < 0.12 ? 1.8 + rng() * 1.4 : 1;
  return Math.max(2, Math.round(base * jitter * outlierMultiplier));
}

function makeHistory(seed: ParcelSeed, parcelId: string): StageHistoryEntry[] {
  const currentStageIndex = ACQUISITION_STAGES.findIndex((stage) => stage.id === seed.currentStage);
  const completedStages = ACQUISITION_STAGES.slice(0, currentStageIndex);
  const rng = createRng(`history:${parcelId}`);

  // Walk backward from stageEnteredOn (the current stage's start date, which
  // must stay exactly as seeded — parcel-level rules key off it directly, not
  // off history) so each completed stage gets its own varied duration.
  const enteredOnByIndex: ISODateString[] = new Array(completedStages.length);
  const exitedOnByIndex: ISODateString[] = new Array(completedStages.length);
  let nextEnteredOn = seed.stageEnteredOn;
  for (let index = completedStages.length - 1; index >= 0; index -= 1) {
    exitedOnByIndex[index] = nextEnteredOn;
    enteredOnByIndex[index] = addDays(nextEnteredOn, -stageDuration(rng, completedStages[index]));
    nextEnteredOn = enteredOnByIndex[index];
  }

  return ACQUISITION_STAGES.slice(0, currentStageIndex + 1).map((stage, index) => {
    const isCurrentStage = index === currentStageIndex;

    return {
      id: `${parcelId}-history-${stage.id}`,
      parcelId,
      stage: stage.id,
      enteredOn: isCurrentStage ? seed.stageEnteredOn : enteredOnByIndex[index],
      exitedOn: isCurrentStage ? undefined : exitedOnByIndex[index],
      handledByRole: roleByStage[stage.id],
      note: stageNotes[stage.id],
    };
  });
}

function getSeededDocuments(seed: ParcelSeed, parcelId: string): ParcelDocument[] {
  const currentOrder = getStageDefinition(seed.currentStage).order;
  const withheldDocumentKinds = new Set(seed.withheldDocumentKinds ?? []);
  const currentStageDocumentOutcomes = seed.currentStageDocumentOutcomes ?? {};

  return ACQUISITION_STAGES.filter((stage) => stage.order <= currentOrder)
    .flatMap((stage) =>
      stage.requiredDocumentKinds.map((documentKind) => ({
        stage,
        documentKind,
      })),
    )
    .filter(({ documentKind }) => !withheldDocumentKinds.has(documentKind))
    .map(({ stage, documentKind }, index) => {
      const uploadedOn = addDays(seed.stageEnteredOn, Math.min(index - currentOrder * 5, -1));
      // Only the current stage's documents can be pending/rejected — a
      // parcel could not have advanced past an earlier stage without every
      // required document there already verified, so completed-stage
      // documents always stay verified.
      const status = (stage.order === currentOrder && currentStageDocumentOutcomes[documentKind]) || 'verified';

      return {
        id: `${parcelId}-document-${documentKind}`,
        parcelId,
        stage: stage.id,
        kind: documentKind,
        title: DOCUMENT_KIND_LABELS[documentKind],
        uploadedOn,
        uploadedByRole: roleByStage[stage.id],
        fileType: index % 4 === 0 ? 'image' : 'pdf',
        url: `/demo-documents/${parcelId}/${documentKind}.${index % 4 === 0 ? 'jpg' : 'pdf'}`,
        status,
        ...(status === 'rejected'
          ? {
              rejectionReason: REJECTION_REASON_BY_KIND[documentKind],
              reviewedByRole: roleByStage[stage.id],
              reviewedOn: addDays(uploadedOn, 3),
            }
          : {}),
      };
    });
}

function makeObjections(seed: ParcelSeed, parcelId: string): ParcelObjection[] {
  return (seed.objectionSeeds ?? []).map((objectionSeed, index) => ({
    id: `OBJ-${parcelId.replace('parcel-', '').toUpperCase()}-${String(index + 1).padStart(2, '0')}`,
    parcelId,
    submittedOn: objectionSeed.submittedOn,
    submittedBy: objectionSeed.submittedBy ?? seed.owner.name,
    reason: objectionSeed.reason,
    description: objectionSeed.description,
    status: objectionSeed.status,
    updatedOn: objectionSeed.updatedOn ?? objectionSeed.submittedOn,
    assignedToRole: objectionSeed.assignedToRole ?? 'land_acquisition_officer',
  }));
}

function buildParcel(seed: ParcelSeed): AcquisitionParcel {
  const parcelId = parcelIdFromSurveyNumber(seed.surveyNumber);
  const history = makeHistory(seed, parcelId);
  // Step 63: the Section 19 declaration date, derived from this parcel's own
  // 'notification' stage entry — always present, since every parcel's
  // history starts at 'notification' (see makeHistory above).
  const declarationOn = history.find((entry) => entry.stage === 'notification')?.enteredOn ?? seed.stageEnteredOn;

  return {
    id: parcelId,
    projectId: seed.projectId ?? MAHARASHTRA_PROJECT_ID,
    surveyNumber: seed.surveyNumber,
    owner: seed.owner,
    village: seed.village,
    tehsil: seed.tehsil,
    district: seed.district,
    areaHectares: seed.areaHectares,
    currentStage: seed.currentStage,
    stageEnteredOn: seed.stageEnteredOn,
    declarationOn,
    compensationEstimate: seed.compensationEstimate,
    // Compensation is only disbursed once the award is issued, consistent
    // with the seven-stage gating rules in src/domain/rules.ts.
    compensationPaid:
      seed.currentStage === 'award' || seed.currentStage === 'possession' ? seed.compensationEstimate : 0,
    coordinates: seed.coordinates,
    history,
    documents: getSeededDocuments(seed, parcelId),
    objections: makeObjections(seed, parcelId),
  };
}

// Step 63: deliberately places one non-hero parcel inside the Section 19(1)
// "approaching lapse" window (60 days before the 365-day deadline) for the
// live demo — the same rehearsed, deterministic-number discipline Step 47's
// hero seeds already established. Picked as the most-advanced-but-pre-award
// parcel (deterministic given the fixed DISTRICT_PROFILES order) so the
// kill-shot framing ("₹X and Y months of process become void") reads as a
// genuinely large sunk cost, not an early-stage parcel.
function applyLapseClockDemoOverride(parcels: AcquisitionParcel[]): AcquisitionParcel[] {
  const awardOrder = getStageDefinition('award').order;
  const candidate = parcels
    .filter((parcel) => parcel.surveyNumber !== HERO_SURVEY_NUMBER && getStageDefinition(parcel.currentStage).order < awardOrder)
    .sort((first, second) => getStageDefinition(second.currentStage).order - getStageDefinition(first.currentStage).order)[0];

  if (!candidate) {
    return parcels;
  }

  const approachingDeclarationOn = addDays(DEMO_REFERENCE_DATE, -320);

  return parcels.map((parcel) =>
    parcel.id === candidate.id ? { ...parcel, declarationOn: approachingDeclarationOn } : parcel,
  );
}

export const demoParcels: AcquisitionParcel[] = applyLapseClockDemoOverride(
  [...heroSeeds, ...generatedSeeds].map(buildParcel),
);

function totalAreaForProject(projectId: string) {
  return Number(
    demoParcels
      .filter((parcel) => parcel.projectId === projectId)
      .reduce((sum, parcel) => sum + parcel.areaHectares, 0)
      .toFixed(2),
  );
}

// One project per state. R&R family counts are placeholder-reasonable for
// now — Step 15 is the step that's specifically responsible for tuning them
// for the dashboard's R&R card.
export const demoProjects: AcquisitionProject[] = [
  {
    id: MAHARASHTRA_PROJECT_ID,
    name: 'Pune–Nagpur Expressway Land Corridor',
    sector: 'national_highway',
    state: 'maharashtra',
    implementingAgency: 'Maharashtra State Road Development Corporation',
    sanctionedOn: '2026-01-15',
    targetCompletionOn: '2027-12-31',
    totalAreaRequiredHectares: totalAreaForProject(MAHARASHTRA_PROJECT_ID),
    compensationSanctioned: 620000000,
    rAndR: {
      affectedFamilies: 420,
      displacedFamilies: 96,
      familiesResettled: 58,
      rrChecklistComplete: false,
    },
  },
  {
    id: GUJARAT_PROJECT_ID,
    name: 'Ahmedabad–Bharuch Dedicated Freight Corridor',
    sector: 'railway',
    state: 'gujarat',
    implementingAgency: 'Dedicated Freight Corridor Corporation of India',
    sanctionedOn: '2026-02-10',
    targetCompletionOn: '2028-03-31',
    totalAreaRequiredHectares: totalAreaForProject(GUJARAT_PROJECT_ID),
    compensationSanctioned: 310000000,
    rAndR: {
      affectedFamilies: 210,
      displacedFamilies: 47,
      familiesResettled: 47,
      rrChecklistComplete: true,
    },
  },
  {
    id: MADHYA_PRADESH_PROJECT_ID,
    name: 'Narmada Basin Irrigation Expansion',
    sector: 'irrigation',
    state: 'madhya_pradesh',
    implementingAgency: 'Madhya Pradesh Water Resources Department',
    // Step 48: target pulled in from 2027-06-30 and every district profile
    // for this project biased 'severely_behind' so it reads as genuinely
    // at_risk (see getProjectCalculatedStatus in rules.ts) instead of every
    // project landing on_track by coincidence of a uniform stage pick.
    sanctionedOn: '2025-11-20',
    targetCompletionOn: '2027-03-31',
    totalAreaRequiredHectares: totalAreaForProject(MADHYA_PRADESH_PROJECT_ID),
    compensationSanctioned: 245000000,
    rAndR: {
      affectedFamilies: 365,
      displacedFamilies: 112,
      familiesResettled: 20,
      rrChecklistComplete: false,
    },
  },
  {
    id: TELANGANA_PROJECT_ID,
    name: 'Nalgonda–Karimnagar Power Transmission Line',
    sector: 'power_transmission',
    state: 'telangana',
    implementingAgency: 'Telangana State Transmission Corporation',
    // Step 48: sanctioned well in the past with a near-term target, plus a
    // 'behind' stage bias on every district profile, so this project reads
    // as genuinely delayed instead of labeled that way.
    sanctionedOn: '2024-06-01',
    targetCompletionOn: '2026-10-31',
    totalAreaRequiredHectares: totalAreaForProject(TELANGANA_PROJECT_ID),
    compensationSanctioned: 198000000,
    rAndR: {
      affectedFamilies: 150,
      displacedFamilies: 32,
      familiesResettled: 32,
      rrChecklistComplete: true,
    },
  },
  {
    id: ODISHA_PROJECT_ID,
    name: 'Paradip Port Expansion & Approach Corridor',
    sector: 'port',
    state: 'odisha',
    implementingAgency: 'Paradip Port Authority',
    // Step 48: pulled back to a mid-2025 sanction with a nearer target, plus
    // a 'behind' stage bias on every district profile, matching the
    // Telangana project above's delayed shape.
    sanctionedOn: '2025-06-01',
    targetCompletionOn: '2027-01-31',
    totalAreaRequiredHectares: totalAreaForProject(ODISHA_PROJECT_ID),
    compensationSanctioned: 275000000,
    rAndR: {
      affectedFamilies: 280,
      displacedFamilies: 84,
      familiesResettled: 40,
      rrChecklistComplete: false,
    },
  },
  // Step 48: seven more projects covering the remaining three
  // PROJECT_SECTORS and five remaining STATE_NAMES, plus a second project
  // each for Maharashtra and Odisha — see UTTAR_PRADESH_PROJECT_ID etc.
  // above for how each one's sanction/target dates and district stage
  // biases were chosen to land on a specific on_track/at_risk/delayed
  // status rather than all defaulting to on_track.
  {
    id: UTTAR_PRADESH_PROJECT_ID,
    name: 'NCR–Bundelkhand Industrial Corridor',
    sector: 'industrial_corridor',
    state: 'uttar_pradesh',
    implementingAgency: 'Uttar Pradesh Expressways Industrial Development Authority',
    sanctionedOn: '2026-04-01',
    targetCompletionOn: '2028-06-30',
    totalAreaRequiredHectares: totalAreaForProject(UTTAR_PRADESH_PROJECT_ID),
    compensationSanctioned: 540000000,
    rAndR: {
      affectedFamilies: 680,
      displacedFamilies: 210,
      familiesResettled: 140,
      rrChecklistComplete: false,
    },
  },
  {
    id: RAJASTHAN_PROJECT_ID,
    name: 'Barmer–Bikaner Lignite Mining Expansion',
    sector: 'mining',
    state: 'rajasthan',
    implementingAgency: 'Rajasthan State Mines and Minerals Ltd.',
    sanctionedOn: '2025-01-01',
    targetCompletionOn: '2027-06-30',
    totalAreaRequiredHectares: totalAreaForProject(RAJASTHAN_PROJECT_ID),
    compensationSanctioned: 95000000,
    rAndR: {
      affectedFamilies: 95,
      displacedFamilies: 40,
      familiesResettled: 40,
      rrChecklistComplete: true,
    },
  },
  {
    id: KARNATAKA_PROJECT_ID,
    name: 'Bengaluru Metro Phase 3 Land Corridor',
    sector: 'urban_infrastructure',
    state: 'karnataka',
    implementingAgency: 'Bangalore Metro Rail Corporation Ltd.',
    sanctionedOn: '2025-03-01',
    targetCompletionOn: '2027-05-31',
    totalAreaRequiredHectares: totalAreaForProject(KARNATAKA_PROJECT_ID),
    compensationSanctioned: 310000000,
    rAndR: {
      affectedFamilies: 260,
      displacedFamilies: 88,
      familiesResettled: 30,
      rrChecklistComplete: false,
    },
  },
  {
    id: TAMIL_NADU_PROJECT_ID,
    name: 'Chennai–Salem Green Expressway',
    sector: 'national_highway',
    state: 'tamil_nadu',
    implementingAgency: 'Tamil Nadu Road Development Company',
    sanctionedOn: '2026-05-01',
    targetCompletionOn: '2028-02-28',
    totalAreaRequiredHectares: totalAreaForProject(TAMIL_NADU_PROJECT_ID),
    compensationSanctioned: 150000000,
    rAndR: {
      affectedFamilies: 130,
      displacedFamilies: 25,
      familiesResettled: 25,
      rrChecklistComplete: true,
    },
  },
  {
    id: WEST_BENGAL_PROJECT_ID,
    name: 'Kolkata Dock–Haldia Rail Link',
    sector: 'railway',
    state: 'west_bengal',
    implementingAgency: 'Kolkata Port Trust & Eastern Railway Joint Cell',
    sanctionedOn: '2026-06-01',
    targetCompletionOn: '2028-05-31',
    totalAreaRequiredHectares: totalAreaForProject(WEST_BENGAL_PROJECT_ID),
    compensationSanctioned: 140000000,
    rAndR: {
      affectedFamilies: 140,
      displacedFamilies: 36,
      familiesResettled: 18,
      rrChecklistComplete: false,
    },
  },
  {
    id: MAHARASHTRA_URBAN_PROJECT_ID,
    name: 'Mumbai Trans Harbour Link Extension',
    sector: 'urban_infrastructure',
    state: 'maharashtra',
    implementingAgency: 'Mumbai Metropolitan Region Development Authority',
    sanctionedOn: '2024-09-01',
    targetCompletionOn: '2026-12-31',
    totalAreaRequiredHectares: totalAreaForProject(MAHARASHTRA_URBAN_PROJECT_ID),
    compensationSanctioned: 260000000,
    rAndR: {
      affectedFamilies: 310,
      displacedFamilies: 120,
      familiesResettled: 45,
      rrChecklistComplete: false,
    },
  },
  {
    id: ODISHA_MINING_PROJECT_ID,
    name: 'Talcher Coalfield Land Acquisition',
    sector: 'mining',
    state: 'odisha',
    implementingAgency: 'Mahanadi Coalfields Limited',
    sanctionedOn: '2025-02-01',
    targetCompletionOn: '2027-08-31',
    totalAreaRequiredHectares: totalAreaForProject(ODISHA_MINING_PROJECT_ID),
    compensationSanctioned: 110000000,
    rAndR: {
      affectedFamilies: 220,
      displacedFamilies: 95,
      familiesResettled: 20,
      rrChecklistComplete: false,
    },
  },
];

function requireHeroParcel() {
  const heroParcel = demoParcels.find((parcel) => parcel.surveyNumber === HERO_SURVEY_NUMBER);

  if (!heroParcel) {
    throw new Error(`Demo data must include hero parcel ${HERO_SURVEY_NUMBER}.`);
  }

  return heroParcel;
}

export const heroParcel = requireHeroParcel();
export const demoDashboardSummary = getDashboardSummary(demoParcels, DEMO_REFERENCE_DATE);

const heroStatus = getParcelCalculatedStatus(heroParcel, DEMO_REFERENCE_DATE);

if (
  heroParcel.currentStage !== 'valuation' ||
  !heroStatus.isStuck ||
  !heroStatus.missingDocumentKinds.includes('valuation_report')
) {
  throw new Error('Hero parcel 124/7 must start stuck in Valuation with no valuation document.');
}
