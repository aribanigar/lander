"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, CheckCircle2, Upload, Briefcase,
  MapPin, DollarSign, User, Target, Globe2, Search, X,
} from "lucide-react";

/* ─── Types ─── */
type Direction = "forward" | "back";

interface TargetCountry {
  name: string;
  flag: string;
  currency: string; // ISO 4217 code
  symbol: string;   // display symbol
}

interface FormData {
  fullName: string;
  field: string;
  role: string;
  yearsExp: string;
  jobType: string;
  level: string;
  targetCountries: TargetCountry[];
  remotePreference: string;
  currencyCode: string;
  currencySymbol: string;
  salaryMin: string;
  salaryMax: string;
  linkedinUrl: string;
  resumeChoice: "upload" | "build" | "";
  niche: string;
}

/* ─── Step definitions ─── */
const STEPS = [
  { id: "name",   icon: User,         question: "What's your name?",                           sub: "We'll personalise everything to you." },
  { id: "field",  icon: Briefcase,    question: "What field do you work in?",                  sub: "Be specific — we use this to find the best-fit jobs." },
  { id: "role",   icon: Target,       question: "What job title are you targeting?",            sub: "e.g. Senior Art Director, Brand Strategist, Creative Director" },
  { id: "exp",    icon: CheckCircle2, question: "How many years of experience do you have?",   sub: "We use this to calibrate the seniority of roles we find." },
  { id: "type",   icon: Briefcase,    question: "What type of role are you looking for?",      sub: "Select all that apply." },
  { id: "region", icon: MapPin,       question: "Where are you open to working?",              sub: "Pick one or more countries — or go global." },
  { id: "remote", icon: Globe2,       question: "How do you prefer to work?",                  sub: "We'll filter jobs to match your preference." },
  { id: "salary", icon: DollarSign,   question: "What salary range are you targeting?",        sub: "This stays private — we use it to filter low-paying roles out." },
  { id: "resume", icon: Upload,       question: "Do you have an existing resume?",             sub: "We'll tailor it per application. Or answer our questions and we'll build one." },
  { id: "niche",  icon: Target,       question: "Describe your niche in one sentence.",        sub: "e.g. 'Senior graphic designer with 15 years in FMCG brand campaigns'" },
];

const JOB_TYPES   = ["Full-time", "Contract", "Part-time", "Freelance", "Internship"];
const REMOTE_OPTS = ["Fully remote", "Hybrid", "On-site", "No preference"];
const LEVEL_OPTS  = ["Junior", "Mid-level", "Senior", "Lead / Principal", "Director / VP", "C-Suite"];

const FIELD_SUGGESTIONS = [
  "Graphic Design", "Brand Strategy", "Advertising & Creative", "UX / Product Design",
  "Motion Design", "Photography", "Copywriting", "Marketing", "Art Direction",
  "Illustration", "Fashion Design", "Interior Design", "Architecture",
];

