import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CapabilityModal } from '../components/landing/CapabilityModal';
import { LandingNav } from '../components/landing/LandingNav';
import { Reveal, RevealLine } from '../components/landing/Reveal';
import { StageWalk, type WalkStage } from '../components/landing/StageWalk';
import { ACQUISITION_STAGES } from '../domain';
import { useLanguage } from '../i18n/LanguageContext';
import { stageLabels, stageShortLabels, uiText } from '../i18n/translations';
import '../styles/landing.css';
import { useTheme } from '../theme/ThemeContext';

const STEP_BODY_BY_STAGE_ID: Record<string, keyof typeof uiText.landing> = {
  notification: 'stepNotificationBody',
  survey: 'stepSurveyBody',
  objection_review: 'stepObjectionBody',
  valuation: 'stepValuationBody',
  compensation_approval: 'stepApprovalBody',
  award: 'stepAwardBody',
  possession: 'stepPossessionBody',
};

const CAPABILITIES = [
  { titleKey: 'capabilityAccessTitle', bodyKey: 'capabilityAccessBody', detailKey: 'capabilityAccessDetail' },
  {
    titleKey: 'capabilityVerificationTitle',
    bodyKey: 'capabilityVerificationBody',
    detailKey: 'capabilityVerificationDetail',
  },
  { titleKey: 'capabilityRiskTitle', bodyKey: 'capabilityRiskBody', detailKey: 'capabilityRiskDetail' },
  { titleKey: 'capabilityReportsTitle', bodyKey: 'capabilityReportsBody', detailKey: 'capabilityReportsDetail' },
  { titleKey: 'capabilityAuditTitle', bodyKey: 'capabilityAuditBody', detailKey: 'capabilityAuditDetail' },
  {
    titleKey: 'capabilityTimelineTitle',
    bodyKey: 'capabilityTimelineBody',
    detailKey: 'capabilityTimelineDetail',
  },
] as const satisfies ReadonlyArray<{
  titleKey: keyof typeof uiText.landing;
  bodyKey: keyof typeof uiText.landing;
  detailKey: keyof typeof uiText.landing;
}>;

