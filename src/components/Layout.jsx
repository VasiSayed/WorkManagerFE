import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { T } from "../theme";
import { api, endpoints, getStoredUser, normalizeList, resolveAssetUrl } from "../api/client";
import { Icon } from "./Icons";
import { locate, MODULES, rememberModule } from "../modules";

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

/* ── Main bar (modules) + sub bar (pages of the selected module) ── */

function RailButton({ module, active, onClick }) {
  return (
    <button type="button" onClick={onClick} title={module.description} aria-current={active ? "page" : undefined}
      style={{ width: 60, padding: "9px 0 7px", border: 0, borderRadius: 12, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        background: active ? "rgba(201,168,76,.18)" : "transparent", color: active ? T.gold : "rgba(255,255,255,.66)" }}>
      <Icon name={module.icon} size={20} />
      <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, letterSpacing: ".02em" }}>{module.label}</span>
    </button>
  );
}

function Rail({ current }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser() || {};
  const initials = (user.full_name || user.email || "U").split(/[ @]/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "U";
  const logout = () => { api.auth.logout(); navigate("/login", { replace: true }); };
  const open = (m) => { rememberModule(m.key); navigate(m.items[0].path); };

  return (
    <nav aria-label="Modules" style={{ width: 76, flexShrink: 0, background: T.navy, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 6, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
      <button type="button" onClick={() => navigate("/home")} title="All modules" aria-current={location.pathname === "/home" ? "page" : undefined}
        style={{ width: 44, height: 44, borderRadius: 12, border: 0, background: location.pathname === "/home" ? T.gold : "rgba(255,255,255,.1)", color: T.white, fontWeight: 900, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>
        WM
      </button>
      {MODULES.map((m) => <RailButton key={m.key} module={m} active={current?.key === m.key} onClick={() => open(m)} />)}
      <div style={{ flex: 1 }} />
      <div title={user.email || ""} style={{ width: 34, height: 34, borderRadius: "50%", background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: T.white }}>{initials}</div>
      <button type="button" onClick={logout} title="Logout" aria-label="Logout" style={{ width: 36, height: 36, border: 0, background: "transparent", color: "rgba(255,255,255,.55)", cursor: "pointer" }}>
        <Icon name="logout" size={18} />
      </button>
    </nav>
  );
}

function SubBar({ module }) {
  return (
    <aside aria-label={`${module.label} pages`} style={{ width: 216, flexShrink: 0, background: T.white, borderRight: `1px solid ${T.border}`, position: "sticky", top: 0, height: "100vh", overflowY: "auto", padding: "18px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px 14px", borderBottom: `1px solid ${T.border}`, marginBottom: 10 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: `${module.color}1A`, color: module.color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={module.icon} size={17} /></span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>{module.label}</div>
          <div style={{ fontSize: 10, color: T.slateLight }}>{module.items.length} page{module.items.length === 1 ? "" : "s"}</div>
        </div>
      </div>
      {module.items.map((item) => (
        <NavLink key={item.path} to={item.path} end={item.end}
          style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, marginBottom: 2, textDecoration: "none",
            background: isActive ? T.goldLight : "transparent", color: isActive ? T.goldDark : T.slate, fontWeight: isActive ? 700 : 500, fontSize: 13 })}>
          <Icon name={item.icon} size={16} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </aside>
  );
}

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
  const navigate = useNavigate();
  const found = locate(location.pathname);
  const user = getStoredUser() || {};

  return (
    <header style={{ height: mobile ? 52 : 56, background: T.white, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "0 12px" : "0 28px", flexShrink: 0, position: "sticky", top: 0, zIndex: 110, gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {mobile && found && (
          <button type="button" onClick={() => navigate("/home")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, border: `1px solid ${T.border}`, background: T.rowAlt, color: T.navy, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            <Icon name={found.module.icon} size={14} /> {found.module.label} ▾
          </button>
        )}
        <span style={{ fontSize: mobile ? 12 : 13, fontWeight: 600, color: T.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {location.pathname === "/home" ? "All modules" : found ? (mobile ? found.item.label : `${found.module.label} › ${found.item.label}`) : "WorkManager"}
        </span>
      </div>
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

/** Phones: the current module's first pages plus a button back to the module launcher. */
const BottomNav = ({ module }) => {
  const items = module ? module.items.slice(0, 4) : [];
  return (
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, minHeight: 64, paddingBottom: "env(safe-area-inset-bottom)", background: T.white, borderTop: `1px solid ${T.border}`, zIndex: 120, display: "grid", gridTemplateColumns: `repeat(${items.length + 1},1fr)`, boxShadow: "0 -8px 24px rgba(15,23,42,.08)" }}>
      {items.map((n) => (
        <NavLink key={n.path} to={n.path} end={n.end} style={({ isActive }) => ({ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, minHeight: 62, textDecoration: "none", fontSize: 10, color: isActive ? T.goldDark : T.slateLight, fontWeight: isActive ? 700 : 500, textAlign: "center", padding: "0 2px" })}>
          <Icon name={n.icon} size={19} />
          <span>{n.label.split(" ")[0]}</span>
        </NavLink>
      ))}
      <NavLink to="/home" style={({ isActive }) => ({ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, minHeight: 62, textDecoration: "none", fontSize: 10, color: isActive ? T.goldDark : T.slateLight, fontWeight: isActive ? 700 : 500 })}>
        <Icon name="grid" size={19} />
        <span>Modules</span>
      </NavLink>
    </nav>
  );
};

export const Layout = ({ children }) => {
  const mobile = useIsMobile();
  const location = useLocation();
  const found = locate(location.pathname);
  const module = found?.module || null;

  useEffect(() => { if (module) rememberModule(module.key); }, [module]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {!mobile && <Rail current={module} />}
      {!mobile && module && <SubBar module={module} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <AppHeader />
        <main style={{ flex: 1, padding: mobile ? "14px 10px 84px" : "28px 32px", overflowY: "auto", background: T.cream }}>{children}</main>
        {mobile && <BottomNav module={module} />}
      </div>
    </div>
  );
};
