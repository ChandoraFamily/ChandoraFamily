"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "hi";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Brand & Header
    "app.title": "Chandora Family Tree",
    "app.subtitle": "Lineage Chronicles",
    "header.heritage": "Heritage Lore",
    "header.contact": "Contact Us",
    "header.focusAdmin": "Focus on Admin",
    "header.adminFocus": "Admin Focus",
    "header.relationship": "Find Relationship",
    "header.language": "Language",
    "header.login": "Sign In",
    "header.logout": "Sign Out",
    "header.adminInbox": "Admin Inbox",
    "header.translateAll": "Translate Names to Hindi",

    // Search
    "search.placeholder": "Search family by name, city, or year...",
    "search.results": "Search Results",
    "search.noResults": "No family members found",
    "search.loading": "Searching...",

    // Tree HUD & Controls
    "tree.reset": "Reset View",
    "tree.zoomIn": "Zoom In",
    "tree.zoomOut": "Zoom Out",
    "tree.fullscreen": "Fullscreen",
    "tree.legend": "Tree Legend",
    "tree.generation": "Generation",
    "tree.ancestors": "Ancestors",
    "tree.descendants": "Descendants",
    "tree.focal": "Focal Person",
    "tree.empty": "No tree data available",
    "tree.expandAncestors": "Show ancestors",
    "tree.expandDescendants": "Show descendants",
    "tree.unloaded": "unloaded relatives",

    // Person Card & Details
    "person.details": "Person Details",
    "person.edit": "Edit Person",
    "person.suggestEdit": "Suggest Correction",
    "person.addRelative": "Add Relative",
    "person.linkRelative": "Link Relative",
    "person.delete": "Delete Person",
    "person.setFocus": "Focus Here",
    "person.birth": "Birth",
    "person.death": "Death",
    "person.living": "Living",
    "person.deceased": "Deceased",
    "person.birthPlace": "Birth Place",
    "person.deathPlace": "Death Place",
    "person.bio": "Biography & Life Notes",
    "person.parents": "Parents",
    "person.father": "Father",
    "person.mother": "Mother",
    "person.spouses": "Spouse(s)",
    "person.spouse": "Spouse",
    "person.husband": "Husband",
    "person.wife": "Wife",
    "person.children": "Children",
    "person.son": "Son",
    "person.daughter": "Daughter",
    "person.siblings": "Siblings",
    "person.brother": "Brother",
    "person.sister": "Sister",
    "person.noParents": "No parents recorded",
    "person.noSpouse": "No spouse recorded",
    "person.noChildren": "No children recorded",
    "person.gender": "Gender",
    "person.gender.male": "Male",
    "person.gender.female": "Female",
    "person.gender.other": "Other",
    "person.gender.unknown": "Unknown",
    "person.hindiName": "Hindi Name",
    "person.englishName": "English Name",

    // Forms
    "form.firstName": "First Name",
    "form.middleName": "Middle Name",
    "form.lastName": "Last Name",
    "form.hindiName": "Hindi Name (हिंदी में नाम)",
    "form.hindiNameHelp": "Shown when viewer switches to Hindi language. Defaults to English name if left empty.",
    "form.autoTranslate": "Auto-Translate to Hindi",
    "form.translating": "Translating...",
    "form.maidenName": "Maiden Name",
    "form.birthDate": "Birth Date / Year",
    "form.deathDate": "Death Date / Year",
    "form.photoUrl": "Photo URL",
    "form.save": "Save Person",
    "form.saving": "Saving...",
    "form.cancel": "Cancel",
    "form.addParent": "Add Parent",
    "form.addChild": "Add Child",
    "form.addSpouse": "Add Spouse",

    // Relationship Finder
    "rel.title": "Family Relationship Finder",
    "rel.subtitle": "Calculate exact kinship between any two family members in the Chandora lineage.",
    "rel.person1": "First Person",
    "rel.person2": "Second Person",
    "rel.calculate": "Calculate Relationship",
    "rel.result": "Kinship Connection",
    "rel.degree": "Degree of Separation",
    "rel.commonAncestor": "Common Ancestor",

    // Bulk translation modal
    "trans.title": "Hindi Name Translator",
    "trans.desc": "Automatically transliterate and translate English names into Hindi Devanagari script for all family members.",
    "trans.button": "Start Translating Database",
    "trans.progress": "Translating records...",
    "trans.done": "Names successfully translated & saved to database!",
    "trans.total": "Total Persons Processed",
    "trans.updated": "Persons Updated with Hindi Name",
  },
  hi: {
    // Brand & Header
    "app.title": "चंदोरा वंश-वृक्ष",
    "app.subtitle": "गौरवशाली कुल-गाथा",
    "header.heritage": "कुल-गाथा",
    "header.contact": "संपर्क करें",
    "header.focusAdmin": "व्यवस्थापक पर केंद्रित करें",
    "header.adminFocus": "व्यवस्थापक केंद्र",
    "header.relationship": "पारिवारिक संबंध खोजें",
    "header.language": "भाषा",
    "header.login": "लॉग इन",
    "header.logout": "लॉग आउट",
    "header.adminInbox": "प्रशासक इनबॉक्स",
    "header.translateAll": "सभी नाम हिंदी में अनुवाद करें",

    // Search
    "search.placeholder": "नाम, शहर या जन्म वर्ष से खोजें...",
    "search.results": "खोज परिणाम",
    "search.noResults": "कोई परिवारजन नहीं मिले",
    "search.loading": "खोज जारी है...",

    // Tree HUD & Controls
    "tree.reset": "मूल दृश्य",
    "tree.zoomIn": "बड़ा करें",
    "tree.zoomOut": "छोटा करें",
    "tree.fullscreen": "पूर्ण स्क्रीन",
    "tree.legend": "वृक्ष संकेतक",
    "tree.generation": "पीढ़ी",
    "tree.ancestors": "पूर्वज",
    "tree.descendants": "वंशज",
    "tree.focal": "मुख्य व्यक्ति",
    "tree.empty": "वंश-वृक्ष उपलब्ध नहीं है",
    "tree.expandAncestors": "पूर्वज देखें",
    "tree.expandDescendants": "वंशज देखें",
    "tree.unloaded": "अन्य संबंधी",

    // Person Card & Details
    "person.details": "व्यक्तिगत विवरण",
    "person.edit": "विवरण संपादित करें",
    "person.suggestEdit": "सुझाव / सुधार भेजें",
    "person.addRelative": "संबंधी जोड़ें",
    "person.linkRelative": "संबंधी लिंक करें",
    "person.delete": "हटाएं",
    "person.setFocus": "इन्हें केंद्र बनाएं",
    "person.birth": "जन्म",
    "person.death": "स्वर्गवास",
    "person.living": "जीवित",
    "person.deceased": "स्वर्गीय",
    "person.birthPlace": "जन्म स्थान",
    "person.deathPlace": "स्वर्गवास स्थान",
    "person.bio": "जीवन परिचय व संस्मरण",
    "person.parents": "माता-पिता",
    "person.father": "पिता",
    "person.mother": "माता",
    "person.spouses": "जीवनसाथी",
    "person.spouse": "जीवनसाथी",
    "person.husband": "पति",
    "person.wife": "पत्नी",
    "person.children": "संतान",
    "person.son": "पुत्र",
    "person.daughter": "पुत्री",
    "person.siblings": "भाई-बहन",
    "person.brother": "भाई",
    "person.sister": "बहन",
    "person.noParents": "माता-पिता का रिकॉर्ड दर्ज नहीं है",
    "person.noSpouse": "जीवनसाथी का रिकॉर्ड दर्ज नहीं है",
    "person.noChildren": "संतान का रिकॉर्ड दर्ज नहीं है",
    "person.gender": "लिंग",
    "person.gender.male": "पुरुष",
    "person.gender.female": "महिला",
    "person.gender.other": "अन्य",
    "person.gender.unknown": "अज्ञात",
    "person.hindiName": "हिंदी नाम",
    "person.englishName": "अंग्रेजी नाम",

    // Forms
    "form.firstName": "प्रथम नाम (First Name)",
    "form.middleName": "मध्य नाम (Middle Name)",
    "form.lastName": "उपनाम / कुलनाम (Last Name)",
    "form.hindiName": "हिंदी नाम (देवनागरी में)",
    "form.hindiNameHelp": "हिंदी भाषा चयन करने पर यह नाम दिखाई देगा। यदि यह खाली होगा तो स्वतः अंग्रेजी नाम प्रदर्शित होगा।",
    "form.autoTranslate": "अंग्रेजी से हिंदी में अनुवाद करें",
    "form.translating": "अनुवाद हो रहा है...",
    "form.maidenName": "विवाह पूर्व उपनाम",
    "form.birthDate": "जन्म तिथि / वर्ष",
    "form.deathDate": "स्वर्गवास तिथि / वर्ष",
    "form.photoUrl": "तस्वीर लिंक (URL)",
    "form.save": "सुरक्षित करें",
    "form.saving": "सुरक्षित हो रहा है...",
    "form.cancel": "रद्द करें",
    "form.addParent": "माता-पिता जोड़ें",
    "form.addChild": "संतान जोड़ें",
    "form.addSpouse": "जीवनसाथी जोड़ें",

    // Relationship Finder
    "rel.title": "पारिवारिक संबंध खोजक",
    "rel.subtitle": "चंदोरा वंश-वृक्ष के किन्हीं भी दो सदस्यों के बीच सटीक नाता व पीढ़ीगत संबंध जानें।",
    "rel.person1": "पहला सदस्य",
    "rel.person2": "दूसरा सदस्य",
    "rel.calculate": "संबंध जानें",
    "rel.result": "पारिवारिक नाता",
    "rel.degree": "पीढ़ियों की दूरी",
    "rel.commonAncestor": "उभयनिष्ठ पूर्वज",

    // Bulk translation modal
    "trans.title": "हिंदी नाम अनुवादक",
    "trans.desc": "सभी परिवारजनों के अंग्रेजी नामों को देवनागरी हिंदी में स्वतः अनुवाद करके डेटाबेस में सुरक्षित करें।",
    "trans.button": "डेटाबेस का हिंदी अनुवाद शुरू करें",
    "trans.progress": "नामों का अनुवाद किया जा रहा है...",
    "trans.done": "सभी नाम सफलतापूर्वक हिंदी में अनुवादित व सुरक्षित हो गए!",
    "trans.total": "कुल प्रविष्टियां",
    "trans.updated": "अद्यतन किए गए नाम",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  // Load saved preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lineage_lang") as Language;
      if (saved === "en" || saved === "hi") {
        setLangState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem("lineage_lang", newLang);
      document.documentElement.lang = newLang;
    } catch {
      // ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "hi" : "en");
  };

  const t = (key: string, fallback?: string): string => {
    const dict = translations[lang] || translations.en;
    if (dict[key]) return dict[key];
    const enDict = translations.en;
    if (enDict[key]) return enDict[key];
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
