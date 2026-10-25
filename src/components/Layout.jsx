import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { T } from "../theme";
import { api, endpoints, getStoredUser, normalizeList, resolveAssetUrl } from "../api/client";
import { Icon } from "./Icons";

const useIsMobile = () => {
  const get = () => (typeof window !== "undefined" ? window.innerWidth <= 768 : false);
  const [mobile, setMobile] = useState(get);
  useEffect(() => {
    const onResize = () => setMobile(get());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
};

const NAV = [
  { path: "/dashboard", icon: "home", label: "Dashboard" },
  { path: "/tasks", icon: "tasks", label: "Tasks" },
  { path: "/meetings", icon: "calendar", label: "Meetings / MOM" },
  { path: "/notes", icon: "note", label: "Notes" },
  { path: "/expenses", icon: "wallet", label: "Expenses" },
  { path: "/documents", icon: "files", label: "DMS / Documents" },
  { path: "/leave", icon: "leave", label: "Leave / Holiday" },
  { path: "/salary", icon: "wallet", label: "Salary / Payments" },
  { path: "/emails", icon: "mail", label: "Emails" },
  { path: "/social", icon: "users", label: "People / Invites" },
  { path: "/chat", icon: "message", label: "Chat" },
  { path: "/reports", icon: "chart", label: "Reports" },
];

const RENTAL = [
  { path: "/rental", icon: "home", label: "Rental Overview", end: true },
  { path: "/rental/collection", icon: "wallet", label: "Collect Rent" },
  { path: "/rental/properties", icon: "building", label: "Properties & Units" },
  { path: "/rental/tenants", icon: "users", label: "Tenants" },
  { path: "/rental/agreements", icon: "clipboard", label: "Agreements" },
  { path: "/rental/electricity", icon: "bolt", label: "Electricity" },
  { path: "/rental/expenses", icon: "archive", label: "Property Expenses" },
  { path: "/rental/charges", icon: "settings", label: "Fixed Charges" },
  { path: "/rental/reports", icon: "chart", label: "Rental Reports" },
];

const MGMT = [
  { path: "/management/jobs", icon: "building", label: "Jobs" },
  { path: "/management/sources", icon: "briefcase", label: "Freelancing Sources" },
  { path: "/management/projects", icon: "folder", label: "Projects" },
  { path: "/management/employees", icon: "users", label: "Employees / Members" },
  { path: "/management/email-types", icon: "tag", label: "Email Types" },
  { path: "/management/email-templates", icon: "mail", label: "Email Templates" },
  { path: "/management/email-variables", icon: "variables", label: "Email Variables" },
  { path: "/management/designations", icon: "idCard", label: "Designations" },
  { path: "/management/salary-changes", icon: "trend", label: "Salary Changes" },
  { path: "/management/document-categories", icon: "archive", label: "Document Categories" },
  { path: "/management/settings", icon: "settings", label: "Settings" },
];

const NavItem = ({ path, icon, label, small, end }) => (
  <NavLink
    to={path}
    end={end}
    style={({ isActive }) => ({
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: small ? "7px 11px" : "9px 12px",
      borderRadius: 8,
      marginBottom: 2,
      textDecoration: "none",
      background: isActive ? "rgba(201,168,76,.15)" : "transparent",
      borderLeft: isActive ? `3px solid ${T.gold}` : "3px solid transparent",
      transition: "all .15s",
    })}
  >
    {({ isActive }) => (
      <>
        <Icon name={icon} size={small ? 15 : 17} style={{ color: isActive ? T.gold : "rgba(255,255,255,.72)" }} />
        <span style={{ fontSize: small ? 12 : 13, fontWeight: isActive ? 600 : 400, color: isActive ? T.gold : "rgba(255,255,255,.75)" }}>
          {label}
        </span>
      </>
    )}
  </NavLink>
);

export const Sidebar = () => {
  const navigate = useNavigate();
  const user = getStoredUser() || {};
  const initials = (user.full_name || user.email || "U").split(/[ @]/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "U";
  const logout = () => { api.auth.logout(); navigate("/login", { replace: true }); };

  return (
    <aside style={{ width: 232, minHeight: "100vh", background: T.navy, display: "flex", flexDirection: "column", padding: "0 0 16px", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.1)", marginBottom: 8 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.white, letterSpacing: "-0.02em" }}>WorkManager</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Personal Work Suite</div>
      </div>
      <div style={{ padding: "6px 10px", flex: 1 }}>
        {NAV.map((n) => <NavItem key={n.path} {...n} />)}
        <div style={{ margin: "16px 0 8px", padding: "0 12px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Rental Management</span>
        </div>
        {RENTAL.map((n) => <NavItem key={n.path} {...n} small />)}
        <div style={{ margin: "16px 0 8px", padding: "0 12px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Management</span>
        </div>
        {MGMT.map((n) => <NavItem key={n.path} {...n} small />)}
      </div>
      <div style={{ margin: "0 10px", padding: 12, borderRadius: 8, background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.white, flexShrink: 0 }}>{initials}</div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.full_name || "User"}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email || ""}</div>
        </div>
        <button onClick={logout} title="Logout" style={{ width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: "rgba(255,255,255,.55)", cursor: "pointer" }}>
          <Icon name="logout" size={17} />
        </button>
      </div>
    </aside>
  );
};

function NotificationMenu() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const [list, count] = await Promise.all([
        api.list(endpoints.socialNotifications, { page_size: 8 }),
        api.get(`${endpoints.socialNotifications}count/`),
      ]);
      setItems(normalizeList(list));
      setUnread(Number(count?.unread || 0));
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const openNotification = async (item) => {
    try {
      if (!item.is_read) await api.create(`${endpoints.socialNotifications}${item.id}/mark_read/`, {});
    } catch { /* navigation remains available */ }
    setOpen(false);
    setUnread((value) => Math.max(0, value - (item.is_read ? 0 : 1)));
    navigate(item.payload?.path || "/social");
  };

  const markAllRead = async () => {
    await api.create(`${endpoints.socialNotifications}mark-all-read/`, {});
    setUnread(0);
    setItems((rows) => rows.map((row) => ({ ...row, is_read: true })));
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button type="button" onClick={() => { setOpen((v) => !v); if (!open) load(); }} aria-label="Notifications" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`, background: T.white, color: T.navy, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
        <Icon name="bell" size={18} />
        {unread > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: T.error, color: T.white, fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 44, width: "min(380px, calc(100vw - 24px))", maxHeight: 460, overflow: "hidden", background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: "0 18px 50px rgba(15,23,42,.18)", zIndex: 220 }}>
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <strong style={{ color: T.navy }}>Notifications</strong>
            {unread > 0 && <button type="button" onClick={markAllRead} style={{ border: 0, background: "transparent", color: T.goldDark, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Mark all read</button>}
          </div>
          <div style={{ maxHeight: 390, overflowY: "auto" }}>
            {!items.length ? (
              <div style={{ padding: 24, textAlign: "center", color: T.slateLight }}><Icon name="bell" size={26} /><div style={{ marginTop: 8, fontSize: 12 }}>No notifications yet.</div></div>
            ) : items.map((item) => (
              <button key={item.id} type="button" onClick={() => openNotification(item)} style={{ width: "100%", border: 0, borderBottom: `1px solid ${T.border}`, background: item.is_read ? T.white : T.goldLight, padding: 12, display: "flex", gap: 10, textAlign: "left", cursor: "pointer" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.navyTint, display: "inline-flex", alignItems: "center", justifyContent: "center", color: T.navy, overflow: "hidden", flexShrink: 0 }}>
                  {item.actor_user?.profile_photo ? <img src={resolveAssetUrl(item.actor_user.profile_photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="note" size={16} />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: T.navy, fontWeight: item.is_read ? 600 : 800, fontSize: 12 }}>{item.title}</div>
                  <div style={{ color: T.slateLight, fontSize: 11, lineHeight: 1.45, marginTop: 3 }}>{item.message}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const AppHeader = () => {
  const mobile = useIsMobile();
  const location = useLocation();
  const labels = {
    "/dashboard": "Dashboard", "/tasks": "Tasks", "/meetings": "Meetings / MOM", "/notes": "Notes", "/expenses": "Expenses", "/documents": "DMS / Documents",
    "/leave": "Leave & Holidays", "/salary": "Salary & Payments", "/emails": "Emails", "/social": "People & Invitations", "/chat": "Chat", "/reports": "Reports",
    "/management/jobs": "Management › Jobs", "/management/sources": "Management › Freelancing Sources", "/management/projects": "Management › Projects",
    "/management/employees": "Management › Employees", "/management/email-types": "Management › Email Types", "/management/email-templates": "Management › Email Templates",
    "/management/email-variables": "Management › Email Variables", "/management/designations": "Management › Designations",
    "/management/salary-changes": "Management › Salary Changes",
    "/rental": "Rental › Overview", "/rental/collection": "Rental › Collect Rent", "/rental/properties": "Rental › Properties & Units", "/rental/tenants": "Rental › Tenants",
    "/rental/agreements": "Rental › Agreements", "/rental/electricity": "Rental › Electricity", "/rental/expenses": "Rental › Property Expenses",
    "/rental/charges": "Rental › Fixed Charges", "/rental/reports": "Rental › Reports", "/management/document-categories": "Management › Document Categories", "/management/settings": "Management › Settings",
  };
  const path = "/" + location.pathname.split("/").slice(1, 3).join("/");
  const label = labels[path] || labels[location.pathname] || "WorkManager";
  const user = getStoredUser() || {};

  return (
    <header style={{ height: mobile ? 52 : 56, background: T.white, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "0 12px" : "0 28px", flexShrink: 0, position: "sticky", top: 0, zIndex: 110 }}>
      <span style={{ fontSize: mobile ? 12 : 13, fontWeight: 600, color: T.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mobile ? "WorkManager" : label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: mobile ? 10 : 18 }}>
        {!mobile && <span style={{ fontSize: 12, color: T.slateLight, display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="clock" size={15} />{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>}
        <NotificationMenu />
        <div title={user.full_name || user.email || "User"} style={{ width: 32, height: 32, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.white }}>
          {(user.full_name || user.email || "U").slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
};

const BottomNav = () => (
  <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, minHeight: 64, paddingBottom: "env(safe-area-inset-bottom)", background: T.white, borderTop: `1px solid ${T.border}`, zIndex: 120, display: "grid", gridTemplateColumns: "repeat(5,1fr)", boxShadow: "0 -8px 24px rgba(15,23,42,.08)" }}>
    {[...NAV.slice(0, 4), { path: "/rental", icon: "building", label: "Rental" }].map((n) => (
      <NavLink key={n.path} to={n.path} style={({ isActive }) => ({ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, minHeight: 62, textDecoration: "none", fontSize: 10, color: isActive ? T.goldDark : T.slateLight, fontWeight: isActive ? 700 : 500 })}>
        <Icon name={n.icon} size={19} />
        <span>{n.label.split(" ")[0]}</span>
      </NavLink>
    ))}
  </nav>
);

export const Layout = ({ children }) => {
  const mobile = useIsMobile();
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {!mobile && <Sidebar />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <AppHeader />
        <main style={{ flex: 1, padding: mobile ? "14px 10px 84px" : "28px 32px", overflowY: "auto", background: T.cream }}>{children}</main>
        {mobile && <BottomNav />}
      </div>
    </div>
  );
};
