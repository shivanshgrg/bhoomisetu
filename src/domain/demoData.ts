import {
  ACQUISITION_STAGES,
  DEMO_REFERENCE_DATE,
  DOCUMENT_KIND_LABELS,
  STAGE_HANDLER_ROLE,
  type DocumentKind,
  type OfficialRole,
  type StageId,
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
  objectionSeeds?: readonly ObjectionSeed[];
  // Defaults to MAHARASHTRA_PROJECT_ID when omitted, so the original 25
  // seeds above don't need touching.
  projectId?: string;
};

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

const seeds: readonly ParcelSeed[] = [
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
    surveyNumber: '88/2',
    owner: { name: 'Ramesh Shinde', phone: '9876501002', preferredLanguage: 'mr' },
    village: 'Kondhwa',
    tehsil: 'Haveli',
    district: 'Pune',
    areaHectares: 0.84,
    currentStage: 'notification',
    stageEnteredOn: '2026-08-16',
    compensationEstimate: 1560000,
    coordinates: { lat: 18.4679, lng: 73.8903 },
  },
  {
    surveyNumber: '51/9',
    owner: { name: 'Meera Kulkarni', phone: '9876501003', preferredLanguage: 'en' },
    village: 'Katol',
    tehsil: 'Katol',
    district: 'Nagpur',
    areaHectares: 2.18,
    currentStage: 'award',
    stageEnteredOn: '2026-08-05',
    compensationEstimate: 4210000,
    coordinates: { lat: 21.2734, lng: 78.5855 },
  },
  {
    surveyNumber: '203/4',
    owner: { name: 'Sunita Deshmukh', phone: '9876501004', preferredLanguage: 'mr' },
    village: 'Umred',
    tehsil: 'Umred',
    district: 'Nagpur',
    areaHectares: 1.07,
    currentStage: 'survey',
    stageEnteredOn: '2026-08-10',
    compensationEstimate: 1960000,
    coordinates: { lat: 20.8536, lng: 79.3225 },
  },
  {
    surveyNumber: '14/3',
    owner: { name: 'Prakash More', phone: '9876501005', preferredLanguage: 'hi' },
    village: 'Sinnar',
    tehsil: 'Sinnar',
    district: 'Nashik',
    areaHectares: 0.62,
    currentStage: 'objection_review',
    stageEnteredOn: '2026-08-01',
    compensationEstimate: 1325000,
    coordinates: { lat: 19.8458, lng: 73.9986 },
    objectionSeeds: [
      {
        submittedOn: '2026-08-04',
        reason: 'ownership',
        description: 'Co-owner name needs verification before the hearing minutes can close.',
        status: 'pending',
      },
    ],
  },
  {
    surveyNumber: '77/1',
    owner: { name: 'Farida Shaikh', phone: '9876501006', preferredLanguage: 'en' },
    village: 'Karjat',
    tehsil: 'Karjat',
    district: 'Ahmednagar',
    areaHectares: 1.75,
    currentStage: 'compensation_approval',
    stageEnteredOn: '2026-08-12',
    compensationEstimate: 3090000,
    coordinates: { lat: 18.5516, lng: 75.0068 },
  },
  {
    surveyNumber: '302/6',
    owner: { name: 'Bhaskar Pawar', phone: '9876501007', preferredLanguage: 'mr' },
    village: 'Koregaon',
    tehsil: 'Koregaon',
    district: 'Satara',
    areaHectares: 2.64,
    currentStage: 'possession',
    stageEnteredOn: '2026-08-04',
    compensationEstimate: 5120000,
    coordinates: { lat: 17.6958, lng: 74.1602 },
  },
  {
    surveyNumber: '45/8',
    owner: { name: 'Nisha Jadhav', phone: '9876501008', preferredLanguage: 'hi' },
    village: 'Malegaon',
    tehsil: 'Malegaon',
    district: 'Nashik',
    areaHectares: 1.2,
    currentStage: 'valuation',
    stageEnteredOn: '2026-08-14',
    compensationEstimate: 2440000,
    coordinates: { lat: 20.5579, lng: 74.5287 },
  },
  {
    surveyNumber: '109/5',
    owner: { name: 'Arun Kale', phone: '9876501009', preferredLanguage: 'mr' },
    village: 'Baramati',
    tehsil: 'Baramati',
    district: 'Pune',
    areaHectares: 3.1,
    currentStage: 'survey',
    stageEnteredOn: '2026-07-18',
    compensationEstimate: 5840000,
    coordinates: { lat: 18.1517, lng: 74.5773 },
  },
  {
    surveyNumber: '187/3',
    owner: { name: 'Lata Bhosale', phone: '9876501010', preferredLanguage: 'hi' },
    village: 'Akluj',
    tehsil: 'Malshiras',
    district: 'Solapur',
    areaHectares: 0.96,
    currentStage: 'award',
    stageEnteredOn: '2026-07-20',
    compensationEstimate: 1740000,
    coordinates: { lat: 17.8841, lng: 75.0247 },
  },
  {
    surveyNumber: '64/2',
    owner: { name: 'Girish Wagh', phone: '9876501011', preferredLanguage: 'mr' },
    village: 'Pulgaon',
    tehsil: 'Deoli',
    district: 'Wardha',
    areaHectares: 1.36,
    currentStage: 'notification',
    stageEnteredOn: '2026-08-22',
    compensationEstimate: 2120000,
    coordinates: { lat: 20.7229, lng: 78.3201 },
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
  {
    surveyNumber: '156/1',
    owner: { name: 'Devendra Mali', phone: '9876501013', preferredLanguage: 'en' },
    village: 'Indapur',
    tehsil: 'Indapur',
    district: 'Pune',
    areaHectares: 1.88,
    currentStage: 'compensation_approval',
    stageEnteredOn: '2026-08-01',
    compensationEstimate: 3975000,
    coordinates: { lat: 18.1164, lng: 75.0261 },
  },
  {
    surveyNumber: '12/9',
    owner: { name: 'Rehana Khan', phone: '9876501014', preferredLanguage: 'hi' },
    village: 'Nandgaon',
    tehsil: 'Nandgaon',
    district: 'Nashik',
    areaHectares: 0.72,
    currentStage: 'possession',
    stageEnteredOn: '2026-07-28',
    compensationEstimate: 1280000,
    coordinates: { lat: 20.3071, lng: 74.6556 },
  },
  {
    surveyNumber: '230/2',
    owner: { name: 'Mahesh Chavan', phone: '9876501015', preferredLanguage: 'mr' },
    village: 'Saoner',
    tehsil: 'Saoner',
    district: 'Nagpur',
    areaHectares: 2.41,
    currentStage: 'valuation',
    stageEnteredOn: '2026-08-19',
    compensationEstimate: 4380000,
    coordinates: { lat: 21.3852, lng: 78.9206 },
  },
  {
    surveyNumber: '76/4',
    owner: { name: 'Pooja Nikam', phone: '9876501016', preferredLanguage: 'hi' },
    village: 'Phaltan',
    tehsil: 'Phaltan',
    district: 'Satara',
    areaHectares: 1.14,
    currentStage: 'survey',
    stageEnteredOn: '2026-08-21',
    compensationEstimate: 2275000,
    coordinates: { lat: 17.9911, lng: 74.4329 },
  },
  {
    surveyNumber: '18/11',
    owner: { name: 'Sanjay Rathod', phone: '9876501017', preferredLanguage: 'mr' },
    village: 'Morshi',
    tehsil: 'Morshi',
    district: 'Amravati',
    areaHectares: 3.52,
    currentStage: 'notification',
    stageEnteredOn: '2026-07-10',
    compensationEstimate: 6020000,
    coordinates: { lat: 21.3405, lng: 78.0122 },
  },
  {
    surveyNumber: '311/8',
    owner: { name: 'Vandana Korde', phone: '9876501018', preferredLanguage: 'en' },
    village: 'Bhor',
    tehsil: 'Bhor',
    district: 'Pune',
    areaHectares: 0.93,
    currentStage: 'objection_review',
    stageEnteredOn: '2026-08-12',
    compensationEstimate: 1880000,
    coordinates: { lat: 18.1488, lng: 73.8435 },
    objectionSeeds: [
      {
        submittedOn: '2026-08-13',
        reason: 'other',
        description: 'Access path clarification was addressed during the local hearing.',
        status: 'resolved',
        updatedOn: '2026-08-20',
      },
    ],
  },
  {
    surveyNumber: '5/4',
    owner: { name: 'Omkar Londhe', phone: '9876501019', preferredLanguage: 'mr' },
    village: 'Akole',
    tehsil: 'Akole',
    district: 'Ahmednagar',
    areaHectares: 2.77,
    currentStage: 'compensation_approval',
    stageEnteredOn: '2026-08-24',
    compensationEstimate: 4890000,
    coordinates: { lat: 19.5413, lng: 74.0058 },
  },
  {
    surveyNumber: '144/10',
    owner: { name: 'Chitra Tambe', phone: '9876501020', preferredLanguage: 'hi' },
    village: 'Daund',
    tehsil: 'Daund',
    district: 'Pune',
    areaHectares: 1.31,
    currentStage: 'award',
    stageEnteredOn: '2026-08-16',
    compensationEstimate: 2690000,
    coordinates: { lat: 18.4638, lng: 74.5789 },
  },
  {
    surveyNumber: '220/7',
    owner: { name: 'Suresh Bagal', phone: '9876501021', preferredLanguage: 'mr' },
    village: 'Karmala',
    tehsil: 'Karmala',
    district: 'Solapur',
    areaHectares: 2.09,
    currentStage: 'survey',
    stageEnteredOn: '2026-08-02',
    compensationEstimate: 3660000,
    coordinates: { lat: 18.4072, lng: 75.191 },
  },
  {
    surveyNumber: '39/12',
    owner: { name: 'Irfan Ansari', phone: '9876501022', preferredLanguage: 'hi' },
    village: 'Wardha',
    tehsil: 'Wardha',
    district: 'Wardha',
    areaHectares: 0.58,
    currentStage: 'valuation',
    stageEnteredOn: '2026-08-03',
    compensationEstimate: 1110000,
    coordinates: { lat: 20.7453, lng: 78.6022 },
  },
  {
    surveyNumber: '66/8',
    owner: { name: 'Neelam Salunkhe', phone: '9876501023', preferredLanguage: 'en' },
    village: 'Yeola',
    tehsil: 'Yeola',
    district: 'Nashik',
    areaHectares: 1.68,
    currentStage: 'notification',
    stageEnteredOn: '2026-08-04',
    compensationEstimate: 2845000,
    coordinates: { lat: 20.042, lng: 74.489 },
  },
  {
    surveyNumber: '275/5',
    owner: { name: 'Tara Ingle', phone: '9876501024', preferredLanguage: 'mr' },
    village: 'Murtijapur',
    tehsil: 'Murtijapur',
    district: 'Akola',
    areaHectares: 1.95,
    currentStage: 'possession',
    stageEnteredOn: '2026-08-23',
    compensationEstimate: 3420000,
    coordinates: { lat: 20.7301, lng: 77.3668 },
  },
  {
    surveyNumber: '99/1',
    owner: { name: 'Harish Joshi', phone: '9876501025', preferredLanguage: 'hi' },
    village: 'Pandharpur',
    tehsil: 'Pandharpur',
    district: 'Solapur',
    areaHectares: 2.36,
    currentStage: 'objection_review',
    stageEnteredOn: '2026-08-20',
    compensationEstimate: 4550000,
    coordinates: { lat: 17.6792, lng: 75.3302 },
    objectionSeeds: [
      {
        submittedOn: '2026-08-22',
        reason: 'compensation',
        description: 'Landowner requested clarification of crop-loss compensation components.',
        status: 'pending',
      },
    ],
  },
];

