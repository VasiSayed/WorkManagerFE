import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { T } from '../theme';
import { api, getStoredUser } from '../api/client';


const useIsMobile = () => {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [mobile, setMobile] = useState(get);
  useEffect(() => {
    const onResize = () => setMobile(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
};

const NAV = [
  { path: '/dashboard',  icon: '🏠', label: 'Dashboard' },
  { path: '/tasks',      icon: '✅', label: 'Tasks' },
  { path: '/meetings',   icon: '📅', label: 'Meetings / MOM' },
  { path: '/notes',      icon: '📝', label: 'Notes' },
  { path: '/documents',  icon: '📄', label: 'Documents' },
  { path: '/leave',      icon: '🌴', label: 'Leave / Holiday' },
  { path: '/salary',     icon: '💰', label: 'Salary / Payments' },
  { path: '/emails',     icon: '📧', label: 'Emails' },
  { path: '/reports',    icon: '📊', label: 'Reports' },
];

const MGMT = [
  { path: '/management/jobs', icon: '🏢', label: 'Jobs' },
  { path: '/management/sources', icon: '💼', label: 'Freelancing Sources' },
  { path: '/management/projects', icon: '📁', label: 'Projects' },
  { path: '/management/employees', icon: '👥', label: 'Employees / Members' },
  { path: '/management/email-types', icon: '🏷️', label: 'Email Types' },
  { path: '/management/email-templates', icon: '✉️', label: 'Email Templates' },
  { path: '/management/email-variables', icon: '🔣', label: 'Email Variables' },
  { path: '/management/designations', icon: '🪪', label: 'Designations' },
  { path: '/management/salary-changes', icon: '📈', label: 'Salary Changes' },
  { path: '/management/document-categories', icon: '🗂️', label: 'Document Categories' },
  { path: '/management/settings', icon: '⚙️', label: 'Settings' },
];

const NavItem = ({ path, icon, label, small }) => {
  return (
    <NavLink to={path} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: small ? '7px 11px' : '9px 12px', borderRadius: 8, marginBottom: 2,
      cursor: 'pointer', textDecoration: 'none',
      background: isActive ? 'rgba(201,168,76,.15)' : 'transparent',
      borderLeft: isActive ? `3px solid ${T.gold}` : '3px solid transparent',
      transition: 'all .15s',
    })}>
      {({ isActive }) => (
        <>
          <span style={{ fontSize: small ? 14 : 15 }}>{icon}</span>
          <span style={{ fontSize: small ? 12 : 13, fontWeight: isActive ? 600 : 400, color: isActive ? T.gold : 'rgba(255,255,255,.75)' }}>{label}</span>
        </>
      )}
    </NavLink>
  );
};

export const Sidebar = () => {
  const navigate = useNavigate();
  const user = getStoredUser() || {};
  const initials = (user.full_name || user.email || 'U').split(/[ @]/).filter(Boolean).slice(0,2).map(x => x[0]?.toUpperCase()).join('') || 'U';
  const logout = () => { api.auth.logout(); navigate('/login', { replace: true }); };
  return (
  <div style={{
    width: 232, minHeight: '100vh', background: T.navy,
    display: 'flex', flexDirection: 'column', padding: '0 0 16px',
    flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
  }}>
    {/* Logo */}
    <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.1)', marginBottom: 8 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: T.white, letterSpacing: '-0.02em' }}>WorkManager</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>Personal Work Suite</div>
    </div>
    {/* Main Nav */}
    <div style={{ padding: '6px 10px', flex: 1 }}>
      {NAV.map(n => <NavItem key={n.path} {...n} />)}
      <div style={{ margin: '16px 0 8px', padding: '0 12px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Management</span>
      </div>
      {MGMT.map(n => <NavItem key={n.path} {...n} small />)}
    </div>
    {/* User pill */}
    <div style={{ margin: '0 10px', padding: '12px', borderRadius: 8, background: 'rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: T.white, flexShrink: 0 }}>{initials}</div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.white, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name || 'User'}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email || ''}</div>
      </div>
      <button onClick={logout} title="Logout" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.55)', cursor: 'pointer', fontSize: 14 }}>↗</button>
    </div>
  </div>
  );
};

export const AppHeader = () => {
  const mobile = useIsMobile();
  const location = useLocation();
  const labels = {
    '/dashboard': 'Dashboard',
    '/tasks': 'Tasks',
    '/meetings': 'Meetings / MOM',
    '/notes': 'Notes',
    '/documents': 'Documents',
    '/leave': 'Leave & Holidays',
    '/salary': 'Salary & Payments',
    '/emails': 'Emails',
    '/reports': 'Reports',
    '/management/jobs': 'Management › Jobs',
    '/management/sources': 'Management › Freelancing Sources',
    '/management/projects': 'Management › Projects',
    '/management/employees': 'Management › Employees',
    '/management/email-types': 'Management › Email Types',
    '/management/email-templates': 'Management › Email Templates',
    '/management/email-variables': 'Management › Email Variables',
    '/management/designations': 'Management › Designations',
    '/management/salary-changes': 'Management › Salary Changes',
    '/management/document-categories': 'Management › Document Categories',
    '/management/settings': 'Management › Settings',
  };
  const path = '/' + location.pathname.split('/').slice(1, 3).join('/');
  const label = labels[path] || labels[location.pathname] || 'WorkManager';
  return (
    <div style={{
      height: mobile ? 48 : 52, background: T.white, borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: mobile ? '0 12px' : '0 28px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <span style={{ fontSize: mobile ? 12 : 13, fontWeight: 600, color: T.navy, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{mobile ? 'WorkManager' : label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {!mobile && <span style={{ fontSize: 12, color: T.slateLight }}>⏰ {new Date().toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })}</span>}
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T.white, cursor: 'pointer' }}>{(getStoredUser()?.full_name || getStoredUser()?.email || 'U').slice(0,2).toUpperCase()}</div>
      </div>
    </div>
  );
};

const BottomNav = () => (
  <div style={{position:'fixed',left:0,right:0,bottom:0,height:62,background:T.white,borderTop:`1px solid ${T.border}`,zIndex:120,display:'grid',gridTemplateColumns:'repeat(5,1fr)',boxShadow:'0 -8px 24px rgba(15,23,42,.08)'}}>
    {NAV.slice(0,5).map(n => <NavLink key={n.path} to={n.path} style={({isActive})=>({display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,textDecoration:'none',fontSize:10,color:isActive?T.gold:T.slateLight,fontWeight:isActive?700:500})}><span style={{fontSize:18}}>{n.icon}</span><span>{n.label.split(' ')[0]}</span></NavLink>)}
  </div>
);

export const Layout = ({ children }) => {
  const mobile = useIsMobile();
  return <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
    {!mobile && <Sidebar />}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      <AppHeader />
      <main style={{ flex: 1, padding: mobile ? '16px 12px 82px' : '28px 32px', overflowY: 'auto', background: T.cream }}>
        {children}
      </main>
      {mobile && <BottomNav />}
    </div>
  </div>;
};