/* ─── Country + Currency data (190 countries) ─── */
const COUNTRIES: TargetCountry[] = [
  // Quick access
  { name: "Remote only",           flag: "🌐", currency: "USD", symbol: "$"     },
  { name: "Global (Any)",          flag: "🌍", currency: "USD", symbol: "$"     },
  // Top job markets
  { name: "United States",         flag: "🇺🇸", currency: "USD", symbol: "$"    },
  { name: "United Kingdom",        flag: "🇬🇧", currency: "GBP", symbol: "£"    },
  { name: "UAE",                   flag: "🇦🇪", currency: "AED", symbol: "د.إ"  },
  { name: "Canada",                flag: "🇨🇦", currency: "CAD", symbol: "CA$"  },
  { name: "Australia",             flag: "🇦🇺", currency: "AUD", symbol: "A$"   },
  { name: "Singapore",             flag: "🇸🇬", currency: "SGD", symbol: "S$"   },
  { name: "Germany",               flag: "🇩🇪", currency: "EUR", symbol: "€"    },
  { name: "Netherlands",           flag: "🇳🇱", currency: "EUR", symbol: "€"    },
  { name: "Switzerland",           flag: "🇨🇭", currency: "CHF", symbol: "Fr"   },
  { name: "India",                 flag: "🇮🇳", currency: "INR", symbol: "₹"    },
  // Europe
  { name: "Albania",               flag: "🇦🇱", currency: "ALL", symbol: "L"    },
  { name: "Austria",               flag: "🇦🇹", currency: "EUR", symbol: "€"    },
  { name: "Belarus",               flag: "🇧🇾", currency: "BYN", symbol: "Br"   },
  { name: "Belgium",               flag: "🇧🇪", currency: "EUR", symbol: "€"    },
  { name: "Bosnia & Herzegovina",  flag: "🇧🇦", currency: "BAM", symbol: "KM"   },
  { name: "Bulgaria",              flag: "🇧🇬", currency: "BGN", symbol: "лв"   },
  { name: "Croatia",               flag: "🇭🇷", currency: "EUR", symbol: "€"    },
  { name: "Cyprus",                flag: "🇨🇾", currency: "EUR", symbol: "€"    },
  { name: "Czech Republic",        flag: "🇨🇿", currency: "CZK", symbol: "Kč"   },
  { name: "Denmark",               flag: "🇩🇰", currency: "DKK", symbol: "kr"   },
  { name: "Estonia",               flag: "🇪🇪", currency: "EUR", symbol: "€"    },
  { name: "Finland",               flag: "🇫🇮", currency: "EUR", symbol: "€"    },
  { name: "France",                flag: "🇫🇷", currency: "EUR", symbol: "€"    },
  { name: "Greece",                flag: "🇬🇷", currency: "EUR", symbol: "€"    },
  { name: "Hungary",               flag: "🇭🇺", currency: "HUF", symbol: "Ft"   },
  { name: "Iceland",               flag: "🇮🇸", currency: "ISK", symbol: "kr"   },
  { name: "Ireland",               flag: "🇮🇪", currency: "EUR", symbol: "€"    },
  { name: "Italy",                 flag: "🇮🇹", currency: "EUR", symbol: "€"    },
  { name: "Kosovo",                flag: "🇽🇰", currency: "EUR", symbol: "€"    },
  { name: "Latvia",                flag: "🇱🇻", currency: "EUR", symbol: "€"    },
  { name: "Liechtenstein",         flag: "🇱🇮", currency: "CHF", symbol: "Fr"   },
  { name: "Lithuania",             flag: "🇱🇹", currency: "EUR", symbol: "€"    },
  { name: "Luxembourg",            flag: "🇱🇺", currency: "EUR", symbol: "€"    },
  { name: "Malta",                 flag: "🇲🇹", currency: "EUR", symbol: "€"    },
  { name: "Moldova",               flag: "🇲🇩", currency: "MDL", symbol: "L"    },
  { name: "Monaco",                flag: "🇲🇨", currency: "EUR", symbol: "€"    },
  { name: "Montenegro",            flag: "🇲🇪", currency: "EUR", symbol: "€"    },
  { name: "North Macedonia",       flag: "🇲🇰", currency: "MKD", symbol: "ден"  },
  { name: "Norway",                flag: "🇳🇴", currency: "NOK", symbol: "kr"   },
  { name: "Poland",                flag: "🇵🇱", currency: "PLN", symbol: "zł"   },
  { name: "Portugal",              flag: "🇵🇹", currency: "EUR", symbol: "€"    },
  { name: "Romania",               flag: "🇷🇴", currency: "RON", symbol: "lei"  },
  { name: "Russia",                flag: "🇷🇺", currency: "RUB", symbol: "₽"    },
  { name: "Serbia",                flag: "🇷🇸", currency: "RSD", symbol: "din"  },
  { name: "Slovakia",              flag: "🇸🇰", currency: "EUR", symbol: "€"    },
  { name: "Slovenia",              flag: "🇸🇮", currency: "EUR", symbol: "€"    },
  { name: "Spain",                 flag: "🇪🇸", currency: "EUR", symbol: "€"    },
  { name: "Sweden",                flag: "🇸🇪", currency: "SEK", symbol: "kr"   },
  { name: "Turkey",                flag: "🇹🇷", currency: "TRY", symbol: "₺"    },
  { name: "Ukraine",               flag: "🇺🇦", currency: "UAH", symbol: "₴"    },
  // Middle East
  { name: "Bahrain",               flag: "🇧🇭", currency: "BHD", symbol: ".د.ب" },
  { name: "Iran",                  flag: "🇮🇷", currency: "IRR", symbol: "﷼"    },
  { name: "Iraq",                  flag: "🇮🇶", currency: "IQD", symbol: "ع.د"  },
  { name: "Israel",                flag: "🇮🇱", currency: "ILS", symbol: "₪"    },
  { name: "Jordan",                flag: "🇯🇴", currency: "JOD", symbol: "د.ا"  },
  { name: "Kuwait",                flag: "🇰🇼", currency: "KWD", symbol: "د.ك"  },
  { name: "Lebanon",               flag: "🇱🇧", currency: "LBP", symbol: "ل.ل"  },
  { name: "Oman",                  flag: "🇴🇲", currency: "OMR", symbol: "ر.ع." },
  { name: "Qatar",                 flag: "🇶🇦", currency: "QAR", symbol: "ر.ق"  },
  { name: "Saudi Arabia",          flag: "🇸🇦", currency: "SAR", symbol: "ر.س"  },
  { name: "Syria",                 flag: "🇸🇾", currency: "SYP", symbol: "£"    },
  { name: "Yemen",                 flag: "🇾🇪", currency: "YER", symbol: "﷼"    },
  // Asia Pacific
  { name: "Afghanistan",           flag: "🇦🇫", currency: "AFN", symbol: "؋"    },
  { name: "Armenia",               flag: "🇦🇲", currency: "AMD", symbol: "֏"    },
  { name: "Azerbaijan",            flag: "🇦🇿", currency: "AZN", symbol: "₼"    },
  { name: "Bangladesh",            flag: "🇧🇩", currency: "BDT", symbol: "৳"    },
  { name: "Bhutan",                flag: "🇧🇹", currency: "BTN", symbol: "Nu"   },
  { name: "Brunei",                flag: "🇧🇳", currency: "BND", symbol: "B$"   },
  { name: "Cambodia",              flag: "🇰🇭", currency: "KHR", symbol: "៛"    },
  { name: "China",                 flag: "🇨🇳", currency: "CNY", symbol: "¥"    },
  { name: "Georgia",               flag: "🇬🇪", currency: "GEL", symbol: "₾"    },
  { name: "Hong Kong",             flag: "🇭🇰", currency: "HKD", symbol: "HK$"  },
  { name: "Indonesia",             flag: "🇮🇩", currency: "IDR", symbol: "Rp"   },
  { name: "Japan",                 flag: "🇯🇵", currency: "JPY", symbol: "¥"    },
  { name: "Kazakhstan",            flag: "🇰🇿", currency: "KZT", symbol: "₸"    },
  { name: "Kyrgyzstan",            flag: "🇰🇬", currency: "KGS", symbol: "с"    },
  { name: "Laos",                  flag: "🇱🇦", currency: "LAK", symbol: "₭"    },
  { name: "Macau",                 flag: "🇲🇴", currency: "MOP", symbol: "P"    },
  { name: "Malaysia",              flag: "🇲🇾", currency: "MYR", symbol: "RM"   },
  { name: "Maldives",              flag: "🇲🇻", currency: "MVR", symbol: "Rf"   },
  { name: "Mongolia",              flag: "🇲🇳", currency: "MNT", symbol: "₮"    },
  { name: "Myanmar",               flag: "🇲🇲", currency: "MMK", symbol: "K"    },
  { name: "Nepal",                 flag: "🇳🇵", currency: "NPR", symbol: "Rs"   },
  { name: "New Zealand",           flag: "🇳🇿", currency: "NZD", symbol: "NZ$"  },
  { name: "Pakistan",              flag: "🇵🇰", currency: "PKR", symbol: "₨"    },
  { name: "Philippines",           flag: "🇵🇭", currency: "PHP", symbol: "₱"    },
  { name: "South Korea",           flag: "🇰🇷", currency: "KRW", symbol: "₩"    },
  { name: "Sri Lanka",             flag: "🇱🇰", currency: "LKR", symbol: "Rs"   },
  { name: "Taiwan",                flag: "🇹🇼", currency: "TWD", symbol: "NT$"  },
  { name: "Tajikistan",            flag: "🇹🇯", currency: "TJS", symbol: "SM"   },
  { name: "Thailand",              flag: "🇹🇭", currency: "THB", symbol: "฿"    },
  { name: "Timor-Leste",           flag: "🇹🇱", currency: "USD", symbol: "$"    },
  { name: "Turkmenistan",          flag: "🇹🇲", currency: "TMT", symbol: "T"    },
  { name: "Uzbekistan",            flag: "🇺🇿", currency: "UZS", symbol: "so'm" },
  { name: "Vietnam",               flag: "🇻🇳", currency: "VND", symbol: "₫"    },
  // Africa
  { name: "Algeria",               flag: "🇩🇿", currency: "DZD", symbol: "دج"   },
  { name: "Angola",                flag: "🇦🇴", currency: "AOA", symbol: "Kz"   },
  { name: "Botswana",              flag: "🇧🇼", currency: "BWP", symbol: "P"    },
  { name: "Burkina Faso",          flag: "🇧🇫", currency: "XOF", symbol: "CFA"  },
  { name: "Cameroon",              flag: "🇨🇲", currency: "XAF", symbol: "CFA"  },
  { name: "Cape Verde",            flag: "🇨🇻", currency: "CVE", symbol: "Esc"  },
  { name: "DR Congo",              flag: "🇨🇩", currency: "CDF", symbol: "FC"   },
  { name: "Egypt",                 flag: "🇪🇬", currency: "EGP", symbol: "£"    },
  { name: "Ethiopia",              flag: "🇪🇹", currency: "ETB", symbol: "Br"   },
  { name: "Ghana",                 flag: "🇬🇭", currency: "GHS", symbol: "GH₵"  },
  { name: "Ivory Coast",           flag: "🇨🇮", currency: "XOF", symbol: "CFA"  },
  { name: "Kenya",                 flag: "🇰🇪", currency: "KES", symbol: "KSh"  },
  { name: "Libya",                 flag: "🇱🇾", currency: "LYD", symbol: "ل.د"  },
  { name: "Madagascar",            flag: "🇲🇬", currency: "MGA", symbol: "Ar"   },
  { name: "Malawi",                flag: "🇲🇼", currency: "MWK", symbol: "MK"   },
  { name: "Mali",                  flag: "🇲🇱", currency: "XOF", symbol: "CFA"  },
  { name: "Mauritius",             flag: "🇲🇺", currency: "MUR", symbol: "Rs"   },
  { name: "Morocco",               flag: "🇲🇦", currency: "MAD", symbol: "د.م." },
  { name: "Mozambique",            flag: "🇲🇿", currency: "MZN", symbol: "MT"   },
  { name: "Namibia",               flag: "🇳🇦", currency: "NAD", symbol: "N$"   },
  { name: "Nigeria",               flag: "🇳🇬", currency: "NGN", symbol: "₦"    },
  { name: "Rwanda",                flag: "🇷🇼", currency: "RWF", symbol: "FRw"  },
  { name: "Senegal",               flag: "🇸🇳", currency: "XOF", symbol: "CFA"  },
  { name: "Sierra Leone",          flag: "🇸🇱", currency: "SLL", symbol: "Le"   },
  { name: "Somalia",               flag: "🇸🇴", currency: "SOS", symbol: "Sh"   },
  { name: "South Africa",          flag: "🇿🇦", currency: "ZAR", symbol: "R"    },
  { name: "Sudan",                 flag: "🇸🇩", currency: "SDG", symbol: "SDG"  },
  { name: "Tanzania",              flag: "🇹🇿", currency: "TZS", symbol: "TSh"  },
  { name: "Tunisia",               flag: "🇹🇳", currency: "TND", symbol: "DT"   },
  { name: "Uganda",                flag: "🇺🇬", currency: "UGX", symbol: "USh"  },
  { name: "Zambia",                flag: "🇿🇲", currency: "ZMW", symbol: "ZK"   },
  { name: "Zimbabwe",              flag: "🇿🇼", currency: "ZWL", symbol: "Z$"   },
  // Americas
  { name: "Argentina",             flag: "🇦🇷", currency: "ARS", symbol: "$"    },
  { name: "Bahamas",               flag: "🇧🇸", currency: "BSD", symbol: "B$"   },
  { name: "Barbados",              flag: "🇧🇧", currency: "BBD", symbol: "Bds$" },
  { name: "Belize",                flag: "🇧🇿", currency: "BZD", symbol: "BZ$"  },
  { name: "Bolivia",               flag: "🇧🇴", currency: "BOB", symbol: "Bs."  },
  { name: "Brazil",                flag: "🇧🇷", currency: "BRL", symbol: "R$"   },
  { name: "Chile",                 flag: "🇨🇱", currency: "CLP", symbol: "$"    },
  { name: "Colombia",              flag: "🇨🇴", currency: "COP", symbol: "$"    },
  { name: "Costa Rica",            flag: "🇨🇷", currency: "CRC", symbol: "₡"    },
  { name: "Cuba",                  flag: "🇨🇺", currency: "CUP", symbol: "$"    },
  { name: "Dominican Republic",    flag: "🇩🇴", currency: "DOP", symbol: "RD$"  },
  { name: "Ecuador",               flag: "🇪🇨", currency: "USD", symbol: "$"    },
  { name: "El Salvador",           flag: "🇸🇻", currency: "USD", symbol: "$"    },
  { name: "Guatemala",             flag: "🇬🇹", currency: "GTQ", symbol: "Q"    },
  { name: "Guyana",                flag: "🇬🇾", currency: "GYD", symbol: "G$"   },
  { name: "Haiti",                 flag: "🇭🇹", currency: "HTG", symbol: "G"    },
  { name: "Honduras",              flag: "🇭🇳", currency: "HNL", symbol: "L"    },
  { name: "Jamaica",               flag: "🇯🇲", currency: "JMD", symbol: "J$"   },
  { name: "Mexico",                flag: "🇲🇽", currency: "MXN", symbol: "$"    },
  { name: "Nicaragua",             flag: "🇳🇮", currency: "NIO", symbol: "C$"   },
  { name: "Panama",                flag: "🇵🇦", currency: "PAB", symbol: "B/."  },
  { name: "Paraguay",              flag: "🇵🇾", currency: "PYG", symbol: "₲"    },
  { name: "Peru",                  flag: "🇵🇪", currency: "PEN", symbol: "S/"   },
  { name: "Puerto Rico",           flag: "🇵🇷", currency: "USD", symbol: "$"    },
  { name: "Trinidad & Tobago",     flag: "🇹🇹", currency: "TTD", symbol: "TT$"  },
  { name: "Uruguay",               flag: "🇺🇾", currency: "UYU", symbol: "$U"   },
  { name: "Venezuela",             flag: "🇻🇪", currency: "VES", symbol: "Bs.S" },
  // Oceania
  { name: "Fiji",                  flag: "🇫🇯", currency: "FJD", symbol: "FJ$"  },
  { name: "Papua New Guinea",      flag: "🇵🇬", currency: "PGK", symbol: "K"    },
  { name: "Samoa",                 flag: "🇼🇸", currency: "WST", symbol: "T"    },
  { name: "Tonga",                 flag: "🇹🇴", currency: "TOP", symbol: "T$"   },
  { name: "Vanuatu",               flag: "🇻🇺", currency: "VUV", symbol: "Vt"   },
];