export const GUJARAT_PROJECT_ID = 'project-gujarat-freight-corridor' as const;
export const MADHYA_PRADESH_PROJECT_ID = 'project-mp-narmada-irrigation' as const;
export const TELANGANA_PROJECT_ID = 'project-telangana-power-grid' as const;
export const ODISHA_PROJECT_ID = 'project-odisha-paradip-port' as const;

// Step 13: 4 new state projects, kept in a separate array from the original
// 25-parcel `seeds` above so those stay completely untouched.
const additionalSeeds: readonly ParcelSeed[] = [
  {
    surveyNumber: '212/3',
    owner: { name: 'Bhavesh Patel', phone: '9876502001', preferredLanguage: 'en' },
    village: 'Sanand',
    tehsil: 'Sanand',
    district: 'Ahmedabad',
    areaHectares: 2.4,
    currentStage: 'valuation',
    stageEnteredOn: '2026-07-28',
    compensationEstimate: 5220000,
    coordinates: { lat: 22.9917, lng: 72.3833 },
    projectId: GUJARAT_PROJECT_ID,
  },
  {
    surveyNumber: '48/6',
    owner: { name: 'Rekha Trivedi', phone: '9876502002', preferredLanguage: 'en' },
    village: 'Dholka',
    tehsil: 'Dholka',
    district: 'Ahmedabad',
    areaHectares: 1.62,
    currentStage: 'notification',
    stageEnteredOn: '2026-08-18',
    compensationEstimate: 3140000,
    coordinates: { lat: 22.7196, lng: 72.4409 },
    projectId: GUJARAT_PROJECT_ID,
  },
  {
    surveyNumber: '160/2',
    owner: { name: 'Ketan Vyas', phone: '9876502003', preferredLanguage: 'en' },
    village: 'Padra',
    tehsil: 'Padra',
    district: 'Vadodara',
    areaHectares: 3.05,
    currentStage: 'award',
    stageEnteredOn: '2026-08-01',
    compensationEstimate: 6480000,
    coordinates: { lat: 22.2331, lng: 73.0872 },
    projectId: GUJARAT_PROJECT_ID,
  },
  {
    surveyNumber: '33/9',
    owner: { name: 'Falguni Desai', phone: '9876502004', preferredLanguage: 'en' },
    village: 'Ankleshwar',
    tehsil: 'Ankleshwar',
    district: 'Bharuch',
    areaHectares: 1.18,
    currentStage: 'objection_review',
    stageEnteredOn: '2026-08-09',
    compensationEstimate: 2380000,
    coordinates: { lat: 21.6266, lng: 73.0037 },
    projectId: GUJARAT_PROJECT_ID,
    objectionSeeds: [
      {
        submittedOn: '2026-08-11',
        reason: 'compensation',
        description: 'Landowner disputes the base circle rate used for the estimate.',
        status: 'under_review',
        updatedOn: '2026-08-19',
      },
    ],
  },
  {
    surveyNumber: '77/5',
    owner: { name: 'Manoj Barot', phone: '9876502005', preferredLanguage: 'en' },
    village: 'Kadi',
    tehsil: 'Kadi',
    district: 'Mehsana',
    areaHectares: 0.88,
    currentStage: 'possession',
    stageEnteredOn: '2026-07-30',
    compensationEstimate: 1690000,
    coordinates: { lat: 23.2984, lng: 72.3352 },
    projectId: GUJARAT_PROJECT_ID,
  },
  {
    surveyNumber: '19/4',
    owner: { name: 'Suresh Chourasia', phone: '9876502006', preferredLanguage: 'hi' },
    village: 'Sehore',
    tehsil: 'Sehore',
    district: 'Sehore',
    areaHectares: 2.86,
    currentStage: 'survey',
    stageEnteredOn: '2026-08-11',
    compensationEstimate: 3960000,
    coordinates: { lat: 23.2032, lng: 77.0844 },
    projectId: MADHYA_PRADESH_PROJECT_ID,
  },
  {
    surveyNumber: '104/7',
    owner: { name: 'Anita Sharma', phone: '9876502007', preferredLanguage: 'hi' },
    village: 'Hoshangabad',
    tehsil: 'Hoshangabad',
    district: 'Narmadapuram',
    areaHectares: 1.94,
    currentStage: 'valuation',
    stageEnteredOn: '2026-08-06',
    compensationEstimate: 2870000,
    coordinates: { lat: 22.7519, lng: 77.7175 },
    projectId: MADHYA_PRADESH_PROJECT_ID,
    withheldDocumentKinds: ['valuation_report'],
  },
  {
    surveyNumber: '250/1',
    owner: { name: 'Deepak Rajput', phone: '9876502008', preferredLanguage: 'hi' },
    village: 'Itarsi',
    tehsil: 'Itarsi',
    district: 'Narmadapuram',
    areaHectares: 3.42,
    currentStage: 'compensation_approval',
    stageEnteredOn: '2026-08-14',
    compensationEstimate: 5340000,
    coordinates: { lat: 22.6108, lng: 77.7614 },
    projectId: MADHYA_PRADESH_PROJECT_ID,
  },
  {
    surveyNumber: '61/10',
    owner: { name: 'Pushpa Yadav', phone: '9876502009', preferredLanguage: 'hi' },
    village: 'Bareli',
    tehsil: 'Bareli',
    district: 'Raisen',
    areaHectares: 1.05,
    currentStage: 'notification',
    stageEnteredOn: '2026-08-20',
    compensationEstimate: 1720000,
    coordinates: { lat: 23.0417, lng: 78.3172 },
    projectId: MADHYA_PRADESH_PROJECT_ID,
  },
  {
    surveyNumber: '138/2',
    owner: { name: 'K. Srinivas Rao', phone: '9876502010', preferredLanguage: 'en' },
    village: 'Chityal',
    tehsil: 'Chityal',
    district: 'Nalgonda',
    areaHectares: 2.12,
    currentStage: 'award',
    stageEnteredOn: '2026-07-25',
    compensationEstimate: 3480000,
    coordinates: { lat: 17.2543, lng: 79.1494 },
    projectId: TELANGANA_PROJECT_ID,
  },
  {
    surveyNumber: '27/6',
    owner: { name: 'M. Padma', phone: '9876502011', preferredLanguage: 'en' },
    village: 'Suryapet',
    tehsil: 'Suryapet',
    district: 'Suryapet',
    areaHectares: 1.4,
    currentStage: 'objection_review',
    stageEnteredOn: '2026-08-08',
    compensationEstimate: 2260000,
    coordinates: { lat: 17.1401, lng: 79.6198 },
    projectId: TELANGANA_PROJECT_ID,
    objectionSeeds: [
      {
        submittedOn: '2026-08-10',
        reason: 'ownership',
        description: 'Joint patta holders requesting shared compensation split verification.',
        status: 'pending',
      },
    ],
  },
  {
    surveyNumber: '95/3',
    owner: { name: 'B. Ramesh', phone: '9876502012', preferredLanguage: 'en' },
    village: 'Jangaon',
    tehsil: 'Jangaon',
    district: 'Jangaon',
    areaHectares: 3.18,
    currentStage: 'valuation',
    stageEnteredOn: '2026-08-02',
    compensationEstimate: 4620000,
    coordinates: { lat: 17.7231, lng: 79.1816 },
    projectId: TELANGANA_PROJECT_ID,
  },
  {
    surveyNumber: '52/8',
    owner: { name: 'G. Lakshmi', phone: '9876502013', preferredLanguage: 'en' },
    village: 'Huzurabad',
    tehsil: 'Huzurabad',
    district: 'Karimnagar',
    areaHectares: 0.96,
    currentStage: 'survey',
    stageEnteredOn: '2026-08-17',
    compensationEstimate: 1590000,
    coordinates: { lat: 18.2833, lng: 79.4667 },
    projectId: TELANGANA_PROJECT_ID,
  },
  {
    surveyNumber: '183/9',
    owner: { name: 'Debasish Nayak', phone: '9876502014', preferredLanguage: 'en' },
    village: 'Kujang',
    tehsil: 'Kujang',
    district: 'Jagatsinghpur',
    areaHectares: 2.55,
    currentStage: 'possession',
    stageEnteredOn: '2026-07-22',
    compensationEstimate: 4180000,
    coordinates: { lat: 20.2472, lng: 86.5989 },
    projectId: ODISHA_PROJECT_ID,
  },
  {
    surveyNumber: '41/5',
    owner: { name: 'Sanjukta Behera', phone: '9876502015', preferredLanguage: 'en' },
    village: 'Ersama',
    tehsil: 'Ersama',
    district: 'Jagatsinghpur',
    areaHectares: 1.73,
    currentStage: 'compensation_approval',
    stageEnteredOn: '2026-08-13',
    compensationEstimate: 2950000,
    coordinates: { lat: 20.1667, lng: 86.5833 },
    projectId: ODISHA_PROJECT_ID,
  },
  {
    surveyNumber: '206/4',
    owner: { name: 'Ashok Mallick', phone: '9876502016', preferredLanguage: 'en' },
    village: 'Balikuda',
    tehsil: 'Balikuda',
    district: 'Jagatsinghpur',
    areaHectares: 2.28,
    currentStage: 'notification',
    stageEnteredOn: '2026-08-21',
    compensationEstimate: 3620000,
    coordinates: { lat: 20.3667, lng: 86.4667 },
    projectId: ODISHA_PROJECT_ID,
  },
  {
    surveyNumber: '9/2',
    owner: { name: 'Priyanka Das', phone: '9876502017', preferredLanguage: 'en' },
    village: 'Erasama',
    tehsil: 'Ersama',
    district: 'Jagatsinghpur',
    areaHectares: 1.11,
    currentStage: 'objection_review',
    stageEnteredOn: '2026-08-05',
    compensationEstimate: 1840000,
    coordinates: { lat: 20.2, lng: 86.55 },
    projectId: ODISHA_PROJECT_ID,
    objectionSeeds: [
      {
        submittedOn: '2026-08-07',
        reason: 'measurement',
        description: 'Requested re-verification of plot boundary against the revenue map.',
        status: 'resolved',
        updatedOn: '2026-08-15',
      },
    ],
  },
];

