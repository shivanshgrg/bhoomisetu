import type { DocumentKind, ObjectionReason, ObjectionStatus, StageId } from '../domain';
import type { DashboardStatus } from '../domain';

export type Language = 'en' | 'hi';

export type TranslationEntry = { en: string; hi: string };

// Centralized English/Hindi copy for the landowner-facing portal and shared
// shell chrome. Domain identifiers (stage ids, document kinds, objection
// reasons/statuses) never change — only the label shown for each id changes
// with the selected language, via the lookup maps below.
export const uiText = {
  nav: {
    home: { en: 'Home', hi: 'होम' } as TranslationEntry,
    official: { en: 'Official', hi: 'अधिकारी' } as TranslationEntry,
    landowner: { en: 'Landowner', hi: 'भूमि मालिक' } as TranslationEntry,
    languageToggleLabel: { en: 'हिंदी', hi: 'English' } as TranslationEntry,
    dataSaverOnLabel: { en: 'Data Saver: On', hi: 'डेटा सेवर: चालू' } as TranslationEntry,
    dataSaverOffLabel: { en: 'Data Saver: Off', hi: 'डेटा सेवर: बंद' } as TranslationEntry,
  },
  notifications: {
    bellLabel: { en: 'Alerts', hi: 'सूचनाएं' } as TranslationEntry,
    panelTitle: { en: 'Alerts', hi: 'सूचनाएं' } as TranslationEntry,
    emptyState: { en: 'No alerts. Every parcel is on track.', hi: 'कोई सूचना नहीं। सभी भूखंड सही समय पर हैं।' } as TranslationEntry,
    loading: { en: 'Loading alerts…', hi: 'सूचनाएं लोड हो रही हैं…' } as TranslationEntry,
  },
  landing: {
    badge: { en: 'SIH26016 prototype', hi: 'SIH26016 प्रोटोटाइप' } as TranslationEntry,
    description: {
      en: 'A shared land acquisition workspace for officials and landowners, built to make parcel status, documents, objections, and next actions visible.',
      hi: 'अधिकारियों और भूमि मालिकों के लिए एक साझा भूमि अधिग्रहण मंच, जो भूखंड की स्थिति, दस्तावेज़, आपत्तियाँ और अगली कार्रवाई स्पष्ट रूप से दिखाता है।',
    } as TranslationEntry,
    officialTitle: { en: 'Official Dashboard', hi: 'अधिकारी डैशबोर्ड' } as TranslationEntry,
    officialDescription: {
      en: 'Monitor parcels, stages, stuck cases, and required documents.',
      hi: 'भूखंडों, चरणों, अटके मामलों और आवश्यक दस्तावेज़ों की निगरानी करें।',
    } as TranslationEntry,
    landownerTitle: { en: 'Landowner Portal', hi: 'भूमि मालिक पोर्टल' } as TranslationEntry,
    landownerDescription: {
      en: 'Search by survey number, track progress, and raise objections.',
      hi: 'सर्वे नंबर से खोजें, प्रगति देखें और आपत्ति दर्ज करें।',
    } as TranslationEntry,
    statWorkflowLabel: { en: 'Workflow stages', hi: 'कार्यप्रवाह चरण' } as TranslationEntry,
    statPortalsLabel: { en: 'Role portals', hi: 'भूमिका पोर्टल' } as TranslationEntry,
    statDemoLabel: { en: 'Demo survey', hi: 'डेमो सर्वे' } as TranslationEntry,
    foundationTitle: { en: 'Government-style workflow', hi: 'सरकारी शैली में कार्यप्रवाह' } as TranslationEntry,
    foundationBody: {
      en: 'The first implementation layer now provides a restrained shell, shared components, responsive navigation, and clear page structure for the remaining steps.',
      hi: 'यह पहला स्तर एक स्पष्ट ढांचा, साझा घटक, उत्तरदायी नेविगेशन और बाकी चरणों के लिए स्पष्ट पृष्ठ संरचना प्रदान करता है।',
    } as TranslationEntry,
    nextTitle: { en: 'Prepared for demo mode', hi: 'डेमो मोड के लिए तैयार' } as TranslationEntry,
    nextBody: {
      en: 'Step 2 can plug parcel records, history, documents, and objection states into the existing cards, tables, filters, and forms.',
      hi: 'अगला चरण भूखंड रिकॉर्ड, इतिहास, दस्तावेज़ और आपत्ति स्थितियों को मौजूदा कार्ड, तालिकाओं, फ़िल्टर और फॉर्म में जोड़ सकता है।',
    } as TranslationEntry,
  },
  landownerSearch: {
    eyebrow: { en: 'Landowner services', hi: 'भूमि मालिक सेवाएँ' } as TranslationEntry,
    title: { en: 'Track Acquisition Status', hi: 'अधिग्रहण स्थिति देखें' } as TranslationEntry,
    description: {
      en: 'Search your survey number to see the current stage, progress, compensation estimate, and documents for your parcel.',
      hi: 'अपने भूखंड का वर्तमान चरण, प्रगति, मुआवज़ा अनुमान और दस्तावेज़ देखने के लिए सर्वे नंबर खोजें।',
    } as TranslationEntry,
    cardEyebrow: { en: 'Survey lookup', hi: 'सर्वे खोज' } as TranslationEntry,
    cardTitle: { en: 'Find Your Parcel', hi: 'अपना भूखंड खोजें' } as TranslationEntry,
    fieldLabel: { en: 'Survey number', hi: 'सर्वे नंबर' } as TranslationEntry,
    placeholder: { en: 'Enter 124/7', hi: '124/7 दर्ज करें' } as TranslationEntry,
    hint: {
      en: 'Enter the survey number exactly as it appears on your notification.',
      hi: 'सर्वे नंबर वही दर्ज करें जो आपकी सूचना में दिखाया गया है।',
    } as TranslationEntry,
    searchButton: { en: 'Search', hi: 'खोजें' } as TranslationEntry,
    searching: { en: 'Searching…', hi: 'खोजा जा रहा है…' } as TranslationEntry,
    emptySurveyNumberError: { en: 'Enter a survey number to search.', hi: 'खोजने के लिए सर्वे नंबर दर्ज करें।' } as TranslationEntry,
    genericSearchError: {
      en: 'Could not search for this parcel. Try again.',
      hi: 'इस भूखंड को खोजा नहीं जा सका। कृपया पुनः प्रयास करें।',
    } as TranslationEntry,
  },
  landownerStatus: {
    eyebrow: { en: 'Landowner services', hi: 'भूमि मालिक सेवाएँ' } as TranslationEntry,
    title: { en: 'Parcel Status', hi: 'भूखंड की स्थिति' } as TranslationEntry,
    loading: { en: 'Loading parcel…', hi: 'भूखंड लोड हो रहा है…' } as TranslationEntry,
    notFoundTitle: { en: 'Parcel not found', hi: 'भूखंड नहीं मिला' } as TranslationEntry,
    notFoundDescription: {
      en: 'No parcel matches this id. Search again with your survey number.',
      hi: 'इस पहचान से कोई भूखंड नहीं मिला। अपने सर्वे नंबर से फिर से खोजें।',
    } as TranslationEntry,
    loadError: {
      en: 'Parcel data could not be loaded. Try reloading the page.',
      hi: 'भूखंड डेटा लोड नहीं हो सका। पृष्ठ फिर से लोड करें।',
    } as TranslationEntry,
    backToSearch: { en: 'Back to search', hi: 'खोज पर वापस जाएँ' } as TranslationEntry,
    searchAnother: { en: 'Search another parcel', hi: 'दूसरा भूखंड खोजें' } as TranslationEntry,
    overviewEyebrow: { en: 'Overview', hi: 'विवरण' } as TranslationEntry,
    overviewTitle: { en: 'Parcel Snapshot', hi: 'भूखंड सारांश' } as TranslationEntry,
    owner: { en: 'Owner', hi: 'मालिक' } as TranslationEntry,
    surveyNumber: { en: 'Survey number', hi: 'सर्वे नंबर' } as TranslationEntry,
    location: { en: 'Location', hi: 'स्थान' } as TranslationEntry,
    area: { en: 'Area', hi: 'क्षेत्रफल' } as TranslationEntry,
    compensationEstimate: { en: 'Compensation estimate', hi: 'मुआवज़ा अनुमान' } as TranslationEntry,
    statusEyebrow: { en: 'Status', hi: 'स्थिति' } as TranslationEntry,
    statusTitle: { en: 'Current Progress', hi: 'वर्तमान प्रगति' } as TranslationEntry,
    currentStage: { en: 'Current stage', hi: 'वर्तमान चरण' } as TranslationEntry,
    status: { en: 'Status', hi: 'स्थिति' } as TranslationEntry,
    actionRequired: { en: 'Action required', hi: 'आवश्यक कार्रवाई' } as TranslationEntry,
    actionRequiredNone: {
      en: 'No action needed right now — your parcel is ready to move to the next stage.',
      hi: 'अभी किसी कार्रवाई की आवश्यकता नहीं है — आपका भूखंड अगले चरण के लिए तैयार है।',
    } as TranslationEntry,
    actionRequiredFinalStage: {
      en: 'This parcel has completed every acquisition stage.',
      hi: 'इस भूखंड ने अधिग्रहण के सभी चरण पूरे कर लिए हैं।',
    } as TranslationEntry,
    actionRequiredMissingDocumentPrefix: {
      en: 'Missing required document:',
      hi: 'आवश्यक दस्तावेज़ लंबित:',
    } as TranslationEntry,
    actionRequiredOpenObjections: {
      en: 'Pending or under-review objections must be resolved before advancing.',
      hi: 'आगे बढ़ने से पहले लंबित या समीक्षाधीन आपत्तियों का निपटारा आवश्यक है।',
    } as TranslationEntry,
    workflowEyebrow: { en: 'Workflow', hi: 'कार्यप्रवाह' } as TranslationEntry,
    workflowTitle: { en: 'Acquisition Stages', hi: 'अधिग्रहण चरण' } as TranslationEntry,
    stepDone: { en: 'Done', hi: 'पूर्ण' } as TranslationEntry,
    stepInProgress: { en: 'In progress', hi: 'जारी' } as TranslationEntry,
    stepUpcoming: { en: 'Upcoming', hi: 'आगामी' } as TranslationEntry,
    documentsTitle: { en: 'Documents', hi: 'दस्तावेज़' } as TranslationEntry,
    documentsOnFile: { en: 'on file', hi: 'दर्ज' } as TranslationEntry,
    noDocumentsTitle: { en: 'No documents yet', hi: 'अभी तक कोई दस्तावेज़ नहीं' } as TranslationEntry,
    noDocumentsDescription: {
      en: 'No documents have been uploaded for this parcel yet.',
      hi: 'इस भूखंड के लिए अभी तक कोई दस्तावेज़ अपलोड नहीं किया गया है।',
    } as TranslationEntry,
    documentColStage: { en: 'Stage', hi: 'चरण' } as TranslationEntry,
    documentColKind: { en: 'Document', hi: 'दस्तावेज़' } as TranslationEntry,
    documentColTitle: { en: 'Title', hi: 'शीर्षक' } as TranslationEntry,
    documentColUploaded: { en: 'Uploaded', hi: 'अपलोड तिथि' } as TranslationEntry,
    documentColType: { en: 'Type', hi: 'प्रकार' } as TranslationEntry,
    documentsCaption: { en: 'Documents on file for this parcel', hi: 'इस भूखंड के लिए दर्ज दस्तावेज़' } as TranslationEntry,
    objectionFormEyebrow: { en: 'File a concern', hi: 'शिकायत दर्ज करें' } as TranslationEntry,
    objectionFormTitle: { en: 'Submit an Objection', hi: 'आपत्ति दर्ज करें' } as TranslationEntry,
    objectionReasonLabel: { en: 'Reason', hi: 'कारण' } as TranslationEntry,
    objectionDescriptionLabel: { en: 'Description', hi: 'विवरण' } as TranslationEntry,
    objectionDescriptionPlaceholder: {
      en: "Explain the issue with this parcel's acquisition.",
      hi: 'इस भूखंड के अधिग्रहण से जुड़ी समस्या बताएं।',
    } as TranslationEntry,
    objectionSubmit: { en: 'Submit objection', hi: 'आपत्ति भेजें' } as TranslationEntry,
    objectionSubmitting: { en: 'Submitting…', hi: 'भेजा जा रहा है…' } as TranslationEntry,
    objectionEmptyDescriptionError: {
      en: 'Describe the objection before submitting.',
      hi: 'भेजने से पहले आपत्ति का विवरण लिखें।',
    } as TranslationEntry,
    objectionGenericError: {
      en: 'Could not submit the objection. Try again.',
      hi: 'आपत्ति भेजी नहीं जा सकी। कृपया पुनः प्रयास करें।',
    } as TranslationEntry,
    objectionSubmittedPrefix: { en: 'Objection', hi: 'आपत्ति' } as TranslationEntry,
    objectionSubmittedSuffix: {
      en: 'submitted. It is Pending review.',
      hi: 'दर्ज हो गई है। यह समीक्षा हेतु लंबित है।',
    } as TranslationEntry,
    yourObjectionsTitle: { en: 'Your Objections', hi: 'आपकी आपत्तियाँ' } as TranslationEntry,
    objectionsFiled: { en: 'filed', hi: 'दर्ज' } as TranslationEntry,
    noObjectionsTitle: { en: 'No objections filed', hi: 'कोई आपत्ति दर्ज नहीं' } as TranslationEntry,
    noObjectionsDescription: {
      en: 'You have not filed any objections for this parcel.',
      hi: 'आपने इस भूखंड के लिए कोई आपत्ति दर्ज नहीं की है।',
    } as TranslationEntry,
    objectionColId: { en: 'ID', hi: 'आईडी' } as TranslationEntry,
    objectionColSubmitted: { en: 'Submitted', hi: 'दर्ज तिथि' } as TranslationEntry,
    objectionColReason: { en: 'Reason', hi: 'कारण' } as TranslationEntry,
    objectionColDescription: { en: 'Description', hi: 'विवरण' } as TranslationEntry,
    objectionColStatus: { en: 'Status', hi: 'स्थिति' } as TranslationEntry,
    objectionsCaption: { en: 'Objections filed for this parcel', hi: 'इस भूखंड के लिए दर्ज आपत्तियाँ' } as TranslationEntry,
    calculatorEyebrow: { en: 'Illustrative only', hi: 'केवल संकेतात्मक' } as TranslationEntry,
    calculatorTitle: { en: 'Compensation Calculator', hi: 'मुआवज़ा कैलकुलेटर' } as TranslationEntry,
    calculatorDisclaimer: {
      en: 'This is a rough, illustrative estimate for demo purposes only. It is not an official valuation or compensation determination.',
      hi: 'यह केवल प्रदर्शन हेतु एक अनुमानित संकेतात्मक गणना है। यह कोई आधिकारिक मूल्यांकन या मुआवज़ा निर्धारण नहीं है।',
    } as TranslationEntry,
    calculatorAreaLabel: { en: 'Area (hectares)', hi: 'क्षेत्रफल (हेक्टेयर)' } as TranslationEntry,
    calculatorRateLabel: { en: 'Base rate per hectare (₹)', hi: 'प्रति हेक्टेयर आधार दर (₹)' } as TranslationEntry,
    calculatorFactorLabel: { en: 'Additional benefits multiplier', hi: 'अतिरिक्त लाभ गुणक' } as TranslationEntry,
    calculatorFactorHint: {
      en: 'Illustrative multiplier for solatium and other additional benefits.',
      hi: 'सांत्वना राशि और अन्य अतिरिक्त लाभों के लिए संकेतात्मक गुणक।',
    } as TranslationEntry,
    calculatorResultLabel: { en: 'Illustrative estimate', hi: 'संकेतात्मक अनुमान' } as TranslationEntry,
  },
  speech: {
    listen: { en: 'Listen', hi: 'सुनें' } as TranslationEntry,
    stop: { en: 'Stop', hi: 'रोकें' } as TranslationEntry,
    unavailable: { en: 'Voice playback is not available on this device.', hi: 'इस डिवाइस पर आवाज़ सुविधा उपलब्ध नहीं है।' } as TranslationEntry,
  },
  sms: {
    triggerLabel: { en: 'Notify Landowner (SMS)', hi: 'भूमि मालिक को सूचित करें (SMS)' } as TranslationEntry,
    previewTitle: { en: 'Message preview', hi: 'संदेश पूर्वावलोकन' } as TranslationEntry,
    sentBadge: {
      en: 'Sent ✓ (simulated, not a real message)',
      hi: 'भेजा गया ✓ (सिम्युलेटेड, वास्तविक संदेश नहीं)',
    } as TranslationEntry,
    sentAtPrefix: { en: 'at', hi: 'समय' } as TranslationEntry,
  },
  voiceInput: {
    speak: { en: 'Speak survey number', hi: 'सर्वे नंबर बोलें' } as TranslationEntry,
    listening: { en: 'Listening…', hi: 'सुन रहा है…' } as TranslationEntry,
    unsupported: {
      en: 'Voice input is not supported in this browser. Please type the survey number instead.',
      hi: 'इस ब्राउज़र में आवाज़ इनपुट उपलब्ध नहीं है। कृपया सर्वे नंबर टाइप करें।',
    } as TranslationEntry,
    notHeard: {
      en: 'Could not hear a survey number clearly. Try again or type it instead.',
      hi: 'सर्वे नंबर स्पष्ट रूप से सुनाई नहीं दिया। पुनः प्रयास करें या टाइप करें।',
    } as TranslationEntry,
  },
};