/* ─── Popular currencies for salary step ─── */
const POPULAR_CURRENCIES = [
  { code: "USD", symbol: "$",    label: "USD" },
  { code: "GBP", symbol: "£",    label: "GBP" },
  { code: "EUR", symbol: "€",    label: "EUR" },
  { code: "AED", symbol: "د.إ",  label: "AED" },
  { code: "CAD", symbol: "CA$",  label: "CAD" },
  { code: "AUD", symbol: "A$",   label: "AUD" },
  { code: "SGD", symbol: "S$",   label: "SGD" },
  { code: "INR", symbol: "₹",    label: "INR" },
  { code: "CHF", symbol: "Fr",   label: "CHF" },
  { code: "JPY", symbol: "¥",    label: "JPY" },
];

/* ─── Slide animation variants ─── */
const variants = {
  enter: (dir: Direction) => ({ y: dir === "forward" ? 48 : -48, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (dir: Direction) => ({ y: dir === "forward" ? -48 : 48, opacity: 0 }),
};

const transition = { duration: 0.38, ease: [0.32, 0.72, 0, 1] };

/* ─── Progress bar ─── */
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="fixed top-0 inset-x-0 z-50 h-0.5 bg-white/10">
      <motion.div
        className="h-full bg-[#cce832]"
        initial={false}
        animate={{ width: `${((current + 1) / total) * 100}%` }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      />
    </div>
  );
}

/* ─── Main component ─── */
export default function OnboardingPage() {
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<Direction>("forward");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    fullName: "",
    field: "",
    role: "",
    yearsExp: "",
    jobType: "",
    level: "",
    targetCountries: [],
    remotePreference: "",
    currencyCode: "USD",
    currencySymbol: "$",
    salaryMin: "",
    salaryMax: "",
    linkedinUrl: "",
    resumeChoice: "",
    niche: "",
  });

  // Pre-fill name from Clerk
  useEffect(() => {
    if (user?.fullName && !form.fullName) {
      setForm((f) => ({ ...f, fullName: user.fullName ?? "" }));
    }
  }, [user, form.fullName]);

  // Focus appropriate input on step change + reset country search
  useEffect(() => {
    setCountrySearch("");
    const t = setTimeout(() => {
      if (STEPS[step].id === "region") {
        countrySearchRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 420);
    return () => clearTimeout(t);
  }, [step]);

  // When navigating to the salary step, re-sync currency with the primary country.
  // This prevents stale currency showing when user goes back and changes countries.
  useEffect(() => {
    if (currentStep.id !== "salary") return;
    setForm((f) => {
      const primary = f.targetCountries.find(
        (c) => c.name !== "Remote only" && c.name !== "Global (Any)"
      ) ?? f.targetCountries[0];
      if (!primary || primary.currency === f.currencyCode) return f;
      return { ...f, currencyCode: primary.currency, currencySymbol: primary.symbol };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]); // only re-run on step change, not every form update

  // Filtered country list
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [countrySearch]);

  const currentStep = STEPS[step];

  const canAdvance = useCallback((): boolean => {
    switch (currentStep.id) {
      case "name":   return form.fullName.trim().length > 1;
      case "field":  return form.field.trim().length > 1;
      case "role":   return form.role.trim().length > 1;
      case "exp":    return form.yearsExp.trim().length > 0;
      case "type":   return form.jobType.length > 0;
      case "region": return form.targetCountries.length > 0;
      case "remote": return form.remotePreference.length > 0;
      case "salary": return form.salaryMin.length > 0 && form.salaryMax.length > 0;
      case "resume": return form.resumeChoice.length > 0;
      case "niche":  return form.niche.trim().length > 5;
      default:       return false;
    }
  }, [currentStep.id, form]);

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      // The API route sets the __landed_ob cookie in its response headers.
      // The middleware reads that cookie immediately on the next request, so
      // /dashboard is unblocked without waiting for Clerk's JWT to propagate.
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }, [form]);

  const advance = useCallback(async () => {
    if (!canAdvance()) return;
    setError("");
    if (step < STEPS.length - 1) {
      setDir("forward");
      setStep((s) => s + 1);
    } else {
      await submit();
    }
  }, [canAdvance, step, submit]);

  const back = useCallback(() => {
    if (step === 0) return;
    setDir("back");
    setStep((s) => s - 1);
  }, [step]);

  // Keyboard: Enter to advance, Escape to go back / clear search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Don't fire advance when typing in country search
        if (currentStep.id === "region" && (e.target as HTMLElement).tagName === "INPUT") return;
        e.preventDefault();
        advance();
      }
      if (e.key === "Escape") {
        if (currentStep.id === "region" && countrySearch) {
          setCountrySearch("");
          return;
        }
        back();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, back, currentStep.id, countrySearch]);

  /* ─── Country toggle — auto-sets currency from primary country ─── */
  const toggleCountry = useCallback((c: TargetCountry) => {
    setForm((f) => {
      const exists = f.targetCountries.some((x) => x.name === c.name);
      const newCountries = exists
        ? f.targetCountries.filter((x) => x.name !== c.name)
        : [...f.targetCountries, c];
      const primary = newCountries[0];
      return {
        ...f,
        targetCountries: newCountries,
        currencyCode: primary?.currency ?? "USD",
        currencySymbol: primary?.symbol ?? "$",
      };
    });
  }, []);

  const toggleJobType = (t: string) =>
    setForm((f) => ({ ...f, jobType: f.jobType === t ? "" : t }));

  /* ─── Render per-step input ─── */
  const renderInput = () => {
    switch (currentStep.id) {

      case "name":
        return (
          <input
            ref={inputRef}
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Your full name"
            className="tf-input"
          />
        );

      case "field":
        return (
          <div className="space-y-3 w-full max-w-xl">
            <input
              ref={inputRef}
              value={form.field}
              onChange={(e) => setForm((f) => ({ ...f, field: e.target.value }))}
              placeholder="e.g. Graphic Design, Advertising..."
              className="tf-input"
            />
            <div className="flex flex-wrap gap-2 mt-4">
              {FIELD_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, field: s }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-mono transition-all border ${
                    form.field === s
                      ? "bg-[#cce832] text-[#1a1e16] border-[#cce832]"
                      : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/70"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        );

      case "role":
        return (
          <input
            ref={inputRef}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            placeholder="e.g. Senior Art Director"
            className="tf-input"
          />
        );

      case "exp":
        return (
          <div className="space-y-3 w-full max-w-xl">
            <input
              ref={inputRef}
              type="number"
              min="0"
              max="50"
              value={form.yearsExp}
              onChange={(e) => setForm((f) => ({ ...f, yearsExp: e.target.value }))}
              placeholder="Years of experience"
              className="tf-input"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {LEVEL_OPTS.map((l) => (
                <button
                  key={l}
                  onClick={() => setForm((f) => ({ ...f, level: l }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-mono transition-all border ${
                    form.level === l
                      ? "bg-[#cce832] text-[#1a1e16] border-[#cce832]"
                      : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/70"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        );

      case "type":
        return (
          <div className="flex flex-wrap gap-3">
            {JOB_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => toggleJobType(t)}
                className={`px-5 py-3 rounded-xl text-base font-medium transition-all border ${
                  form.jobType === t
                    ? "bg-[#cce832] text-[#1a1e16] border-[#cce832]"
                    : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        );

      case "region":
        return (
          <div className="w-full max-w-2xl space-y-3">
            {/* Selected countries chips */}
            {form.targetCountries.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {form.targetCountries.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => toggleCountry(c)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#cce832]/10 border border-[#cce832] text-[#cce832] text-sm font-medium hover:bg-[#cce832]/20 transition-colors"
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span>{c.name}</span>
                    <span className="text-xs text-[#cce832]/60 font-mono">{c.currency}</span>
                    <X size={11} className="opacity-60" />
                  </button>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                ref={countrySearchRef}
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#cce832]/30 font-mono transition-colors"
              />
              {countrySearch && (
                <button
                  onClick={() => setCountrySearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Country list */}
            <div className="max-h-72 overflow-y-auto space-y-0.5 pr-0.5 [scrollbar-width:thin] [scrollbar-color:#ffffff10_transparent]">
              {filteredCountries.length === 0 ? (
                <div className="text-sm text-white/20 font-mono px-4 py-6 text-center">
                  No countries match &quot;{countrySearch}&quot;
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const selected = form.targetCountries.some((x) => x.name === c.name);
                  return (
                    <button
                      key={c.name}
                      onClick={() => toggleCountry(c)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all ${
                        selected
                          ? "bg-[#cce832]/10 text-[#cce832]"
                          : "hover:bg-white/5 text-white/60 hover:text-white"
                      }`}
                    >
                      <span className="text-xl w-7 flex-shrink-0 text-center leading-none">{c.flag}</span>
                      <span className="text-sm font-medium flex-1">{c.name}</span>
                      <span className="text-xs font-mono text-white/20 flex-shrink-0">
                        {c.symbol} {c.currency}
                      </span>
                      {selected && (
                        <CheckCircle2 size={14} className="text-[#cce832] flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {form.targetCountries.length > 0 && (
              <p className="text-xs text-white/20 font-mono">
                {form.targetCountries.length} {form.targetCountries.length === 1 ? "country" : "countries"} selected
                {" · "}primary currency auto-set to{" "}
                <span className="text-[#cce832]/60">{form.currencySymbol} {form.currencyCode}</span>
              </p>
            )}
          </div>
        );

      case "remote":
        return (
          <div className="flex flex-col gap-3 w-full max-w-md">
            {REMOTE_OPTS.map((r) => (
              <button
                key={r}
                onClick={() => setForm((f) => ({ ...f, remotePreference: r }))}
                className={`w-full px-5 py-4 rounded-xl text-left text-base font-medium transition-all border ${
                  form.remotePreference === r
                    ? "bg-[#cce832]/10 border-[#cce832] text-[#cce832]"
                    : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        );

      case "salary": {
        // Currencies from selected real countries (deduplicated)
        const selectedCurrencies = Array.from(
          new Map(
            form.targetCountries
              .filter((c) => c.name !== "Remote only" && c.name !== "Global (Any)")
              .map((c) => [c.currency, { code: c.currency, symbol: c.symbol, label: c.currency }])
          ).values()
        );
        // Popular currencies not already covered by selections
        const extraPopular = POPULAR_CURRENCIES.filter(
          (pc) => !selectedCurrencies.some((sc) => sc.code === pc.code)
        );
        // Selected-country currencies always appear first; fall back to all popular if none
        const currencyOptions =
          selectedCurrencies.length > 0
            ? [...selectedCurrencies, ...extraPopular]
            : POPULAR_CURRENCIES;

        const primaryCountry =
          form.targetCountries.find(
            (c) => c.name !== "Remote only" && c.name !== "Global (Any)"
          ) ?? form.targetCountries[0];

        return (
          <div className="space-y-4 w-full max-w-md">
            {primaryCountry && primaryCountry.name !== "Remote only" && primaryCountry.name !== "Global (Any)" && (
              <div className="flex items-center gap-2 text-xs text-white/25 font-mono">
                <span>{primaryCountry.flag}</span>
                <span>
                  {selectedCurrencies.length > 1
                    ? `${selectedCurrencies.length} currencies from your selections`
                    : `Auto-detected from ${primaryCountry.name}`}
                </span>
              </div>
            )}
            {/* Currency picker */}
            <div className="flex flex-wrap items-center gap-2">
              {currencyOptions.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setForm((f) => ({ ...f, currencyCode: c.code, currencySymbol: c.symbol }))}
                  className={`px-3 py-1.5 rounded-lg font-mono text-sm font-medium border transition-all ${
                    form.currencyCode === c.code
                      ? "bg-[#cce832] text-[#1a1e16] border-[#cce832]"
                      : "border-white/10 text-white/40 hover:text-white hover:border-white/30"
                  }`}
                >
                  {c.symbol} {c.label}
                </button>
              ))}
            </div>
            {/* Salary inputs */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-white/30 font-mono mb-1 block">Minimum</label>
                <input
                  ref={inputRef}
                  value={form.salaryMin}
                  onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                  placeholder={`${form.currencySymbol}80,000`}
                  className="tf-input-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-white/30 font-mono mb-1 block">Maximum</label>
                <input
                  value={form.salaryMax}
                  onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                  placeholder={`${form.currencySymbol}130,000`}
                  className="tf-input-sm"
                />
              </div>
            </div>
          </div>
        );
      }

      case "resume":
        return (
          <div className="flex flex-col gap-3 w-full max-w-md">
            {/* Option A: Upload */}
            <button
              onClick={() => setForm((f) => ({ ...f, resumeChoice: "upload" }))}
              className={`w-full px-5 py-5 rounded-xl text-left transition-all border ${
                form.resumeChoice === "upload"
                  ? "bg-[#cce832]/10 border-[#cce832]"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <Upload size={18} className={form.resumeChoice === "upload" ? "text-[#cce832]" : "text-white/30"} />
                <div>
                  <div className={`font-medium text-sm ${form.resumeChoice === "upload" ? "text-[#cce832]" : "text-white/70"}`}>
                    Upload my existing resume
                  </div>
                  <div className="text-xs text-white/30 mt-0.5">PDF, DOCX — we&apos;ll parse and tailor it per job</div>
                </div>
              </div>
            </button>

            {/* File picker — appears when upload is selected */}
            {form.resumeChoice === "upload" && (
              <label className="w-full cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setResumeFile(file);
                  }}
                />
                <div
                  className={`w-full px-5 py-4 rounded-xl border-2 border-dashed transition-all ${
                    resumeFile
                      ? "border-[#cce832]/50 bg-[#cce832]/5"
                      : "border-white/10 hover:border-white/25 bg-white/[0.02]"
                  }`}
                >
                  {resumeFile ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-[#cce832] flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm text-[#cce832] font-medium truncate">{resumeFile.name}</div>
                        <div className="text-xs text-white/30 mt-0.5 font-mono">
                          {(resumeFile.size / 1024).toFixed(0)} KB · Click to change
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Upload size={16} className="text-white/20 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-white/40">Click to select your file</div>
                        <div className="text-xs text-white/20 mt-0.5 font-mono">PDF, DOC, or DOCX · Max 10 MB</div>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            )}

            {/* Option B: Build with AI */}
            <button
              onClick={() => { setResumeFile(null); setForm((f) => ({ ...f, resumeChoice: "build" })); }}
              className={`w-full px-5 py-5 rounded-xl text-left transition-all border ${
                form.resumeChoice === "build"
                  ? "bg-[#cce832]/10 border-[#cce832]"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className={form.resumeChoice === "build" ? "text-[#cce832]" : "text-white/30"} />
                <div>
                  <div className={`font-medium text-sm ${form.resumeChoice === "build" ? "text-[#cce832]" : "text-white/70"}`}>
                    Build my resume with AI
                  </div>
                  <div className="text-xs text-white/30 mt-0.5">We&apos;ll ask about your experience and generate an ATS-beating CV</div>
                </div>
              </div>
            </button>
          </div>
        );

      case "niche":
        return (
          <div className="w-full max-w-xl space-y-3">
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={form.niche}
              onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
              placeholder="Senior graphic designer with 15 years in FMCG brand campaigns and advertising agencies..."
              rows={3}
              className="tf-input resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  advance();
                }
              }}
            />
            <div className="text-xs text-white/20 font-mono">Shift+Enter for new line · Enter to continue</div>
          </div>
        );

      default:
        return null;
    }
  };

  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <ProgressBar current={step} total={STEPS.length} />

      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Landed" className="h-7 w-auto" />
        </div>
        <div className="text-xs text-white/20 font-mono">
          {step + 1} / {STEPS.length}
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={transition}
              className="flex flex-col items-start gap-6"
            >
              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-[#cce832]/10 flex items-center justify-center flex-shrink-0">
                  <currentStep.icon size={15} className="text-[#cce832]" />
                </div>
                <span className="text-xs font-mono text-[#cce832]/50 uppercase tracking-widest">
                  {step + 1} →
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-semibold tracking-[-1.5px] leading-tight">
                {currentStep.question}
              </h2>
              <p className="text-white/40 text-base">{currentStep.sub}</p>

              {/* Input */}
              <div className="w-full">{renderInput()}</div>

              {/* Error */}
              {error && (
                <div className="text-sm text-red-400 font-mono">{error}</div>
              )}

              {/* Navigation */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={advance}
                  disabled={!canAdvance() || saving}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all ${
                    canAdvance() && !saving
                      ? "bg-[#cce832] text-[#1a1e16] hover:opacity-90"
                      : "bg-white/5 text-white/20 cursor-not-allowed"
                  }`}
                >
                  {saving ? (
                    <span className="font-mono text-sm">Setting up your account...</span>
                  ) : isLast ? (
                    <>Start applying <CheckCircle2 size={15} /></>
                  ) : (
                    <>OK, next <ArrowRight size={15} /></>
                  )}
                </button>

                {step > 0 && !saving && (
                  <button
                    onClick={back}
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                )}

                {!isLast && (
                  <span className="text-xs text-white/20 font-mono ml-1">
                    or press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Enter</kbd>
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