function parcelIdFromSurveyNumber(surveyNumber: string) {
  return `parcel-${surveyNumber.replace('/', '-')}`;
}

function makeHistory(seed: ParcelSeed, parcelId: string): StageHistoryEntry[] {
  const currentStageIndex = ACQUISITION_STAGES.findIndex((stage) => stage.id === seed.currentStage);
  const firstEnteredOn = addDays(seed.stageEnteredOn, currentStageIndex * -16);

  return ACQUISITION_STAGES.slice(0, currentStageIndex + 1).map((stage, index) => {
    const enteredOn = index === currentStageIndex ? seed.stageEnteredOn : addDays(firstEnteredOn, index * 16);
    const exitedOn =
      index === currentStageIndex ? undefined : addDays(firstEnteredOn, index * 16 + 15);

    return {
      id: `${parcelId}-history-${stage.id}`,
      parcelId,
      stage: stage.id,
      enteredOn,
      exitedOn,
      handledByRole: roleByStage[stage.id],
      note: stageNotes[stage.id],
    };
  });
}

function getSeededDocuments(seed: ParcelSeed, parcelId: string): ParcelDocument[] {
  const currentOrder = getStageDefinition(seed.currentStage).order;
  const withheldDocumentKinds = new Set(seed.withheldDocumentKinds ?? []);

  return ACQUISITION_STAGES.filter((stage) => stage.order <= currentOrder)
    .flatMap((stage) =>
      stage.requiredDocumentKinds.map((documentKind) => ({
        stage,
        documentKind,
      })),
    )
    .filter(({ documentKind }) => !withheldDocumentKinds.has(documentKind))
    .map(({ stage, documentKind }, index) => ({
      id: `${parcelId}-document-${documentKind}`,
      parcelId,
      stage: stage.id,
      kind: documentKind,
      title: DOCUMENT_KIND_LABELS[documentKind],
      uploadedOn: addDays(seed.stageEnteredOn, Math.min(index - currentOrder * 5, -1)),
      uploadedByRole: roleByStage[stage.id],
      fileType: index % 4 === 0 ? 'image' : 'pdf',
      url: `/demo-documents/${parcelId}/${documentKind}.${index % 4 === 0 ? 'jpg' : 'pdf'}`,
    }));
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

// Step 13 introduces the real AcquisitionProject records (one per state) and
// will assign these 25 existing parcels to `MAHARASHTRA_PROJECT_ID`; kept as
// a named constant now so Step 13 only has to add the project, not touch
// every seed here.
export const MAHARASHTRA_PROJECT_ID = 'project-maharashtra-corridor' as const;

export const demoParcels: AcquisitionParcel[] = [...seeds, ...additionalSeeds].map((seed) => {
  const parcelId = parcelIdFromSurveyNumber(seed.surveyNumber);

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
    compensationEstimate: seed.compensationEstimate,
    // Compensation is only disbursed once the award is issued, consistent
    // with the seven-stage gating rules in src/domain/rules.ts.
    compensationPaid:
      seed.currentStage === 'award' || seed.currentStage === 'possession' ? seed.compensationEstimate : 0,
    coordinates: seed.coordinates,
    history: makeHistory(seed, parcelId),
    documents: getSeededDocuments(seed, parcelId),
    objections: makeObjections(seed, parcelId),
  };
});

function totalAreaForProject(projectId: string) {
  return Number(
    demoParcels
      .filter((parcel) => parcel.projectId === projectId)
      .reduce((sum, parcel) => sum + parcel.areaHectares, 0)
      .toFixed(2),
  );
}

// Step 13: one project per state (Maharashtra, the original 25-parcel
// project, plus 4 new ones). R&R family counts are placeholder-reasonable
// for now — Step 15 is the step that's specifically responsible for tuning
// them for the dashboard's R&R card.
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
    sanctionedOn: '2025-11-20',
    targetCompletionOn: '2027-06-30',
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
    sanctionedOn: '2026-03-01',
    targetCompletionOn: '2027-09-30',
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
    sanctionedOn: '2025-12-05',
    targetCompletionOn: '2028-01-31',
    totalAreaRequiredHectares: totalAreaForProject(ODISHA_PROJECT_ID),
    compensationSanctioned: 275000000,
    rAndR: {
      affectedFamilies: 280,
      displacedFamilies: 84,
      familiesResettled: 40,
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
