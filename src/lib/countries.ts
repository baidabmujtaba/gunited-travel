/** Bilingual nationality list used by the guided request flow. */
export type Country = { code: string; name_en: string; name_ar: string };

export const NATIONALITIES: Country[] = [
  { code: "SD", name_en: "Sudanese", name_ar: "سوداني" },
  { code: "EG", name_en: "Egyptian", name_ar: "مصري" },
  { code: "SA", name_en: "Saudi", name_ar: "سعودي" },
  { code: "AE", name_en: "Emirati", name_ar: "إماراتي" },
  { code: "QA", name_en: "Qatari", name_ar: "قطري" },
  { code: "KW", name_en: "Kuwaiti", name_ar: "كويتي" },
  { code: "BH", name_en: "Bahraini", name_ar: "بحريني" },
  { code: "OM", name_en: "Omani", name_ar: "عماني" },
  { code: "JO", name_en: "Jordanian", name_ar: "أردني" },
  { code: "SY", name_en: "Syrian", name_ar: "سوري" },
  { code: "LB", name_en: "Lebanese", name_ar: "لبناني" },
  { code: "IQ", name_en: "Iraqi", name_ar: "عراقي" },
  { code: "YE", name_en: "Yemeni", name_ar: "يمني" },
  { code: "LY", name_en: "Libyan", name_ar: "ليبي" },
  { code: "TN", name_en: "Tunisian", name_ar: "تونسي" },
  { code: "DZ", name_en: "Algerian", name_ar: "جزائري" },
  { code: "MA", name_en: "Moroccan", name_ar: "مغربي" },
  { code: "ER", name_en: "Eritrean", name_ar: "إريتري" },
  { code: "ET", name_en: "Ethiopian", name_ar: "إثيوبي" },
  { code: "SS", name_en: "South Sudanese", name_ar: "جنوب سوداني" },
  { code: "TD", name_en: "Chadian", name_ar: "تشادي" },
  { code: "KE", name_en: "Kenyan", name_ar: "كيني" },
  { code: "TR", name_en: "Turkish", name_ar: "تركي" },
  { code: "GB", name_en: "British", name_ar: "بريطاني" },
  { code: "US", name_en: "American", name_ar: "أمريكي" },
  { code: "OTHER", name_en: "Other", name_ar: "أخرى" },
];

/** ISO destination countries. Names come from the runtime locale data so this
 * list stays bilingual without confusing destination names with nationalities. */
const WORLD_COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

const namesEn = new Intl.DisplayNames(["en"], { type: "region" });
const namesAr = new Intl.DisplayNames(["ar"], { type: "region" });

export const DESTINATION_COUNTRIES: Country[] = WORLD_COUNTRY_CODES.map((code) => ({
  code,
  name_en: namesEn.of(code) ?? code,
  name_ar: namesAr.of(code) ?? code,
}));