export function LandingPage() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  const [activeCapabilityIndex, setActiveCapabilityIndex] = useState<number | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const copy = language === 'hi'
    ? {
        eyebrow: 'लोग · भूमि · एक बेहतर कल', headlineStart: 'भूमि अधिग्रहण,', headlineEnd: 'लोगों को केंद्र में रखकर।',
        heroDescription: 'हर चरण में भूमि मालिकों और लोक अधिकारियों के लिए स्पष्ट जानकारी, जवाबदेह प्रक्रियाएँ और सुलभ सहायता।',
        trackCase: 'अपना भूमि मामला देखें', exploreServices: 'सेवाएँ देखें', choosePortal: 'अपना पोर्टल चुनें',
        portalDescription: 'अपनी भूमिका के अनुरूप सेवाएँ, जानकारी और सहायता प्राप्त करें।', landowners: 'भूमि मालिकों के लिए',
        landownersDescription: 'मामले, सूचनाएँ, दस्तावेज़ और मुआवज़े की जानकारी देखें।', officials: 'अधिकारियों के लिए',
        officialsDescription: 'मामलों का प्रबंधन करें, रिकॉर्ड अपडेट करें और कार्यप्रवाह की कार्रवाई करें।', about: 'भूमिसेतु के बारे में',
        aboutHeading: 'पारदर्शी लोक सेवा के लिए निर्मित', aboutDescription: 'भूमिसेतु भूमि अधिग्रहण की जानकारी, मामले की सहायता और जवाबदेह कार्यप्रवाह को एक सुलभ सेवा में साथ लाता है।',
        notices: 'सूचनाएँ और अपडेट', noticesDescription: 'अधिसूचनाओं, सुनवाई और मामले के महत्वपूर्ण बदलावों की समय पर जानकारी।',
        documents: 'दस्तावेज़ सहायता', documentsDescription: 'हर अधिग्रहण चरण में स्पष्ट आवश्यकताएँ और सत्यापन।', compensation: 'मुआवज़ा ट्रैकिंग', compensationDescription: 'मुआवज़े और पुनर्वास चरणों की स्थिति देखें।',
        getAnswers: 'जवाब पाएँ', faqHeading: 'अक्सर पूछे जाने वाले प्रश्न', faqDescription: 'साइन इन करने, आपत्ति दर्ज करने या केस रिकॉर्ड देखने से पहले उपयोगी जानकारी।',
        footer: 'भूमि अधिग्रहण और पुनर्वास पोर्टल',
      }
    : language === 'mr' ? {
        eyebrow: 'लोक · जमीन · उज्ज्वल उद्यासाठी', headlineStart: 'जमीन संपादन,', headlineEnd: 'लोकांना केंद्रस्थानी ठेवून।', heroDescription: 'प्रत्येक टप्प्यावर जमीनमालक आणि अधिकाऱ्यांसाठी स्पष्ट माहिती व सुलभ मदत।', trackCase: 'जमीन प्रकरण पहा', exploreServices: 'सेवा पहा', choosePortal: 'तुमचे पोर्टल निवडा', portalDescription: 'तुमच्या भूमिकेनुसार सेवा, माहिती आणि मदत मिळवा।', landowners: 'जमीनमालकांसाठी', landownersDescription: 'प्रकरणे, सूचना, दस्तऐवज आणि भरपाई तपशील पहा।', officials: 'अधिकाऱ्यांसाठी', officialsDescription: 'प्रकरणे व्यवस्थापित करा आणि नोंदी अद्ययावत करा।', about: 'भूमिसेतुबद्दल', aboutHeading: 'पारदर्शक सार्वजनिक सेवेसाठी निर्मित', aboutDescription: 'भूमिसेतु जमीन संपादनाची माहिती व जबाबदार कार्यप्रवाह एकाच सुलभ सेवेत आणते।', notices: 'सूचना व अद्यतने', noticesDescription: 'महत्त्वाच्या बदलांची वेळेवर माहिती।', documents: 'दस्तऐवज मदत', documentsDescription: 'प्रत्येक टप्प्यावर स्पष्ट आवश्यकता व पडताळणी।', compensation: 'भरपाईचा मागोवा', compensationDescription: 'भरपाई व पुनर्वसनाची स्थिती पहा।', getAnswers: 'उत्तरे मिळवा', faqHeading: 'वारंवार विचारले जाणारे प्रश्न', faqDescription: 'साइन इन करण्यापूर्वी उपयुक्त माहिती।', footer: 'जमीन संपादन व पुनर्वसन पोर्टल',
      } : language === 'bn' ? {
        eyebrow: 'মানুষ · জমি · উজ্জ্বল আগামীকাল', headlineStart: 'ভূমি অধিগ্রহণ,', headlineEnd: 'মানুষকে কেন্দ্রে রেখে।', heroDescription: 'প্রতিটি ধাপে জমির মালিক ও কর্মকর্তাদের জন্য স্পষ্ট তথ্য এবং সহজ সহায়তা।', trackCase: 'জমির মামলার অবস্থা দেখুন', exploreServices: 'পরিষেবা দেখুন', choosePortal: 'আপনার পোর্টাল বেছে নিন', portalDescription: 'আপনার ভূমিকা অনুযায়ী পরিষেবা, তথ্য ও সহায়তা পান।', landowners: 'জমির মালিকদের জন্য', landownersDescription: 'মামলা, বিজ্ঞপ্তি, নথি ও ক্ষতিপূরণের তথ্য দেখুন।', officials: 'কর্মকর্তাদের জন্য', officialsDescription: 'মামলা পরিচালনা করুন ও নথি হালনাগাদ করুন।', about: 'ভূমিসেতু সম্পর্কে', aboutHeading: 'স্বচ্ছ জনসেবার জন্য নির্মিত', aboutDescription: 'ভূমিসেতু ভূমি অধিগ্রহণের তথ্য ও জবাবদিহিমূলক কর্মপ্রবাহকে একটি সহজ পরিষেবায় আনে।', notices: 'বিজ্ঞপ্তি ও আপডেট', noticesDescription: 'গুরুত্বপূর্ণ পরিবর্তনের সময়মতো তথ্য।', documents: 'নথি সহায়তা', documentsDescription: 'প্রতিটি ধাপে স্পষ্ট প্রয়োজন ও যাচাই।', compensation: 'ক্ষতিপূরণ ট্র্যাকিং', compensationDescription: 'ক্ষতিপূরণ ও পুনর্বাসনের অবস্থা দেখুন।', getAnswers: 'উত্তর পান', faqHeading: 'সচরাচর জিজ্ঞাস্য প্রশ্ন', faqDescription: 'সাইন ইন করার আগে দরকারী তথ্য।', footer: 'ভূমি অধিগ্রহণ ও পুনর্বাসন পোর্টাল',
      } : language === 'te' ? {
        eyebrow: 'ప్రజలు · భూమి · ఉజ్వల రేపటి కోసం', headlineStart: 'భూసేకరణ,', headlineEnd: 'ప్రజలను కేంద్రంగా ఉంచి।', heroDescription: 'ప్రతి దశలో భూస్వాములు మరియు అధికారులకు స్పష్టమైన సమాచారం, సులభమైన సహాయం।', trackCase: 'భూమి కేసు చూడండి', exploreServices: 'సేవలను చూడండి', choosePortal: 'మీ పోర్టల్‌ను ఎంచుకోండి', portalDescription: 'మీ పాత్రకు అనుగుణంగా సేవలు, సమాచారం మరియు సహాయం పొందండి।', landowners: 'భూస్వాముల కోసం', landownersDescription: 'కేసులు, నోటీసులు, పత్రాలు మరియు పరిహార వివరాలు చూడండి।', officials: 'అధికారుల కోసం', officialsDescription: 'కేసులను నిర్వహించి రికార్డులను నవీకరించండి।', about: 'భూమిసేతు గురించి', aboutHeading: 'పారదర్శక ప్రజా సేవ కోసం నిర్మించబడింది', aboutDescription: 'భూమిసేతు భూసేకరణ సమాచారం మరియు జవాబుదారీతనపు ప్రక్రియలను ఒకే సులభ సేవలో అందిస్తుంది।', notices: 'నోటీసులు మరియు నవీకరణలు', noticesDescription: 'ముఖ్యమైన మార్పులపై సకాలంలో సమాచారం।', documents: 'పత్రాల సహాయం', documentsDescription: 'ప్రతి దశలో స్పష్టమైన అవసరాలు మరియు ధృవీకరణ।', compensation: 'పరిహార ట్రాకింగ్', compensationDescription: 'పరిహారం మరియు పునరావాస స్థితిని చూడండి।', getAnswers: 'సమాధానాలు పొందండి', faqHeading: 'తరచుగా అడిగే ప్రశ్నలు', faqDescription: 'సైన్ ఇన్ చేయడానికి ముందు ఉపయోగకరమైన సమాచారం।', footer: 'భూసేకరణ మరియు పునరావాస పోర్టల్',
      } : language === 'ta' ? {
        eyebrow: 'மக்கள் · நிலம் · ஒளிமயமான நாளை', headlineStart: 'நிலம் கையகப்படுத்துதல்,', headlineEnd: 'மக்களை மையமாகக் கொண்டு।', heroDescription: 'ஒவ்வொரு கட்டத்திலும் நில உரிமையாளர்கள் மற்றும் அதிகாரிகளுக்கான தெளிவான தகவலும் எளிய உதவியும்।', trackCase: 'நில வழக்கைக் காண்க', exploreServices: 'சேவைகளைக் காண்க', choosePortal: 'உங்கள் போர்டலைத் தேர்ந்தெடுக்கவும்', portalDescription: 'உங்கள் பங்கிற்கு ஏற்ற சேவை, தகவல் மற்றும் உதவியைப் பெறுங்கள்।', landowners: 'நில உரிமையாளர்களுக்கு', landownersDescription: 'வழக்குகள், அறிவிப்புகள் மற்றும் இழப்பீட்டு விவரங்களைக் காண்க।', officials: 'அதிகாரிகளுக்கு', officialsDescription: 'வழக்குகளை நிர்வகித்து பதிவுகளைப் புதுப்பிக்கவும்।', about: 'பூமிசேது பற்றி', aboutHeading: 'வெளிப்படையான பொதுச் சேவைக்காக உருவாக்கப்பட்டது', aboutDescription: 'பூமிசேது நிலக் கையகப்படுத்தல் தகவலையும் பொறுப்பான பணிப்பாய்வையும் ஒரே எளிய சேவையில் இணைக்கிறது।', notices: 'அறிவிப்புகள் மற்றும் புதுப்பிப்புகள்', noticesDescription: 'முக்கிய மாற்றங்களின் சரியான நேரத் தகவல்।', documents: 'ஆவண உதவி', documentsDescription: 'ஒவ்வொரு கட்டத்திலும் தெளிவான தேவைகளும் சரிபார்ப்பும்।', compensation: 'இழப்பீட்டுக் கண்காணிப்பு', compensationDescription: 'இழப்பீடு மற்றும் மறுவாழ்வு நிலையைப் பார்க்கவும்।', getAnswers: 'பதில்களைப் பெறுங்கள்', faqHeading: 'அடிக்கடி கேட்கப்படும் கேள்விகள்', faqDescription: 'உள்நுழைவதற்கு முன் பயனுள்ள தகவல்।', footer: 'நிலக் கையகப்படுத்தல் மற்றும் மறுவாழ்வு போர்டல்',
      } : language === 'gu' ? {
        eyebrow: 'લોકો · જમીન · ઉજ્જવળ આવતીકાલ', headlineStart: 'જમીન સંપાદન,', headlineEnd: 'લોકોને કેન્દ્રમાં રાખીને।', heroDescription: 'દરેક તબક્કે જમીનમાલિકો અને અધિકારીઓ માટે સ્પષ્ટ માહિતી અને સરળ સહાય।', trackCase: 'જમીન કેસ જુઓ', exploreServices: 'સેવાઓ જુઓ', choosePortal: 'તમારું પોર્ટલ પસંદ કરો', portalDescription: 'તમારી ભૂમિકા માટે સેવાઓ, માહિતી અને સહાય મેળવો।', landowners: 'જમીનમાલિકો માટે', landownersDescription: 'કેસ, સૂચનાઓ, દસ્તાવેજો અને વળતરની વિગતો જુઓ।', officials: 'અધિકારીઓ માટે', officialsDescription: 'કેસ સંચાલિત કરો અને રેકોર્ડ અપડેટ કરો।', about: 'ભૂમિસેતુ વિશે', aboutHeading: 'પારદર્શક જાહેર સેવા માટે બનાવેલ', aboutDescription: 'ભૂમિસેતુ જમીન સંપાદનની માહિતી અને જવાબદાર કાર્યપ્રવાહને એક સરળ સેવામાં લાવે છે।', notices: 'સૂચનાઓ અને અપડેટ', noticesDescription: 'મહત્વપૂર્ણ ફેરફારોની સમયસર માહિતી।', documents: 'દસ્તાવેજ સહાય', documentsDescription: 'દરેક તબક્કે સ્પષ્ટ જરૂરિયાતો અને ચકાસણી।', compensation: 'વળતર ટ્રેકિંગ', compensationDescription: 'વળતર અને પુનર્વસનની સ્થિતિ જુઓ।', getAnswers: 'જવાબો મેળવો', faqHeading: 'વારંવાર પૂછાતા પ્રશ્નો', faqDescription: 'સાઇન ઇન કરતા પહેલાં ઉપયોગી માહિતી।', footer: 'જમીન સંપાદન અને પુનર્વસન પોર્ટલ',
      } : language === 'kn' ? {
        eyebrow: 'ಜನರು · ಭೂಮಿ · ಉಜ್ವಲ ನಾಳೆ', headlineStart: 'ಭೂಸ್ವಾಧೀನ,', headlineEnd: 'ಜನರನ್ನು ಕೇಂದ್ರವಾಗಿರಿಸಿ।', heroDescription: 'ಪ್ರತಿ ಹಂತದಲ್ಲಿ ಭೂಮಾಲೀಕರು ಮತ್ತು ಅಧಿಕಾರಿಗಳಿಗೆ ಸ್ಪಷ್ಟ ಮಾಹಿತಿ ಮತ್ತು ಸುಲಭ ಸಹಾಯ।', trackCase: 'ಭೂಮಿ ಪ್ರಕರಣ ನೋಡಿ', exploreServices: 'ಸೇವೆಗಳನ್ನು ನೋಡಿ', choosePortal: 'ನಿಮ್ಮ ಪೋರ್ಟಲ್ ಆಯ್ಕೆಮಾಡಿ', portalDescription: 'ನಿಮ್ಮ ಪಾತ್ರಕ್ಕೆ ಸೂಕ್ತವಾದ ಸೇವೆ, ಮಾಹಿತಿ ಮತ್ತು ಸಹಾಯ ಪಡೆಯಿರಿ।', landowners: 'ಭೂಮಾಲೀಕರಿಗಾಗಿ', landownersDescription: 'ಪ್ರಕರಣಗಳು, ಸೂಚನೆಗಳು, ದಾಖಲೆಗಳು ಮತ್ತು ಪರಿಹಾರ ವಿವರ ನೋಡಿ।', officials: 'ಅಧಿಕಾರಿಗಳಿಗಾಗಿ', officialsDescription: 'ಪ್ರಕರಣ ನಿರ್ವಹಿಸಿ ಮತ್ತು ದಾಖಲೆ ನವೀಕರಿಸಿ।', about: 'ಭೂಮಿಸೇತು ಕುರಿತು', aboutHeading: 'ಪಾರದರ್ಶಕ ಸಾರ್ವಜನಿಕ ಸೇವೆಗಾಗಿ ನಿರ್ಮಿತ', aboutDescription: 'ಭೂಮಿಸೇತು ಭೂಸ್ವಾಧೀನ ಮಾಹಿತಿ ಮತ್ತು ಹೊಣೆಗಾರ ಕಾರ್ಯಪ್ರವಾಹವನ್ನು ಒಂದೇ ಸುಲಭ ಸೇವೆಗೆ ತರುತ್ತದೆ।', notices: 'ಸೂಚನೆಗಳು ಮತ್ತು ನವೀಕರಣಗಳು', noticesDescription: 'ಮುಖ್ಯ ಬದಲಾವಣೆಗಳ ಸಕಾಲಿಕ ಮಾಹಿತಿ।', documents: 'ದಾಖಲೆ ಸಹಾಯ', documentsDescription: 'ಪ್ರತಿ ಹಂತದಲ್ಲಿ ಸ್ಪಷ್ಟ ಅಗತ್ಯತೆ ಮತ್ತು ಪರಿಶೀಲನೆ।', compensation: 'ಪರಿಹಾರ ಟ್ರ್ಯಾಕಿಂಗ್', compensationDescription: 'ಪರಿಹಾರ ಮತ್ತು ಪುನರ್ವಸತಿ ಸ್ಥಿತಿ ನೋಡಿ।', getAnswers: 'ಉತ್ತರಗಳನ್ನು ಪಡೆಯಿರಿ', faqHeading: 'ಪದೇ ಪದೇ ಕೇಳುವ ಪ್ರಶ್ನೆಗಳು', faqDescription: 'ಸೈನ್ ಇನ್ ಮಾಡುವ ಮೊದಲು ಉಪಯುಕ್ತ ಮಾಹಿತಿ।', footer: 'ಭೂಸ್ವಾಧೀನ ಮತ್ತು ಪುನರ್ವಸತಿ ಪೋರ್ಟಲ್',
      } : language === 'or' ? {
        eyebrow: 'ଲୋକ · ଜମି · ଉଜ୍ଜ୍ୱଳ ଆସନ୍ତାକାଲି', headlineStart: 'ଭୂମି ଅଧିଗ୍ରହଣ,', headlineEnd: 'ଲୋକମାନଙ୍କୁ କେନ୍ଦ୍ରରେ ରଖି।', heroDescription: 'ପ୍ରତ୍ୟେକ ପର୍ଯ୍ୟାୟରେ ଜମି ମାଲିକ ଓ ଅଧିକାରୀଙ୍କ ପାଇଁ ସ୍ପଷ୍ଟ ସୂଚନା ଏବଂ ସହଜ ସହାୟତା।', trackCase: 'ଜମି ମାମଲା ଦେଖନ୍ତୁ', exploreServices: 'ସେବା ଦେଖନ୍ତୁ', choosePortal: 'ଆପଣଙ୍କ ପୋର୍ଟାଲ ବାଛନ୍ତୁ', portalDescription: 'ଆପଣଙ୍କ ଭୂମିକା ଅନୁଯାୟୀ ସେବା ଓ ସହାୟତା ପାଆନ୍ତୁ।', landowners: 'ଜମି ମାଲିକଙ୍କ ପାଇଁ', landownersDescription: 'ମାମଲା, ସୂଚନା ଓ କ୍ଷତିପୂରଣ ବିବରଣୀ ଦେଖନ୍ତୁ।', officials: 'ଅଧିକାରୀଙ୍କ ପାଇଁ', officialsDescription: 'ମାମଲା ପରିଚାଳନା କରନ୍ତୁ ଏବଂ ରେକର୍ଡ ଅପଡେଟ କରନ୍ତୁ।', about: 'ଭୂମିସେତୁ ବିଷୟରେ', aboutHeading: 'ସ୍ୱଚ୍ଛ ସାର୍ବଜନୀନ ସେବା ପାଇଁ ନିର୍ମିତ', aboutDescription: 'ଭୂମିସେତୁ ଭୂମି ଅଧିଗ୍ରହଣ ସୂଚନା ଓ ଉତ୍ତରଦାୟୀ କାର୍ଯ୍ୟପ୍ରବାହକୁ ଏକ ସହଜ ସେବାରେ ଆଣେ।', notices: 'ସୂଚନା ଏବଂ ଅପଡେଟ', noticesDescription: 'ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପରିବର୍ତ୍ତନର ସମୟୋଚିତ ସୂଚନା।', documents: 'ଦଲିଲ ସହାୟତା', documentsDescription: 'ପ୍ରତ୍ୟେକ ପର୍ଯ୍ୟାୟରେ ସ୍ପଷ୍ଟ ଆବଶ୍ୟକତା ଏବଂ ଯାଞ୍ଚ।', compensation: 'କ୍ଷତିପୂରଣ ଟ୍ରାକିଂ', compensationDescription: 'କ୍ଷତିପୂରଣ ଓ ପୁନର୍ବାସ ସ୍ଥିତି ଦେଖନ୍ତୁ।', getAnswers: 'ଉତ୍ତର ପାଆନ୍ତୁ', faqHeading: 'ବାରମ୍ବାର ପଚରାଯାଉଥିବା ପ୍ରଶ୍ନ', faqDescription: 'ସାଇନ ଇନ ପୂର୍ବରୁ ଉପଯୋଗୀ ସୂଚନା।', footer: 'ଭୂମି ଅଧିଗ୍ରହଣ ଏବଂ ପୁନର୍ବାସ ପୋର୍ଟାଲ',
      } : language === 'pa' ? {
        eyebrow: 'ਲੋਕ · ਜ਼ਮੀਨ · ਰੌਸ਼ਨ ਕੱਲ੍ਹ', headlineStart: 'ਜ਼ਮੀਨ ਅਧਿਗ੍ਰਹਿਣ,', headlineEnd: 'ਲੋਕਾਂ ਨੂੰ ਕੇਂਦਰ ਵਿੱਚ ਰੱਖ ਕੇ।', heroDescription: 'ਹਰ ਪੜਾਅ ਉੱਤੇ ਜ਼ਮੀਨ ਮਾਲਕਾਂ ਅਤੇ ਅਧਿਕਾਰੀਆਂ ਲਈ ਸਪੱਸ਼ਟ ਜਾਣਕਾਰੀ ਅਤੇ ਸੌਖੀ ਮਦਦ।', trackCase: 'ਜ਼ਮੀਨ ਮਾਮਲਾ ਵੇਖੋ', exploreServices: 'ਸੇਵਾਵਾਂ ਵੇਖੋ', choosePortal: 'ਆਪਣਾ ਪੋਰਟਲ ਚੁਣੋ', portalDescription: 'ਆਪਣੀ ਭੂਮਿਕਾ ਅਨੁਸਾਰ ਸੇਵਾਵਾਂ, ਜਾਣਕਾਰੀ ਅਤੇ ਮਦਦ ਪ੍ਰਾਪਤ ਕਰੋ।', landowners: 'ਜ਼ਮੀਨ ਮਾਲਕਾਂ ਲਈ', landownersDescription: 'ਮਾਮਲੇ, ਸੂਚਨਾਵਾਂ, ਦਸਤਾਵੇਜ਼ ਅਤੇ ਮੁਆਵਜ਼ੇ ਦੇ ਵੇਰਵੇ ਵੇਖੋ।', officials: 'ਅਧਿਕਾਰੀਆਂ ਲਈ', officialsDescription: 'ਮਾਮਲੇ ਸੰਭਾਲੋ ਅਤੇ ਰਿਕਾਰਡ ਅਪਡੇਟ ਕਰੋ।', about: 'ਭੂਮਿਸੇਤੂ ਬਾਰੇ', aboutHeading: 'ਪਾਰਦਰਸ਼ੀ ਜਨਤਕ ਸੇਵਾ ਲਈ ਬਣਾਇਆ', aboutDescription: 'ਭੂਮਿਸੇਤੂ ਜ਼ਮੀਨ ਅਧਿਗ੍ਰਹਿਣ ਦੀ ਜਾਣਕਾਰੀ ਅਤੇ ਜਵਾਬਦੇਹ ਕਾਰਜ-ਪ੍ਰਵਾਹ ਨੂੰ ਇੱਕ ਸੌਖੀ ਸੇਵਾ ਵਿੱਚ ਲਿਆਉਂਦਾ ਹੈ।', notices: 'ਸੂਚਨਾਵਾਂ ਅਤੇ ਅਪਡੇਟ', noticesDescription: 'ਮਹੱਤਵਪੂਰਨ ਬਦਲਾਵਾਂ ਦੀ ਸਮੇਂ ਸਿਰ ਜਾਣਕਾਰੀ।', documents: 'ਦਸਤਾਵੇਜ਼ ਸਹਾਇਤਾ', documentsDescription: 'ਹਰ ਪੜਾਅ ਉੱਤੇ ਸਪੱਸ਼ਟ ਲੋੜਾਂ ਅਤੇ ਤਸਦੀਕ।', compensation: 'ਮੁਆਵਜ਼ਾ ਟ੍ਰੈਕਿੰਗ', compensationDescription: 'ਮੁਆਵਜ਼ੇ ਅਤੇ ਪੁਨਰਵਾਸ ਦੀ ਸਥਿਤੀ ਵੇਖੋ।', getAnswers: 'ਜਵਾਬ ਪਾਓ', faqHeading: 'ਅਕਸਰ ਪੁੱਛੇ ਜਾਂਦੇ ਸਵਾਲ', faqDescription: 'ਸਾਈਨ ਇਨ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਲਾਭਦਾਇਕ ਜਾਣਕਾਰੀ।', footer: 'ਜ਼ਮੀਨ ਅਧਿਗ੍ਰਹਿਣ ਅਤੇ ਪੁਨਰਵਾਸ ਪੋਰਟਲ',
      } : {
        eyebrow: 'People · Land · A brighter tomorrow', headlineStart: 'Land acquisition,', headlineEnd: 'with people at the centre.',
        heroDescription: 'Clear information, accountable processes and accessible support for landowners and public officials at every stage.',
        trackCase: 'Track your land case', exploreServices: 'Explore services', choosePortal: 'Choose your portal',
        portalDescription: 'Access services, information and support suited to your role.', landowners: 'For Landowners',
        landownersDescription: 'Track cases, notices, documents and compensation details.', officials: 'For Officials',
        officialsDescription: 'Manage cases, update records and take workflow actions.', about: 'About BhoomiSetu',
        aboutHeading: 'Built for transparent public service', aboutDescription: 'BhoomiSetu brings land acquisition information, case support and accountable workflows together in one accessible service.',
        notices: 'Notice & updates', noticesDescription: 'Timely information on notifications, hearings and key case changes.',
        documents: 'Document support', documentsDescription: 'Clear requirements and verification at each acquisition stage.', compensation: 'Compensation tracking', compensationDescription: 'Follow the status of compensation and rehabilitation steps.',
        getAnswers: 'Get answers', faqHeading: 'Frequently asked questions', faqDescription: 'Useful information before you sign in, file an objection or review a case record.',
        footer: 'Land Acquisition & Rehabilitation Portal',
      };

  const faqQuestions: Record<string, string[]> = {
    mr: ['माझ्या जमीन संपादन प्रकरणाची स्थिती कशी पाहू?', 'दाव्यासाठी कोणती कागदपत्रे आवश्यक आहेत?', 'भरपाई कशी ठरवली जाते?', 'मी संपादनावर हरकत नोंदवू शकतो का?', 'मदत कुठे मिळेल?'],
    bn: ['আমি কীভাবে আমার ভূমি অধিগ্রহণ মামলার অবস্থা দেখব?', 'দাবির জন্য কোন নথি প্রয়োজন?', 'ক্ষতিপূরণ কীভাবে নির্ধারিত হয়?', 'আমি কি অধিগ্রহণে আপত্তি জানাতে পারি?', 'আমি কোথায় সাহায্য পাব?'],
    te: ['నా భూసేకరణ కేసు స్థితిని ఎలా చూడగలను?', 'క్లెయిమ్‌కు ఏ పత్రాలు అవసరం?', 'పరిహారం ఎలా నిర్ణయించబడుతుంది?', 'నేను అభ్యంతరం దాఖలు చేయవచ్చా?', 'సహాయం ఎక్కడ పొందగలను?'],
    ta: ['என் நில வழக்கின் நிலையை எவ்வாறு பார்க்கலாம்?', 'கோரிக்கைக்கு என்ன ஆவணங்கள் தேவை?', 'இழப்பீடு எவ்வாறு தீர்மானிக்கப்படுகிறது?', 'நான் எதிர்ப்பு தெரிவிக்கலாமா?', 'உதவி எங்கே கிடைக்கும்?'],
    gu: ['મારા જમીન સંપાદન કેસની સ્થિતિ કેવી રીતે જોઈ શકું?', 'દાવા માટે કયા દસ્તાવેજો જરૂરી છે?', 'વળતર કેવી રીતે નક્કી થાય છે?', 'શું હું વાંધો નોંધાવી શકું?', 'મને મદદ ક્યાં મળશે?'],
    kn: ['ನನ್ನ ಭೂಸ್ವಾಧೀನ ಪ್ರಕರಣದ ಸ್ಥಿತಿ ಹೇಗೆ ನೋಡಬಹುದು?', 'ಹಕ್ಕುಹೆಚ್ಚಿಗೆ ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು?', 'ಪರಿಹಾರ ಹೇಗೆ ನಿರ್ಧರಿಸಲಾಗುತ್ತದೆ?', 'ನಾನು ಆಕ್ಷೇಪಣೆ ಸಲ್ಲಿಸಬಹುದೇ?', 'ಸಹಾಯ ಎಲ್ಲಿ ಪಡೆಯಬಹುದು?'],
    or: ['ମୋ ଭୂମି ମାମଲାର ସ୍ଥିତି କିପରି ଦେଖିବି?', 'ଦାବି ପାଇଁ କେଉଁ ଦଲିଲ ଆବଶ୍ୟକ?', 'କ୍ଷତିପୂରଣ କିପରି ନିର୍ଦ୍ଧାରିତ ହୁଏ?', 'ମୁଁ କି ଆପତ୍ତି ଦାଖଲ କରିପାରିବି?', 'ସହାୟତା କେଉଁଠାରେ ପାଇବି?'],
    pa: ['ਮੈਂ ਆਪਣੇ ਜ਼ਮੀਨ ਮਾਮਲੇ ਦੀ ਸਥਿਤੀ ਕਿਵੇਂ ਵੇਖਾਂ?', 'ਦਾਅਵੇ ਲਈ ਕਿਹੜੇ ਦਸਤਾਵੇਜ਼ ਚਾਹੀਦੇ ਹਨ?', 'ਮੁਆਵਜ਼ਾ ਕਿਵੇਂ ਨਿਰਧਾਰਿਤ ਹੁੰਦਾ ਹੈ?', 'ਕੀ ਮੈਂ ਇਤਰਾਜ਼ ਦਰਜ ਕਰ ਸਕਦਾ/ਸਕਦੀ ਹਾਂ?', 'ਮਦਦ ਕਿੱਥੇ ਮਿਲੇਗੀ?'],
  };

  const faqs = language === 'hi' ? [
    { question: 'मैं अपने भूमि अधिग्रहण मामले की स्थिति कैसे देख सकता/सकती हूँ?', answer: 'अपने पंजीकृत विवरणों के साथ भूमि मालिक पोर्टल में साइन इन करें और भूखंड की स्थिति, सूचनाएँ, दस्तावेज़ और मुआवज़े की जानकारी देखें।' },
    { question: 'दावे के लिए कौन से दस्तावेज़ आवश्यक हैं?', answer: 'दस्तावेज़ आपके मामले के चरण पर निर्भर करते हैं। आपके पोर्टल रिकॉर्ड में आवश्यक दस्तावेज़ और उनका सत्यापन दर्ज रहता है।' },
    { question: 'मुआवज़ा कैसे निर्धारित किया जाता है?', answer: 'मुआवज़ा लागू अधिग्रहण प्रक्रिया के अनुसार दर्ज किया जाता है और संबंधित समीक्षा व स्वीकृति चरण पूरा होने पर आपके मामले में दिखता है।' },
    { question: 'क्या मैं अधिग्रहण पर आपत्ति दर्ज कर सकता/सकती हूँ?', answer: 'हाँ। आपत्ति अवधि खुली होने पर आपके केस रिकॉर्ड में आपत्ति दर्ज करने का विकल्प और उसकी समीक्षा स्थिति उपलब्ध रहती है।' },
    { question: 'समस्या होने पर मुझे सहायता कहाँ मिलेगी?', answer: 'अपने केस की जानकारी और उपलब्ध सहायता विकल्पों के लिए भूमि मालिक पोर्टल का उपयोग करें। अधिकारी रिकॉर्ड और नोटिस सहायता के लिए संबंधित केस कार्यक्षेत्र का उपयोग कर सकते हैं।' },
  ] : faqQuestions[language] ? faqQuestions[language].map((question) => ({
    question,
    answer: `${copy.faqDescription} ${copy.trackCase}.`,
  })) : [
    {
      question: 'How can I track the status of my land acquisition case?',
      answer: 'Sign in through the Landowner portal with your registered details to view your parcel status, notices, documents and compensation information.',
    },
    {
      question: 'What documents are required for a claim?',
      answer: 'The documents depend on the stage of your case. Your portal record lists the required documents and shows which have been verified.',
    },
    {
      question: 'How is compensation determined?',
      answer: 'Compensation is recorded against the applicable acquisition process and is shown in your case once the relevant review and approval steps are complete.',
    },
    {
      question: 'Can I raise an objection to the acquisition?',
      answer: 'Yes. Where the objection window is open, your case record provides a filing route and keeps you informed about its review status.',
    },
    {
      question: 'Where can I get help if I face issues?',
      answer: 'Use the Landowner portal to review your case information and available support options. Officials can use the relevant case workspace for record and notice support.',
    },
  ];

  const walkStages: WalkStage[] = ACQUISITION_STAGES.map((stage) => ({
    id: stage.id,
    label: t(stageLabels[stage.id]),
    shortLabel: t(stageShortLabels[stage.id]),
    body: t(uiText.landing[STEP_BODY_BY_STAGE_ID[stage.id]]),
  }));

  const heroRise = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <div className="bs-landing" data-theme={theme} id="top">
      <LandingNav />

      <main>
        <section className="bs-hero" aria-labelledby="landing-title">
          <div className="bs-shell bs-hero-grid">
            <div className="bs-hero-lead">
              <motion.span
                className="bs-eyebrow"
                {...heroRise}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {copy.eyebrow}
              </motion.span>
              <h1 id="landing-title">
                <RevealLine immediate index={0}>
                  {copy.headlineStart}
                </RevealLine>{' '}
                <RevealLine immediate index={1}>
                  <span className="bs-muted">{copy.headlineEnd}</span>
                </RevealLine>
              </h1>
            </div>

            <motion.div
              className="bs-hero-aside"
              {...heroRise}
              transition={{ duration: 0.5, delay: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <p>{copy.heroDescription}</p>
              <div className="bs-hero-actions">
                <Link className="bs-btn bs-btn-amber" to="/auth">
                  <span>{copy.trackCase}</span>
                  <span className="bs-btn-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
                <a className="bs-btn bs-btn-outline" href="#services">
                  <span>{copy.exploreServices}</span>
                  <span className="bs-btn-arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </div>
            </motion.div>
            <div className="bs-hero-portals" aria-label="Choose your portal">
              <div className="bs-hero-portals-head">
                <h2>{copy.choosePortal}</h2>
                <p>{copy.portalDescription}</p>
              </div>
              <Link className="bs-hero-portal" to="/auth">
                <span className="bs-portal-symbol" aria-hidden="true">⌂</span>
                <span><strong>{copy.landowners}</strong><small>{copy.landownersDescription}</small></span>
                <b aria-hidden="true">→</b>
              </Link>
              <Link className="bs-hero-portal" to="/auth">
                <span className="bs-portal-symbol" aria-hidden="true">▦</span>
                <span><strong>{copy.officials}</strong><small>{copy.officialsDescription}</small></span>
                <b aria-hidden="true">→</b>
              </Link>
            </div>
          </div>
        </section>

        <section className="bs-section bs-about" id="about" aria-label="About BhoomiSetu">
          <div className="bs-shell">
            <div className="bs-section-head">
              <div>
                <span className="bs-eyebrow">{copy.about}</span>
                <h2>
                  <RevealLine>{copy.aboutHeading}</RevealLine>
                </h2>
              </div>
              <p>{copy.aboutDescription}</p>
            </div>
            <div className="bs-about-points">
              <div><span aria-hidden="true">▤</span><h3>{copy.notices}</h3><p>{copy.noticesDescription}</p></div>
              <div><span aria-hidden="true">▧</span><h3>{copy.documents}</h3><p>{copy.documentsDescription}</p></div>
              <div><span aria-hidden="true">◇</span><h3>{copy.compensation}</h3><p>{copy.compensationDescription}</p></div>
            </div>
          </div>
        </section>

        <section className="bs-section bs-journey" id="journey">
          <div className="bs-shell">
            <div className="bs-section-head">
              <div>
                <span className="bs-eyebrow">{t(uiText.landing.howItWorksEyebrow)}</span>
                <h2>
                  <RevealLine>{t(uiText.landing.howItWorksHeading)}</RevealLine>
                </h2>
              </div>
              <p>{t(uiText.landing.howItWorksIntro)}</p>
            </div>
          </div>
          <StageWalk stages={walkStages} />
        </section>

        <section className="bs-section" id="services">
          <div className="bs-shell">
            <div className="bs-section-head">
              <div>
                <span className="bs-eyebrow">{t(uiText.landing.capabilitiesEyebrow)}</span>
                <h2>
                  <RevealLine>{t(uiText.landing.capabilitiesHeading)}</RevealLine>
                </h2>
              </div>
              <p>{t(uiText.landing.capabilitiesIntro)}</p>
            </div>

            <div className="bs-capabilities">
              {CAPABILITIES.map((capability, index) => (
                <Reveal className="bs-capability-cell" index={index} key={capability.titleKey}>
                  <button
                    type="button"
                    className="bs-capability"
                    aria-haspopup="dialog"
                    onClick={() => setActiveCapabilityIndex(index)}
                  >
                    <span className="bs-capability-index">{String(index + 1).padStart(2, '0')}</span>
                    <h3>{t(uiText.landing[capability.titleKey])}</h3>
                    <p>{t(uiText.landing[capability.bodyKey])}</p>
                    <span className="bs-capability-expand" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bs-section bs-faqs" id="faqs" aria-labelledby="faq-title">
          <div className="bs-shell">
            <div className="bs-section-head">
              <div>
                <span className="bs-eyebrow">{copy.getAnswers}</span>
                <h2 id="faq-title"><RevealLine>{copy.faqHeading}</RevealLine></h2>
              </div>
              <p>{copy.faqDescription}</p>
            </div>
            <div className="bs-faq-list">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return <div className="bs-faq" key={faq.question}>
                  <button type="button" onClick={() => setOpenFaqIndex(isOpen ? null : index)} aria-expanded={isOpen}>
                    <span>{String(index + 1).padStart(2, '0')}</span><strong>{faq.question}</strong><b aria-hidden="true">{isOpen ? '−' : '+'}</b>
                  </button>
                  {isOpen && <p>{faq.answer}</p>}
                </div>;
              })}
            </div>
          </div>
        </section>

      </main>

      <footer className="bs-footer" id="contact">
        <div className="bs-shell bs-footer-inner">
          <span className="bs-footer-wordmark"><img src="/icons/icon.svg" alt="" />BhoomiSetu</span>
          <span className="bs-footer-meta">{copy.footer}</span>
        </div>
      </footer>

      <CapabilityModal
        capability={
          activeCapabilityIndex === null
            ? null
            : {
                index: String(activeCapabilityIndex + 1).padStart(2, '0'),
                title: t(uiText.landing[CAPABILITIES[activeCapabilityIndex].titleKey]),
                detail: t(uiText.landing[CAPABILITIES[activeCapabilityIndex].detailKey]),
              }
        }
        onClose={() => setActiveCapabilityIndex(null)}
      />
    </div>
  );
}