export const stageLabels: Record<StageId, TranslationEntry> = {
  notification: { en: 'Notification', hi: 'अधिसूचना' },
  survey: { en: 'Joint Survey', hi: 'संयुक्त सर्वेक्षण' },
  objection_review: { en: 'Objection Review', hi: 'आपत्ति समीक्षा' },
  valuation: { en: 'Valuation', hi: 'मूल्यांकन' },
  compensation_approval: { en: 'Compensation Approval', hi: 'मुआवज़ा स्वीकृति' },
  award: { en: 'Award', hi: 'पुरस्कार' },
  possession: { en: 'Possession Handover', hi: 'कब्ज़ा हस्तांतरण' },
};

export const stageShortLabels: Record<StageId, TranslationEntry> = {
  notification: { en: 'Notice', hi: 'सूचना' },
  survey: { en: 'Survey', hi: 'सर्वेक्षण' },
  objection_review: { en: 'Objections', hi: 'आपत्ति' },
  valuation: { en: 'Value', hi: 'मूल्य' },
  compensation_approval: { en: 'Approval', hi: 'स्वीकृति' },
  award: { en: 'Award', hi: 'पुरस्कार' },
  possession: { en: 'Possession', hi: 'कब्ज़ा' },
};

export const documentKindLabels: Record<DocumentKind, TranslationEntry> = {
  section_11_notification: { en: 'Section 11 notification', hi: 'धारा 11 अधिसूचना' },
  joint_survey_sketch: { en: 'Joint survey sketch', hi: 'संयुक्त सर्वेक्षण रेखाचित्र' },
  ownership_record: { en: 'Ownership record extract', hi: 'स्वामित्व अभिलेख उद्धरण' },
  objection_hearing_minutes: { en: 'Objection hearing minutes', hi: 'आपत्ति सुनवाई कार्यवृत्त' },
  valuation_report: { en: 'Valuation report', hi: 'मूल्यांकन रिपोर्ट' },
  compensation_statement: { en: 'Compensation approval statement', hi: 'मुआवज़ा स्वीकृति विवरण' },
  award_order: { en: 'Award order', hi: 'पुरस्कार आदेश' },
  possession_memo: { en: 'Possession handover memo', hi: 'कब्ज़ा हस्तांतरण ज्ञापन' },
};

