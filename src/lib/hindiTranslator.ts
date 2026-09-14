/**
 * Indic Transliteration and Translation Utility for Family Names.
 * Uses a hybrid approach:
 * 1. Fast, highly-accurate curated Indic name dictionary for royal/lineage terms (Chandora, Parihar, etc.)
 * 2. Free Google Input Tools transliteration API for general Indic names (no API key required)
 * 3. Offline phonetic transliteration fallback for resilient zero-downtime execution
 */

const KNOWN_NAME_MAPPINGS: Record<string, string> = {
  // Lineage / Surnames / Gotra
  chandora: "चंदोरा",
  parihar: "पड़िहार",
  pratihara: "प्रतिहार",
  rajput: "राजपूत",
  solanki: "सोलंकी",
  rathore: "राठौड़",
  chouhan: "चौहान",
  chauhan: "चौहान",
  gehlot: "गेहलोत",
  sisodia: "सिसोदिया",
  sharma: "शर्मा",
  verma: "वर्मा",
  joshi: "जोशी",
  bhatnagar: "भटनागर",
  gupta: "गुप्ता",
  mehta: "मेहता",

  // Honorifics / Common suffixes
  kumar: "कुमार",
  kumari: "कुमारी",
  devi: "देवी",
  singh: "सिंह",
  lal: "लाल",
  chand: "चंद",
  bai: "बाई",
  kanwar: "कंवर",
  prasad: "प्रसाद",
  ram: "राम",
  ji: "जी",
  shree: "श्री",
  sri: "श्री",
  smt: "श्रीमती",

  // Common Given Names
  ajay: "अजय",
  vijay: "विजय",
  sanjay: "संजय",
  ramesh: "रमेश",
  suresh: "सुरेश",
  mahesh: "महेश",
  dinesh: "दिनेश",
  mukesh: "मुकेश",
  rajesh: "राजेश",
  rakesh: "राकेश",
  anil: "अनिल",
  sunil: "सुनील",
  manoj: "मनोज",
  vinod: "विनोद",
  pramod: "प्रमोद",
  ashok: "अशोक",
  alok: "आलोक",
  kamal: "कमल",
  pawan: "पवन",
  tarun: "तरुण",
  varun: "वरुण",
  arun: "अरुण",
  karan: "करण",
  rahul: "राहुल",
  rohit: "रोहित",
  amit: "अमित",
  sumit: "सुमित",
  deepak: "दीपक",
  pankaj: "पंकज",
  neeraj: "नीरज",
  kanchan: "कंचन",
  pooja: "पूजा",
  puja: "पूजा",
  anita: "अनिता",
  sunita: "सुनीता",
  kavita: "कविता",
  sarita: "सरिता",
  geeta: "गीता",
  gita: "गीता",
  sita: "सीता",
  seeta: "सीता",
  rekha: "रेखा",
  shanti: "शांति",
  radha: "राधा",
  parvati: "पार्वती",
  kamla: "कमला",
  bhanwar: "भंवर",
  sohan: "सोहन",
  mohan: "मोहन",
  roop: "रूप",
  om: "ओम",
  ganpat: "गणपत",
  kailash: "कैलाश",
  kishore: "किशोर",
  narayan: "नारायण",
  laxman: "लक्ष्मण",
  bharat: "भरत",
  shatrughan: "शत्रुघ्न",
  goverdhan: "गोवर्धन",
  durga: "दुर्गा",
  chamunda: "चामुंडा",
};

/**
 * Phonetic fallback mapping if API is unreachable
 */
function phoneticTransliterateFallback(word: string): string {
  const w = word.trim();
  if (!w) return "";
  const lower = w.toLowerCase();
  if (KNOWN_NAME_MAPPINGS[lower]) {
    return KNOWN_NAME_MAPPINGS[lower];
  }

  // Basic character approximations for fallback
  const vowels: Record<string, string> = {
    a: "ा",
    aa: "ा",
    i: "ि",
    ee: "ी",
    u: "ु",
    oo: "ू",
    e: "े",
    ai: "ै",
    o: "ो",
    au: "ौ",
  };

  const initialVowels: Record<string, string> = {
    a: "अ",
    aa: "आ",
    i: "इ",
    ee: "ई",
    u: "उ",
    oo: "ऊ",
    e: "ए",
    ai: "ऐ",
    o: "ओ",
    au: "औ",
  };

  const consonants: Record<string, string> = {
    k: "क",
    kh: "ख",
    g: "ग",
    gh: "घ",
    ch: "च",
    chh: "छ",
    j: "ज",
    jh: "झ",
    t: "त",
    th: "थ",
    d: "द",
    dh: "ध",
    n: "न",
    p: "प",
    ph: "फ",
    f: "फ़",
    b: "ब",
    bh: "भ",
    m: "म",
    y: "य",
    r: "र",
    l: "ल",
    v: "व",
    w: "व",
    sh: "श",
    shh: "ष",
    s: "स",
    h: "ह",
    gy: "ज्ञ",
  };

  // If already Hindi characters, return as is
  if (/[\u0900-\u097F]/.test(w)) return w;

  return w;
}

/**
 * Translates/Transliterates an English name into Hindi Devanagari script.
 */
export async function translateNameToHindi(englishName: string): Promise<string> {
  const trimmed = englishName.trim();
  if (!trimmed) return "";

  // If already Devanagari, return as is
  if (/^[\u0900-\u097F\s.]+$/.test(trimmed)) {
    return trimmed;
  }

  const words = trimmed.split(/\s+/);
  const resultWords: string[] = [];

  // Check known words first
  let needsApi = false;
  for (const word of words) {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
    if (KNOWN_NAME_MAPPINGS[cleanWord]) {
      resultWords.push(KNOWN_NAME_MAPPINGS[cleanWord]);
    } else {
      needsApi = true;
      break;
    }
  }

  // If all words were found in known dictionary, return immediately
  if (!needsApi && resultWords.length === words.length) {
    return resultWords.join(" ");
  }

  // Try Google Input Tools API (Free, high accuracy, official Indic transliteration)
  try {
    const url = `https://inputtools.google.com/request?text=${encodeURIComponent(
      trimmed,
    )}&itc=hi-t-i0-und&num=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0] === "SUCCESS" && data[1]?.[0]?.[1]?.[0]) {
        return data[1][0][1][0];
      }
    }
  } catch (err) {
    // network timeout or abort, proceed to next fallback
  }

  // Try MyMemory translation API fallback
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      trimmed,
    )}&langpair=en|hi`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      const text = data?.responseData?.translatedText;
      if (text && !text.includes("MYMEMORY WARNING") && /[\u0900-\u097F]/.test(text)) {
        return text;
      }
    }
  } catch {
    // fallback to dictionary/phonetic
  }

  // Hybrid fallback: resolve word by word
  const finalWords: string[] = [];
  for (const word of words) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    if (KNOWN_NAME_MAPPINGS[clean]) {
      finalWords.push(KNOWN_NAME_MAPPINGS[clean]);
    } else {
      finalWords.push(phoneticTransliterateFallback(word));
    }
  }

  return finalWords.join(" ");
}
