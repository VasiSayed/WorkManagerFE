// App modules and their pages. The left rail lists modules; the sub-bar shows the pages of the selected one.
export const MODULES = [
  {
    key: "work",
    label: "Work",
    icon: "tasks",
    color: "#2980B9",
    description: "Dashboard, tasks, meetings, notes, documents and emails.",
    items: [
      { path: "/dashboard", icon: "home", label: "Dashboard" },
      { path: "/tasks", icon: "tasks", label: "Tasks" },
      { path: "/meetings", icon: "calendar", label: "Meetings / MOM" },
      { path: "/notes", icon: "note", label: "Notes" },
      { path: "/documents", icon: "files", label: "DMS / Documents" },
      { path: "/emails", icon: "mail", label: "Emails" },
      { path: "/reports", icon: "chart", label: "Reports" },
    ],
  },
  {
    key: "hr",
    label: "HR",
    icon: "idCard",
    color: "#7C3AED",
    description: "Employees, leave, salary, designations, jobs and projects.",
    items: [
      { path: "/management/employees", icon: "users", label: "Employees / Members" },
      { path: "/leave", icon: "leave", label: "Leave / Holiday" },
      { path: "/salary", icon: "wallet", label: "Salary / Payments" },
      { path: "/management/salary-changes", icon: "trend", label: "Salary Changes" },
      { path: "/management/designations", icon: "idCard", label: "Designations" },
      { path: "/management/jobs", icon: "building", label: "Jobs" },
      { path: "/management/projects", icon: "folder", label: "Projects" },
      { path: "/management/sources", icon: "briefcase", label: "Freelancing Sources" },
    ],
  },
  {
    key: "expense",
    label: "Expense",
    icon: "wallet",
    color: "#2D7D5A",
    description: "Money given and received, with categories and receipts.",
    items: [{ path: "/expenses", icon: "wallet", label: "Expenses" }],
  },
  {
    key: "rental",
    label: "Rental",
    icon: "building",
    color: "#C9A84C",
    description: "Properties, tenants, rent collection, electricity and property expenses.",
    items: [
      { path: "/rental", icon: "home", label: "Overview", end: true },
      { path: "/rental/collection", icon: "wallet", label: "Collect Rent" },
      { path: "/rental/properties", icon: "building", label: "Properties & Units" },
      { path: "/rental/tenants", icon: "users", label: "Tenants" },
      { path: "/rental/agreements", icon: "clipboard", label: "Agreements" },
      { path: "/rental/electricity", icon: "bolt", label: "Electricity" },
      { path: "/rental/expenses", icon: "archive", label: "Property Expenses" },
      { path: "/rental/charges", icon: "settings", label: "Fixed Charges" },
      { path: "/rental/reports", icon: "chart", label: "Reports" },
    ],
  },
  {
    key: "people",
    label: "People",
    icon: "users",
    color: "#DB2777",
    description: "Invitations, connections and chat.",
    items: [
      { path: "/social", icon: "users", label: "People / Invites" },
      { path: "/chat", icon: "message", label: "Chat" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    color: "#4A5568",
    description: "Email types, templates, variables, document categories and app settings.",
    items: [
      { path: "/management/settings", icon: "settings", label: "Settings" },
      { path: "/management/email-types", icon: "tag", label: "Email Types" },
      { path: "/management/email-templates", icon: "mail", label: "Email Templates" },
      { path: "/management/email-variables", icon: "variables", label: "Email Variables" },
      { path: "/management/document-categories", icon: "archive", label: "Document Categories" },
    ],
  },
];

const matches = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

/** The module and page that own a URL (longest matching page path wins). */
export function locate(pathname) {
  let best = null;
  for (const module of MODULES) {
    for (const item of module.items) {
      if (matches(pathname, item.path) && (!best || item.path.length > best.item.path.length)) best = { module, item };
    }
  }
  return best;
}

const LAST_KEY = "wm_last_module";
export function rememberModule(key) {
  try { localStorage.setItem(LAST_KEY, key); } catch { /* storage unavailable */ }
}
export function lastModule() {
  try { return MODULES.find((m) => m.key === localStorage.getItem(LAST_KEY)) || null; } catch { return null; }
}