export const objectionReasonLabels: Record<ObjectionReason, TranslationEntry> = {
  ownership: { en: 'Ownership dispute', hi: 'स्वामित्व विवाद' },
  measurement: { en: 'Measurement error', hi: 'माप त्रुटि' },
  valuation: { en: 'Valuation objection', hi: 'मूल्यांकन आपत्ति' },
  compensation: { en: 'Compensation dispute', hi: 'मुआवज़ा विवाद' },
  other: { en: 'Other', hi: 'अन्य' },
};

export const objectionStatusLabels: Record<ObjectionStatus, TranslationEntry> = {
  pending: { en: 'Pending', hi: 'लंबित' },
  under_review: { en: 'Under Review', hi: 'समीक्षाधीन' },
  resolved: { en: 'Resolved', hi: 'हल हो गया' },
};

export const dashboardStatusLabels: Record<DashboardStatus, TranslationEntry> = {
  stuck: { en: 'Stuck', hi: 'अटका हुआ' },
  blocked: { en: 'Blocked', hi: 'रुका हुआ' },
  complete: { en: 'Complete', hi: 'पूर्ण' },
  ready_to_advance: { en: 'Ready to advance', hi: 'आगे बढ़ने के लिए तैयार' },
  on_track: { en: 'On track', hi: 'सही समय पर' },
};
