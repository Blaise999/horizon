// src/config/routes.ts
// Horizon – Centralized routes config (Next.js)
// Single file controlling all internal navigation

/* -------------------------------------------------------------------------- */
/*  Core path dictionary                                                      */
/* -------------------------------------------------------------------------- */

export const PATHS = {
  // Primary
  HOME: "/",
  CREATE_ACCOUNT: "/create-account",
  SIGN_IN: "/sign-in",
  PRICING: "/pricing",

  // Consumer / business product (top-level)
  CARDS: "/cards",
  PAYMENTS: "/payments",           // keep for future (falls back via resolver if unused)
  INTERNATIONAL: "/international", // keep for future
  SECURITY: "/security",
  SUPPORT: "/support",
  ABOUT: "/about",

  /* ---------- Pages present in your repo tree ----------------------------- */
  PERSONAL: "/personal",
  SAVINGS: "/savings",
  INVEST: "/invest",
  INVOICING: "/invoicing",
  EXPENSE_CARDS: "/expense-cards",

  /* ---------- Dashboard (nested app) ------------------------------------- */
  DASHBOARD_ROOT: "/dashboard",
  DASHBOARD_HOME: "/dashboard/dashboard",
  DASHBOARD_WELCOME: "/dashboard/welcome",
  DASHBOARD_ONBOARDING: "/dashboard/onboarding",
  DASHBOARD_LOGIN: "/dashboard/loginpage", // ✅ added new login page
  NOTIFICATIONS: "/notifications",
  
  /* ---------- Transfer (App Router pages under src/app/Transfer) ---------- */
  TRANSFER_ROOT: "/Transfer",
  TRANSFER_METHOD: "/Transfer/transfermethod", // NEW: hub page
  TRANSFER_USA: "/Transfer/USA",
  TRANSFER_WIRE: "/Transfer/wire",
  TRANSFER_INTL: "/Transfer/intl",
  TRANSFER_CRYPTO: "/Transfer/crypto",
  TRANSFER_ADD: "/Transfer/add",
  TRANSFER_PAYBILL: "/Transfer/paybill",
  TRANSFER_SUCCESS: "/Transfer/success",
  TRANSFER_PENDING: "/Transfer/pending",
  TRANSFER_FAILED: "/Transfer/failed",

  // Third-party rails (assumed pages exist under app/Transfer/*)
  TRANSFER_PAYPAL: "/Transfer/paypal",
  TRANSFER_WISE: "/Transfer/wise",
  TRANSFER_VENMO: "/Transfer/venmo",
  TRANSFER_ZELLE: "/Transfer/zelle",
  TRANSFER_REVOLUT: "/Transfer/revolut",
  TRANSFER_ALIPAY: "/Transfer/alipay",
  TRANSFER_WECHAT: "/Transfer/wechat",

  /* ---------- Company / marketing ---------------------------------------- */
  BLOG: "/blog",
  CAREERS: "/careers",

  /* ---------- Optional/aux (safe to keep) -------------------------------- */
  DOWNLOAD: "/download",
  STATUS: "/status",
  DEVELOPERS: "/developers",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  LICENSES: "/licenses",
  DISCLOSURES: "/disclosures",
  INSIGHTS: "/insights",
  CONTACT: "/contact",

  /* ---------- Legacy alias (kept to avoid import breaks) ------------------ */
  CARDS_CONTROLS: "/cards",
} as const;

export type PathKey = keyof typeof PATHS;
export type PathValue = typeof PATHS[PathKey];

/* -------------------------------------------------------------------------- */
/*  Route items (for menus, maps to PATHS)                                    */
/* -------------------------------------------------------------------------- */

export type RouteItem = {
  name: string;
  path: PathValue;
  cta?: boolean;    // highlight in header/footer
  hidden?: boolean; // routable but not shown in nav
};

export const ROUTES: RouteItem[] = [
  { name: "Home", path: PATHS.HOME },
  { name: "Create Account", path: PATHS.CREATE_ACCOUNT, cta: true },
  { name: "Sign In", path: PATHS.SIGN_IN },
  { name: "Pricing", path: PATHS.PRICING },

  { name: "Cards", path: PATHS.CARDS },
  { name: "Invoicing", path: PATHS.INVOICING, hidden: true },
  { name: "Expense Cards", path: PATHS.EXPENSE_CARDS, hidden: true },
  { name: "Payments", path: PATHS.PAYMENTS, hidden: true },
  { name: "International", path: PATHS.INTERNATIONAL, hidden: true },
  { name: "Security", path: PATHS.SECURITY },
  { name: "Support", path: PATHS.SUPPORT },
  { name: "About", path: PATHS.ABOUT },

  /* ---- Optional/aux (usually not in top nav; keep hidden by default) ---- */
  { name: "Personal", path: PATHS.PERSONAL, hidden: true },
  { name: "Cards & Controls", path: PATHS.CARDS_CONTROLS, hidden: true },
  { name: "Savings & Goals", path: PATHS.SAVINGS, hidden: true },
  { name: "Invest & Grow", path: PATHS.INVEST, hidden: true },
  { name: "Blog / Press", path: PATHS.BLOG, hidden: true },
  { name: "Careers", path: PATHS.CAREERS, hidden: true },
  { name: "Download", path: PATHS.DOWNLOAD, hidden: true },
  { name: "Status", path: PATHS.STATUS, hidden: true },
  { name: "Developers", path: PATHS.DEVELOPERS, hidden: true },
  { name: "Privacy", path: PATHS.PRIVACY, hidden: true },
  { name: "Terms", path: PATHS.TERMS, hidden: true },
  { name: "Licenses", path: PATHS.LICENSES, hidden: true },
  { name: "Disclosures", path: PATHS.DISCLOSURES, hidden: true },
  { name: "Insights", path: PATHS.INSIGHTS, hidden: true },
  { name: "Contact", path: PATHS.CONTACT, hidden: true },

  /* ---- Dashboard routes (hidden from marketing nav) --------------------- */
  { name: "Dashboard Root", path: PATHS.DASHBOARD_ROOT, hidden: true },
  { name: "Dashboard", path: PATHS.DASHBOARD_HOME, hidden: true },
  { name: "Dashboard Welcome", path: PATHS.DASHBOARD_WELCOME, hidden: true },
  { name: "Dashboard Onboarding", path: PATHS.DASHBOARD_ONBOARDING, hidden: true },
  { name: "Dashboard Login", path: PATHS.DASHBOARD_LOGIN, hidden: true }, // ✅ added route entry

  /* ---- Transfer routes (hidden in top nav, used in app) ----------------- */
  { name: "Transfer", path: PATHS.TRANSFER_ROOT, hidden: true },
  { name: "Transfer Methods", path: PATHS.TRANSFER_METHOD, hidden: true },
  { name: "USA Transfer", path: PATHS.TRANSFER_USA, hidden: true },
  { name: "Wire Transfer", path: PATHS.TRANSFER_WIRE, hidden: true },
  { name: "International Transfer", path: PATHS.TRANSFER_INTL, hidden: true },
  { name: "Crypto Transfer", path: PATHS.TRANSFER_CRYPTO, hidden: true },
  { name: "PayPal", path: PATHS.TRANSFER_PAYPAL, hidden: true },
  { name: "Wise", path: PATHS.TRANSFER_WISE, hidden: true },
  { name: "Venmo", path: PATHS.TRANSFER_VENMO, hidden: true },
  { name: "Zelle", path: PATHS.TRANSFER_ZELLE, hidden: true },
  { name: "Revolut", path: PATHS.TRANSFER_REVOLUT, hidden: true },
  { name: "Alipay", path: PATHS.TRANSFER_ALIPAY, hidden: true },
  { name: "WeChat Pay", path: PATHS.TRANSFER_WECHAT, hidden: true },
  { name: "Add Money", path: PATHS.TRANSFER_ADD, hidden: true },
  { name: "Pay Bill", path: PATHS.TRANSFER_PAYBILL, hidden: true },
  { name: "Transfer Success", path: PATHS.TRANSFER_SUCCESS, hidden: true },
  { name: "Transfer Pending", path: PATHS.TRANSFER_PENDING, hidden: true },
  { name: "Transfer Failed", path: PATHS.TRANSFER_FAILED, hidden: true },
];

/* -------------------------------------------------------------------------- */
/*  Safe resolver: any unknown route -> CREATE_ACCOUNT                        */
/* -------------------------------------------------------------------------- */

const KNOWN_SET: ReadonlySet<string> = new Set(Object.values(PATHS));

export function resolvePath(input?: PathKey | string | null): PathValue {
  if (input && input in PATHS) return PATHS[input as PathKey];
  if (typeof input === "string" && input.startsWith("/") && KNOWN_SET.has(input))
    return input as PathValue;
  return PATHS.CREATE_ACCOUNT;
}

export const to = resolvePath;

/* -------------------------------------------------------------------------- */
/*  Strongly-typed helper for transfer rails                                  */
/* -------------------------------------------------------------------------- */

export type TransferRail =
  | "usa"
  | "wire"
  | "intl"
  | "crypto"
  | "paypal"
  | "wise"
  | "venmo"
  | "zelle"
  | "revolut"
  | "alipay"
  | "wechat";

export function transferPath(rail: TransferRail): PathValue {
  switch (rail) {
    case "usa": return PATHS.TRANSFER_USA;
    case "wire": return PATHS.TRANSFER_WIRE;
    case "intl": return PATHS.TRANSFER_INTL;
    case "crypto": return PATHS.TRANSFER_CRYPTO;
    case "paypal": return PATHS.TRANSFER_PAYPAL;
    case "wise": return PATHS.TRANSFER_WISE;
    case "venmo": return PATHS.TRANSFER_VENMO;
    case "zelle": return PATHS.TRANSFER_ZELLE;
    case "revolut": return PATHS.TRANSFER_REVOLUT;
    case "alipay": return PATHS.TRANSFER_ALIPAY;
    case "wechat": return PATHS.TRANSFER_WECHAT;
  }
}
