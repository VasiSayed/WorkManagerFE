import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, endpoints, getErrorMessage, getStoredUser, normalizeList, resolveAssetUrl } from '../../api/client';
import { T } from '../../theme';
import { Btn, Card, EmptyState, Input, Modal, PageHeader, SectionTitle, Select, Textarea } from '../../components/UI';
import { Icon } from '../../components/Icons';

const asList = (payload) => normalizeList(payload);
const displayName = (u = {}) => u.display_name || u.full_name || u.username || u.email || `User ${u.id}`;
const initials = (u = {}) => displayName(u).split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(x => x[0]?.toUpperCase()).join('') || 'U';
const dateTime = (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const statusText = (s) => String(s || 'none').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const lower = (v) => String(v || '').toLowerCase();
const glassBorder = 'rgba(255,255,255,.22)';
const softShadow = '0 20px 50px rgba(15, 23, 42, .08)';
const hoverShadow = '0 24px 60px rgba(27,42,74,.12)';

function useIsCompact() {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth <= 960 : false);
  const [compact, setCompact] = useState(get);
  useEffect(() => {
    const onResize = () => setCompact(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return compact;
}

function useAsync(load, deps = []) {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const run = async () => {
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const data = await load();
      setState({ loading: false, error: '', data });
      return data;
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err), data: null });
      return null;
    }
  };
  useEffect(() => { run(); }, deps);
  return { ...state, reload: run };
}

function Notice({ type = 'info', children }) {
  const c = { info: T.info, error: T.error, success: T.success, warning: T.warning }[type] || T.info;
  const bg = { info: T.infoBg, error: T.errorBg, success: T.successBg, warning: T.warningBg }[type] || T.infoBg;
  return (
    <div style={{ padding: '12px 14px', borderRadius: 14, border: `1px solid ${c}22`, background: bg, color: c, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 22px rgba(15,23,42,.04)' }}>
      <Icon name={type === 'success' ? 'check' : type === 'error' ? 'alert' : type === 'warning' ? 'clock' : 'info'} size={18} />
      <span>{children}</span>
    </div>
  );
}

function LoadingCard({ label = 'Loading…' }) {
  return <Card style={{ boxShadow: softShadow }}><div style={{ color: T.slateLight, fontSize: 13, display:'flex', alignItems:'center', gap:8 }}><Icon name="clock" size={16}/> {label}</div></Card>;
}

function Avatar({ user, size = 42, ring = false }) {
  const url = user?.profile_photo_url || user?.profile_photo;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: `linear-gradient(135deg, ${T.gold}, ${T.navy})`, color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0, fontSize: Math.max(12, size * .34), boxShadow: ring ? `0 0 0 4px ${T.goldLight}, 0 12px 26px rgba(27,42,74,.14)` : '0 8px 18px rgba(27,42,74,.12)' }}>
      {url ? <img src={resolveAssetUrl(url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(user)}
    </div>
  );
}

function Pill({ children, tone = 'slate', dot = false, style = {} }) {
  const m = {
    navy: [T.navyTint, T.navy, '#C7D5ED'],
    gold: [T.goldLight, T.goldDark, '#EDD590'],
    success: [T.successBg, T.success, '#B7DFD0'],
    warning: [T.warningBg, T.warning, '#F6D860'],
    error: [T.errorBg, T.error, '#FECACA'],
    info: [T.infoBg, T.info, '#BFDBFE'],
    slate: ['#F8FAFC', T.slateLight, T.border],
  };
  const [bg, color, br] = m[tone] || m.slate;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 999, border: `1px solid ${br}`, background: bg, color, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', ...style }}>{dot && <i style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}{children}</span>;
}

function IconButton({ children, onClick, title, danger = false, active = false }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${active ? T.gold : T.border}`, background: active ? T.goldLight : T.white, color: danger ? T.error : active ? T.goldDark : T.slate, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(15,23,42,.05)' }}>
      {children}
    </button>
  );
}

function Panel({ children, style = {} }) {
  return <Card style={{ borderRadius: 22, border: `1px solid ${T.border}`, boxShadow: softShadow, padding: 0, overflow: 'hidden', ...style }}>{children}</Card>;
}

function PanelBody({ children, style = {} }) {
  return <div style={{ padding: 18, ...style }}>{children}</div>;
}

function Hero({ title, sub, action, stats = [] }) {
  const compact = useIsCompact();
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, marginBottom: 18, background: `radial-gradient(circle at top right, rgba(201,168,76,.42), transparent 34%), linear-gradient(135deg, ${T.navy}, #111827)`, color: T.white, boxShadow: '0 26px 70px rgba(27,42,74,.22)' }}>
      <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,.07)', right: -70, top: -90 }} />
      <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'rgba(201,168,76,.14)', left: -50, bottom: -70 }} />
      <div style={{ position: 'relative', padding: compact ? 20 : 26, display: 'grid', gridTemplateColumns: compact ? '1fr' : '1.2fr .8fr', gap: 18, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,.1)', border: `1px solid ${glassBorder}`, color: 'rgba(255,255,255,.78)', fontWeight: 800, fontSize: 11, marginBottom: 12 }}><Icon name="users" size={14}/> Social workspace</div>
          <h1 style={{ fontSize: compact ? 25 : 34, lineHeight: 1.08, marginBottom: 10, letterSpacing: '-.04em' }}>{title}</h1>
          <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 14, lineHeight: 1.6, maxWidth: 680 }}>{sub}</p>
          {action && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>{action}</div>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {stats.map(s => <div key={s.label} style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,.1)', border: `1px solid ${glassBorder}`, backdropFilter: 'blur(12px)' }}>
            <div style={{ color: 'rgba(255,255,255,.56)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 950, marginTop: 5 }}>{s.value}</div>
            {s.sub && <div style={{ color: 'rgba(255,255,255,.62)', fontSize: 11, marginTop: 4 }}>{s.sub}</div>}
          </div>)}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, icon, children, count, onClick }) {
  return (
    <button onClick={onClick} style={{ border: `1px solid ${active ? T.gold : T.border}`, background: active ? `linear-gradient(135deg, ${T.goldLight}, #fff)` : T.white, color: active ? T.goldDark : T.slate, borderRadius: 16, padding: '10px 13px', fontWeight: 900, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: active ? '0 10px 26px rgba(201,168,76,.16)' : '0 6px 18px rgba(15,23,42,.04)' }}>
      <Icon name={icon} size={16}/>{children}{count ? <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999, background: active ? T.gold : T.navyTint, color: active ? T.white : T.navy, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{count}</span> : null}
    </button>
  );
}

function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 13, top: 11, color: T.slateLight }}><Icon name="search" size={16}/></span>
      <input value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', border: `1px solid ${T.border}`, background: T.white, borderRadius: 16, padding: '12px 14px 12px 38px', outline: 'none', color: T.navy, fontWeight: 700, boxShadow: '0 10px 28px rgba(15,23,42,.04)' }} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} />
    </div>
  );
}

function UserLine({ user, sub, meta, right, onClick, accent = false }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 13, border: `1px solid ${accent ? '#EDD590' : T.border}`, borderRadius: 18, background: accent ? `linear-gradient(135deg, ${T.goldLight}, #fff)` : T.white, cursor: onClick ? 'pointer' : 'default', boxShadow: hover ? hoverShadow : '0 8px 24px rgba(15,23,42,.04)', transform: hover ? 'translateY(-1px)' : 'translateY(0)', transition: 'all .16s ease' }}>
      <Avatar user={user} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ fontWeight: 950, color: T.navy, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName(user)}</div>
          {meta && <Pill tone="slate">{meta}</Pill>}
        </div>
        <div style={{ color: T.slateLight, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 3 }}>{sub || user?.email || user?.username}</div>
      </div>
      {right && <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>{right}</div>}
    </div>
  );
}

function ListOrEmpty({ items, empty, sub = '', icon = 'archive', render }) {
  if (!items?.length) return <EmptyState icon={<Icon name={icon} size={38}/>} title={empty} sub={sub} />;
  return <div style={{ display: 'grid', gap: 10 }}>{items.map((item, idx) => <div key={item.id || idx}>{render(item)}</div>)}</div>;
}

function RatingStars({ rating = 0 }) {
  return <span style={{ display:'inline-flex', gap:3, color:T.goldDark }}>{Array.from({length:5}, (_,index)=><Icon key={index} name="star" size={15} style={{opacity:index<Number(rating)?1:.25}}/>)}</span>;
}

function SplitGrid({ children, left = '420px' }) {
  const compact = useIsCompact();
  return <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : `${left} minmax(0, 1fr)`, gap: 18 }}>{children}</div>;
}

function statusTone(status) {
  const s = lower(status);
  if (s.includes('connected') || s.includes('accepted')) return 'success';
  if (s.includes('pending')) return 'warning';
  if (s.includes('block') || s.includes('restrict')) return 'error';
  if (s.includes('reject')) return 'warning';
  return 'slate';
}

function ConnectionCard({ user, onOpen, onInvite, onChat, onBlock }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 22, padding: 15, background: `linear-gradient(180deg, #fff, ${T.rowAlt})`, boxShadow: '0 12px 34px rgba(15,23,42,.05)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar user={user} size={48} ring />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 950, color: T.navy, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName(user)}</div>
          <div style={{ color: T.slateLight, fontSize: 12, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email || user.username}</div>
          <div style={{ marginTop: 8 }}><Pill tone={statusTone(user.connection_status)} dot>{statusText(user.connection_status)}</Pill></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
        <Btn variant="outline" style={{ justifyContent: 'center', padding: '8px 9px', fontSize: 12 }} onClick={onOpen}>Profile</Btn>
        {user.connection_status === 'connected'
          ? <Btn variant="gold" style={{ justifyContent: 'center', padding: '8px 9px', fontSize: 12 }} onClick={onChat}>Chat</Btn>
          : <Btn variant="gold" style={{ justifyContent: 'center', padding: '8px 9px', fontSize: 12 }} disabled={!['none', 'rejected_sent', 'cancelled'].includes(user.connection_status)} onClick={onInvite}>Invite</Btn>}
        <Btn variant="danger" style={{ justifyContent: 'center', padding: '8px 9px', fontSize: 12 }} disabled={['blocked_by_me', 'restricted'].includes(user.connection_status)} onClick={onBlock}>Block</Btn>
      </div>
    </div>
  );
}

export function SocialPage() {
  const navigate = useNavigate();
  const compact = useIsCompact();
  const [tab, setTab] = useState('people');
  const [q, setQ] = useState('');
  const [invite, setInvite] = useState({ identifier: '', message: '' });
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const invitations = useAsync(() => api.list(endpoints.socialInvitations), []);
  const blocks = useAsync(() => api.list(endpoints.socialBlocks), []);
  const notifications = useAsync(() => api.list(endpoints.socialNotifications), []);

  const search = async () => {
    setErr(''); setPeopleLoading(true);
    try {
      const res = await api.list(endpoints.socialUserSearch, { q });
      setPeople(asList(res));
    } catch (e) { setErr(getErrorMessage(e)); }
    finally { setPeopleLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (q.trim()) search(); else setPeople([]); }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  const refreshAll = () => { invitations.reload(); blocks.reload(); notifications.reload(); if (q.trim()) search(); };

  const sendInvite = async (identifier = invite.identifier) => {
    setErr(''); setMsg('');
    try {
      await api.create(endpoints.socialInvitations, { identifier, message: invite.message });
      setInvite({ identifier: '', message: '' });
      setMsg('Invitation sent. They will receive a notification now.');
      refreshAll();
    } catch (e) { setErr(getErrorMessage(e)); }
  };

  const respondInvite = async (id, action) => {
    setErr(''); setMsg('');
    try {
      await api.create(`${endpoints.socialInvitations}${id}/${action}/`, {});
      setMsg(action === 'accept' ? 'Invitation accepted. You can now chat and review this user.' : 'Invitation rejected. They can try again after 24 hours.');
      refreshAll();
    } catch (e) { setErr(getErrorMessage(e)); }
  };

  const blockUser = async (user) => {
    if (!window.confirm(`Block ${displayName(user)}? They cannot invite you or message you.`)) return;
    setErr(''); setMsg('');
    try {
      await api.create(endpoints.socialBlocks, { blocked: user.id });
      setMsg('User blocked. Personal messages and invitations are now restricted.');
      refreshAll();
    } catch (e) { setErr(getErrorMessage(e)); }
  };

  const unblock = async (blockId) => {
    setErr(''); setMsg('');
    try { await api.remove(`${endpoints.socialBlocks}${blockId}/`); setMsg('User unblocked.'); refreshAll(); }
    catch (e) { setErr(getErrorMessage(e)); }
  };

  const startDirectChat = async (user) => {
    setErr(''); setMsg('');
    try {
      const conv = await api.create(endpoints.socialConversations, { type: 'direct', user_id: user.id });
      navigate(`/chat/${conv.id}`);
    } catch (e) { setErr(getErrorMessage(e)); }
  };

  const markRead = async (id) => {
    try { await api.create(`${endpoints.socialNotifications}${id}/mark_read/`, {}); notifications.reload(); }
    catch (e) { setErr(getErrorMessage(e)); }
  };

  const invList = asList(invitations.data);
  const incoming = invList.filter(x => x.direction === 'incoming' && x.status === 'pending');
  const outgoing = invList.filter(x => x.direction === 'outgoing' && x.status === 'pending');
  const accepted = invList.filter(x => x.status === 'accepted');
  const blockList = asList(blocks.data);
  const noteList = asList(notifications.data);
  const unreadCount = noteList.filter(x => !x.is_read).length;

  const connectedUsers = accepted.map(x => x.direction === 'outgoing' ? x.recipient_user : x.sender_user).filter(Boolean);

  return <div>
    <Hero
      title="People, invites and private collaboration in one place."
      sub="Find users by username or email, send invitations, accept requests, block unsafe users, review connected people and jump directly into personal or group chat."
      stats={[
        { label: 'Received', value: incoming.length, sub: 'pending invites' },
        { label: 'Connected', value: connectedUsers.length, sub: 'accepted users' },
        { label: 'Blocked', value: blockList.length, sub: 'restricted users' },
        { label: 'Unread', value: unreadCount, sub: 'notifications' },
      ]}
      action={<>
        <Btn variant="gold" onClick={() => setTab('people')} style={{ borderRadius: 999, padding: '10px 16px', fontWeight: 900 }}>Invite Someone</Btn>
        <Btn variant="outline" onClick={() => navigate('/chat')} style={{ borderRadius: 999, padding: '10px 16px', fontWeight: 900, background: 'rgba(255,255,255,.1)', color: T.white, border: `1px solid ${glassBorder}` }}>Open Chat</Btn>
      </>}
    />

    {msg && <Notice type="success">{msg}</Notice>}
    {err && <Notice type="error">{err}</Notice>}

    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 18 }}>
      <TabButton active={tab === 'people'} icon="search" onClick={() => setTab('people')}>Discover</TabButton>
      <TabButton active={tab === 'invites'} icon="mail" count={incoming.length} onClick={() => setTab('invites')}>Invitations</TabButton>
      <TabButton active={tab === 'connected'} icon="users" count={connectedUsers.length} onClick={() => setTab('connected')}>Network</TabButton>
      <TabButton active={tab === 'blocked'} icon="shield" count={blockList.length} onClick={() => setTab('blocked')}>Blocked</TabButton>
      <TabButton active={tab === 'notifications'} icon="bell" count={unreadCount} onClick={() => setTab('notifications')}>Alerts</TabButton>
    </div>

    {tab === 'people' && <SplitGrid left="410px">
      <Panel>
        <div style={{ padding: 18, background: `linear-gradient(135deg, ${T.goldLight}, #fff)`, borderBottom: `1px solid ${T.border}` }}>
          <SectionTitle style={{ marginBottom: 6 }}>Fast invitation</SectionTitle>
          <h2 style={{ color: T.navy, fontSize: 20, letterSpacing: '-.03em' }}>Invite by username or email</h2>
          <p style={{ color: T.slateLight, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Rejected invitations are locked for 24 hours before retry.</p>
        </div>
        <PanelBody>
          <div style={{ display: 'grid', gap: 12 }}>
            <Input label="Username or Email" value={invite.identifier} onChange={e => setInvite({ ...invite, identifier: e.target.value })} placeholder="example@email.com or username" />
            <Textarea label="Message optional" value={invite.message} onChange={e => setInvite({ ...invite, message: e.target.value })} rows={3} placeholder="Add a short reason for connecting…" />
            <Btn variant="gold" onClick={() => sendInvite()} disabled={!invite.identifier.trim()} style={{ borderRadius: 14, justifyContent: 'center', padding: '11px 16px', fontWeight: 900 }}>Send Invitation</Btn>
            <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
              <Pill tone="info"><Icon name="bell" size={13}/> Notification sent instantly</Pill>
              <Pill tone="warning"><Icon name="clock" size={13}/> Reject cooldown: 24 hours</Pill>
              <Pill tone="error"><Icon name="shield" size={13}/> Blocked users see restriction</Pill>
            </div>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody>
          <div style={{ display: 'flex', alignItems: compact ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12, flexDirection: compact ? 'column' : 'row', marginBottom: 14 }}>
            <div>
              <SectionTitle style={{ marginBottom: 5 }}>People search</SectionTitle>
              <h2 style={{ color: T.navy, fontSize: 20, letterSpacing: '-.03em' }}>Find the right person</h2>
            </div>
            <Pill tone="navy">{people.length} results</Pill>
          </div>
          <SearchBox value={q} onChange={e => setQ(e.target.value)} placeholder="Search username, email or name…" />
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginTop: 16 }}>
            {!q.trim() && <div style={{ gridColumn: '1 / -1' }}><EmptyState icon={<Icon name="search" size={38}/>} title="Start with a username or email" sub="The search will show connection status, quick invite, chat and block actions." /></div>}
            {q.trim() && peopleLoading && <div style={{ gridColumn: '1 / -1', color: T.slateLight, padding: 18 }}>Searching people…</div>}
            {q.trim() && !peopleLoading && people.length === 0 && <div style={{ gridColumn: '1 / -1' }}><EmptyState icon={<Icon name="search" size={38}/>} title="No users found" sub="Try exact username or email." /></div>}
            {people.map(user => <ConnectionCard key={user.id} user={user}
              onOpen={() => navigate(`/social/users/${user.id}`)}
              onInvite={() => sendInvite(user.email || user.username)}
              onChat={() => startDirectChat(user)}
              onBlock={() => blockUser(user)}
            />)}
          </div>
        </PanelBody>
      </Panel>
    </SplitGrid>}

    {tab === 'invites' && <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
      <Panel><PanelBody><SectionTitle>Received invitations</SectionTitle><ListOrEmpty items={incoming} empty="No pending received invitations" sub="New invites will appear here with accept and reject actions." icon="mail" render={x => <UserLine accent user={x.sender_user} sub={x.message || `Sent ${dateTime(x.created_at)}`} meta="Incoming" right={<><Btn variant="gold" style={{ padding: '7px 10px', fontSize: 12, borderRadius: 12, fontWeight: 900 }} onClick={() => respondInvite(x.id, 'accept')}>Accept</Btn><Btn variant="danger" style={{ padding: '7px 10px', fontSize: 12, borderRadius: 12, fontWeight: 900 }} onClick={() => respondInvite(x.id, 'reject')}>Reject</Btn></>} />} /></PanelBody></Panel>
      <Panel><PanelBody><SectionTitle>Sent invitations</SectionTitle><ListOrEmpty items={outgoing} empty="No pending sent invitations" sub="Users you invited but have not responded yet." icon="⏳" render={x => <UserLine user={x.recipient_user} sub={`Pending · ${dateTime(x.created_at)}`} meta="Pending" />} /></PanelBody></Panel>
    </div>}

    {tab === 'connected' && <Panel><PanelBody>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', marginBottom: 14 }}>
        <div><SectionTitle style={{ marginBottom: 5 }}>Accepted invitations / followers</SectionTitle><h2 style={{ color: T.navy, fontSize: 20 }}>Your trusted network</h2></div>
        <Btn variant="gold" onClick={() => navigate('/chat')} style={{ borderRadius: 999, fontWeight: 900 }}>Go to Chat</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {!connectedUsers.length && <div style={{ gridColumn: '1 / -1' }}><EmptyState icon="users" title="No connected users yet" sub="Accept or send invitations to unlock chat, groups and reviews." /></div>}
        {accepted.map(x => {
          const realUser = x.direction === 'outgoing' ? x.recipient_user : x.sender_user;
          return <UserLine key={x.id} user={realUser} sub={`Connected · ${dateTime(x.responded_at || x.updated_at)}`} meta={x.direction === 'outgoing' ? 'Invited' : 'Accepted'} onClick={() => navigate(`/social/users/${realUser.id}`)} right={<><IconButton title="Chat" onClick={(e) => { e.stopPropagation(); startDirectChat(realUser); }}><Icon name="message" size={17}/></IconButton><IconButton title="Profile" onClick={(e) => { e.stopPropagation(); navigate(`/social/users/${realUser.id}`); }}><Icon name="user" size={17}/></IconButton></>} />;
        })}
      </div>
    </PanelBody></Panel>}

    {tab === 'blocked' && <Panel><PanelBody>
      <SectionTitle>Blocked users</SectionTitle>
      <Notice type="warning">Blocked users cannot send invitations, cannot message you, and will see “Your Are restricted” on protected profile areas.</Notice>
      <ListOrEmpty items={blockList} empty="No blocked users" sub="Your safety list is empty." icon="shield" render={x => <UserLine user={x.blocked_user} sub={x.reason || `Blocked ${dateTime(x.created_at)}`} meta="Blocked" right={<Btn variant="outline" style={{ padding: '7px 10px', borderRadius: 12, fontWeight: 900 }} onClick={() => unblock(x.id)}>Unblock</Btn>} />} />
    </PanelBody></Panel>}

    {tab === 'notifications' && <Panel><PanelBody>
      <SectionTitle>Notifications</SectionTitle>
      <ListOrEmpty items={noteList} empty="No notifications" sub="Invite, reject, accept, message, group and review alerts will appear here." icon="bell" render={x => <div style={{ padding: 14, border: `1px solid ${x.is_read ? T.border : '#EDD590'}`, borderRadius: 18, background: x.is_read ? T.white : `linear-gradient(135deg, ${T.goldLight}, #fff)`, boxShadow: '0 8px 24px rgba(15,23,42,.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><strong style={{ color: T.navy }}>{x.title}</strong>{!x.is_read && <Btn variant="outline" style={{ padding: '6px 9px', fontSize: 12, borderRadius: 12, fontWeight: 900 }} onClick={() => markRead(x.id)}>Mark read</Btn>}</div>
        <div style={{ color: T.slate, fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>{x.message}</div>
        <div style={{ color: T.slateLight, fontSize: 11, marginTop: 8 }}>{dateTime(x.created_at)}</div>
      </div>} />
    </PanelBody></Panel>}
  </div>;
}

export function SocialProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const compact = useIsCompact();
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [review, setReview] = useState({ rating: 5, text: '' });
  const profile = useAsync(() => api.get(`${endpoints.socialUsers}${id}/profile/`), [id]);
  const data = profile.data;
  const user = data?.user || {};

  const block = async () => {
    if (!window.confirm(`Block ${displayName(user)}?`)) return;
    setErr(''); setMsg('');
    try { await api.create(endpoints.socialBlocks, { blocked: user.id }); setMsg('User blocked.'); profile.reload(); }
    catch (e) { setErr(getErrorMessage(e)); }
  };

  const startChat = async () => {
    setErr(''); setMsg('');
    try { const conv = await api.create(endpoints.socialConversations, { type: 'direct', user_id: user.id }); navigate(`/chat/${conv.id}`); }
    catch (e) { setErr(getErrorMessage(e)); }
  };

  const submitReview = async () => {
    setErr(''); setMsg('');
    try { await api.create(endpoints.socialReviews, { reviewed_user: user.id, rating: Number(review.rating), text: review.text }); setMsg('Review saved.'); setReview({ rating: 5, text: '' }); profile.reload(); }
    catch (e) { setErr(getErrorMessage(e)); }
  };

  if (profile.loading) return <LoadingCard label="Loading profile…" />;
  return <div>
    <PageHeader title="User Profile" sub="Profile, work info, common groups and reviews." action={<Btn variant="outline" onClick={() => navigate('/social')}>Back to People</Btn>} />
    {msg && <Notice type="success">{msg}</Notice>}
    {err && <Notice type="error">{err}</Notice>}
    {profile.error && <Notice type="error">{profile.error}</Notice>}

    {data?.restricted ? <Panel><PanelBody><EmptyState icon={<Icon name="lock" size={38}/>} title="Your Are restricted" sub="This profile is blocked or restricted." /></PanelBody></Panel> : <>
      <div style={{ borderRadius: 28, overflow: 'hidden', background: `radial-gradient(circle at top right, rgba(201,168,76,.42), transparent 32%), linear-gradient(135deg, ${T.navy}, #111827)`, color: T.white, boxShadow: '0 26px 70px rgba(27,42,74,.18)', marginBottom: 18 }}>
        <div style={{ padding: compact ? 20 : 26, display: 'flex', alignItems: compact ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 18, flexDirection: compact ? 'column' : 'row' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <Avatar user={user} size={76} ring />
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: compact ? 24 : 32, lineHeight: 1.1, letterSpacing: '-.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName(user)}</h1>
              <div style={{ color: 'rgba(255,255,255,.62)', marginTop: 5, fontSize: 13 }}>{user.email}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}><Pill tone={statusTone(user.connection_status)}>{statusText(user.connection_status)}</Pill>{data?.currently_working_at && <Pill tone="gold"><Icon name="briefcase" size={13}/> Working</Pill>}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {user.connection_status === 'connected' && <Btn variant="gold" onClick={startChat} style={{ borderRadius: 999, fontWeight: 900 }}>Personal Chat</Btn>}
            {!user.is_blocked_by_me && <Btn variant="danger" onClick={block} style={{ borderRadius: 999, fontWeight: 900 }}>Block User</Btn>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(280px, 380px) 1fr', gap: 18 }}>
        <div style={{ display: 'grid', gap: 18 }}>
          <Panel><PanelBody>
            <SectionTitle>Currently working at</SectionTitle>
            {data?.currently_working_at ? <div style={{ border: `1px solid ${T.border}`, borderRadius: 18, padding: 15, background: T.rowAlt }}>
              <div style={{ fontWeight: 950, color: T.navy, fontSize: 18 }}>{data.currently_working_at.company_name}</div>
              <div style={{ fontSize: 13, color: T.slate, marginTop: 5 }}>{data.currently_working_at.current_designation || data.currently_working_at.job_title || 'Role not added'}</div>
            </div> : <EmptyState icon={<Icon name="briefcase" size={38}/>} title="No current work info" sub="This user has not added a current workplace." />}
          </PanelBody></Panel>
          <Panel><PanelBody>
            <SectionTitle>Relationship permissions</SectionTitle>
            <div style={{ display: 'grid', gap: 9 }}>
              <Pill tone={user.connection_status === 'connected' ? 'success' : 'warning'}><Icon name="message" size={13}/> Personal chat {user.connection_status === 'connected' ? 'allowed' : 'locked'}</Pill>
              <Pill tone={user.is_blocked_by_me ? 'error' : 'success'}><Icon name="shield" size={13}/> Block status {user.is_blocked_by_me ? 'blocked by you' : 'clear'}</Pill>
              <Pill tone="info"><Icon name="star" size={13}/> Reviews only for accepted users</Pill>
            </div>
          </PanelBody></Panel>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <Panel><PanelBody><SectionTitle>Groups in common</SectionTitle><ListOrEmpty items={data?.groups_in_common || []} empty="No common groups" sub="Shared groups will appear here." icon="users" render={g => <div style={{ padding: 14, border: `1px solid ${T.border}`, borderRadius: 18, background: T.white }}><strong style={{ color: T.navy }}>{g.display_title}</strong><div style={{ color: T.slateLight, fontSize: 12, marginTop: 4 }}>{g.participants?.length || 0} members</div></div>} /></PanelBody></Panel>
          <Panel><PanelBody><SectionTitle>Reviews</SectionTitle><ListOrEmpty items={data?.reviews || []} empty="No reviews yet" sub="Connected users can add trust reviews." icon="star" render={r => <div style={{ padding: 14, border: `1px solid ${T.border}`, borderRadius: 18, background: `linear-gradient(180deg, #fff, ${T.rowAlt})` }}><RatingStars rating={r.rating}/><div style={{ color: T.slate, marginTop: 7, lineHeight: 1.5 }}>{r.text || 'No text review.'}</div><div style={{ color: T.slateLight, fontSize: 11, marginTop: 8 }}>By {displayName(r.reviewer_user)} · {dateTime(r.updated_at)}</div></div>} /></PanelBody></Panel>
          {user.connection_status === 'connected' && <Panel><PanelBody><SectionTitle>Write / update your review</SectionTitle><div style={{ display: 'grid', gap: 10 }}><Select label="Rating" value={review.rating} onChange={e => setReview({ ...review, rating: e.target.value })} options={[[5, '5 Stars'], [4, '4 Stars'], [3, '3 Stars'], [2, '2 Stars'], [1, '1 Star']]} /><Textarea label="Review" rows={3} value={review.text} onChange={e => setReview({ ...review, text: e.target.value })} placeholder="Share your experience working or collaborating with this person…" /><Btn variant="gold" onClick={submitReview} style={{ borderRadius: 14, fontWeight: 900 }}>Save Review</Btn></div></PanelBody></Panel>}
        </div>
      </div>
    </>}
  </div>;
}

export function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const compact = useIsCompact();
  const [activeId, setActiveId] = useState(id || '');
  const [query, setQuery] = useState('');
  const [err, setErr] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const conversations = useAsync(() => api.list(endpoints.socialConversations), []);
  const convs = asList(conversations.data);
  const filtered = convs.filter(c => lower(c.display_title).includes(lower(query)) || lower(c.last_message?.text).includes(lower(query)));

  useEffect(() => { if (id) setActiveId(id); }, [id]);
  useEffect(() => { if (!activeId && convs[0]?.id) setActiveId(String(convs[0].id)); }, [convs.length]);

  const active = convs.find(c => String(c.id) === String(activeId));

  return <div>
    <Hero
      title="Messenger for connected people and trusted groups."
      sub="Personal chat opens only after accepted invitations. Groups support image, document and video messages up to two minutes."
      stats={[
        { label: 'Chats', value: convs.length, sub: 'total rooms' },
        { label: 'Groups', value: convs.filter(c => c.type === 'group').length, sub: 'collab spaces' },
        { label: 'Personal', value: convs.filter(c => c.type === 'direct').length, sub: '1-to-1 chats' },
        { label: 'Limit', value: '2m', sub: 'video uploads' },
      ]}
      action={<>
        <Btn variant="gold" onClick={() => setShowCreate(true)} style={{ borderRadius: 999, padding: '10px 16px', fontWeight: 900 }}>New Chat / Group</Btn>
        <Btn variant="outline" onClick={() => navigate('/social')} style={{ borderRadius: 999, padding: '10px 16px', fontWeight: 900, background: 'rgba(255,255,255,.1)', color: T.white, border: `1px solid ${glassBorder}` }}>People</Btn>
      </>}
    />
    {err && <Notice type="error">{err}</Notice>}
    <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '360px minmax(0, 1fr)', gap: 18, minHeight: 650 }}>
      <Panel style={{ padding: 0, maxHeight: compact ? 420 : 720 }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${T.border}`, background: T.white }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div><SectionTitle style={{ marginBottom: 4 }}>Inbox</SectionTitle><strong style={{ color: T.navy, fontSize: 18 }}>Conversations</strong></div>
            <IconButton title="New chat" onClick={() => setShowCreate(true)}><Icon name="plus" size={17}/></IconButton>
          </div>
          <SearchBox value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chats…" />
        </div>
        <div style={{ display: 'grid', gap: 8, padding: 10, maxHeight: compact ? 300 : 590, overflowY: 'auto', background: T.rowAlt }}>
          {conversations.loading && <div style={{ padding: 14, color: T.slateLight }}>Loading conversations…</div>}
          {!conversations.loading && filtered.length === 0 && <EmptyState icon={<Icon name="message" size={38}/>} title="No chats found" sub="Start a chat from People or create a group." />}
          {filtered.map(c => <ConversationListItem key={c.id} conversation={c} active={String(activeId) === String(c.id)} onClick={() => { setActiveId(String(c.id)); navigate(`/chat/${c.id}`); }} />)}
        </div>
      </Panel>
      {active ? <ConversationPanel conversation={active} onError={setErr} onSent={conversations.reload} /> : <Panel><PanelBody><EmptyState icon={<Icon name="message" size={38}/>} title="Select a conversation" sub="Choose a chat or create a new one." /></PanelBody></Panel>}
    </div>
    <CreateConversationModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={(conv) => { setShowCreate(false); conversations.reload(); setActiveId(String(conv.id)); navigate(`/chat/${conv.id}`); }} onError={setErr} />
  </div>;
}

function ConversationListItem({ conversation, active, onClick }) {
  const last = conversation.last_message?.text || conversation.last_message?.attachment_name || 'No messages yet';
  return (
    <button onClick={onClick} style={{ border: `1px solid ${active ? '#EDD590' : T.border}`, borderRadius: 18, background: active ? `linear-gradient(135deg, ${T.goldLight}, #fff)` : T.white, textAlign: 'left', padding: 12, cursor: 'pointer', boxShadow: active ? '0 12px 32px rgba(201,168,76,.14)' : '0 8px 22px rgba(15,23,42,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: conversation.type === 'group' ? T.navyTint : T.goldLight, color: conversation.type === 'group' ? T.navy : T.goldDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950 }}><Icon name={conversation.type === 'group' ? 'users' : 'message'} size={20}/></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 950, color: T.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conversation.display_title}</div>
          <div style={{ color: T.slateLight, fontSize: 12, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conversation.type === 'group' ? `${conversation.participants?.length || 0} members` : 'Personal'} · {last}</div>
        </div>
      </div>
    </button>
  );
}

function ConversationPanel({ conversation, onError, onSent }) {
  const currentUser = getStoredUser() || {};
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [attachmentType, setAttachmentType] = useState('none');
  const [videoDuration, setVideoDuration] = useState('');
  const endRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try { setMessages(asList(await api.list(`${endpoints.socialConversations}${conversation.id}/messages/`))); }
    catch (e) { onError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [conversation.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const onPickFile = async (picked) => {
    setFile(picked || null); setVideoDuration(''); onError('');
    if (!picked) { setAttachmentType('none'); return; }
    const type = picked.type || '';
    if (type.startsWith('image/')) setAttachmentType('image');
    else if (type.startsWith('video/')) {
      setAttachmentType('video');
      const duration = await getVideoDuration(picked).catch(() => null);
      if (duration) setVideoDuration(String(Math.ceil(duration)));
      if (duration && duration > 120) onError('Video must be 2 minutes or less.');
    } else setAttachmentType('document');
  };

  const send = async () => {
    onError('');
    try {
      if (attachmentType === 'video' && Number(videoDuration || 0) > 120) throw new Error('Video must be 2 minutes or less.');
      const form = new FormData();
      form.append('text', text);
      form.append('attachment_type', file ? attachmentType : 'none');
      if (file) form.append('attachment', file);
      if (attachmentType === 'video' && videoDuration) form.append('video_duration_seconds', videoDuration);
      const msg = await api.upload(`${endpoints.socialConversations}${conversation.id}/messages/`, form);
      setMessages(prev => [...prev, msg]);
      setText(''); setFile(null); setAttachmentType('none'); setVideoDuration('');
      onSent?.();
    } catch (e) { onError(getErrorMessage(e)); }
  };

  return <Panel style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 650 }}>
    <div style={{ padding: 16, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: `linear-gradient(135deg, #fff, ${T.rowAlt})` }}>
      <div style={{ minWidth: 0 }}><div style={{ fontWeight: 950, color: T.navy, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conversation.display_title}</div><div style={{ color: T.slateLight, fontSize: 12, marginTop: 4 }}>{conversation.type === 'group' ? `${conversation.participants?.length || 0} members · via-via group rules` : 'Personal chat · accepted invitation required'}</div></div>
      <Pill tone={conversation.type === 'group' ? 'navy' : 'gold'}>{conversation.type === 'group' ? 'Group' : 'Personal'}</Pill>
    </div>
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: `linear-gradient(180deg, ${T.rowAlt}, #fff)`, display: 'grid', alignContent: 'start', gap: 12 }}>
      {loading && <div style={{ color: T.slateLight }}>Loading messages…</div>}
      {!loading && messages.length === 0 && <EmptyState icon={<Icon name="message" size={38}/>} title="No messages yet" sub="Send the first message." />}
      {messages.map(m => <MessageBubble key={m.id} message={m} isMine={String(m.sender_user?.id) === String(currentUser.id)} />)}
      <div ref={endRef} />
    </div>
    <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, background: T.white }}>
      {file && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, border: `1px solid ${attachmentType === 'video' && Number(videoDuration || 0) > 120 ? '#FECACA' : T.border}`, background: attachmentType === 'video' && Number(videoDuration || 0) > 120 ? T.errorBg : T.rowAlt, borderRadius: 16, padding: 11, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}><strong style={{ color: T.navy, fontSize: 13 }}><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Icon name="file" size={14}/>{file.name}</span></strong><div style={{ color: T.slateLight, fontSize: 11, marginTop: 3 }}>{statusText(attachmentType)}{attachmentType === 'video' ? ` · ${videoDuration || 'unknown'} sec / max 120 sec` : ''}</div></div>
        <IconButton title="Remove file" onClick={() => { setFile(null); setAttachmentType('none'); setVideoDuration(''); }}><Icon name="x" size={17}/></IconButton>
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
        <div>
          <Textarea label="Message" value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Type message…" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 9, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', border: `1px solid ${T.border}`, borderRadius: 999, padding: '8px 11px', color: T.slate, fontSize: 12, fontWeight: 900, background: T.white }}>
              <Icon name="file" size={15}/> Attach
              <input type="file" onChange={e => onPickFile(e.target.files?.[0])} style={{ display: 'none' }} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />
            </label>
            {file && <Select label="" value={attachmentType} onChange={e => setAttachmentType(e.target.value)} options={[[ 'image', 'Image' ], [ 'document', 'Document' ], [ 'video', 'Video' ]]} />}
            {attachmentType === 'video' && file && <Input label="" type="number" value={videoDuration} onChange={e => setVideoDuration(e.target.value)} placeholder="seconds" style={{ width: 110 }} />}
            <Pill tone="info">Image · document · video</Pill>
          </div>
        </div>
        <Btn variant="gold" onClick={send} disabled={!text.trim() && !file} style={{ height: 44, borderRadius: 16, fontWeight: 950, padding: '0 18px' }}>Send</Btn>
      </div>
    </div>
  </Panel>;
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration); };
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}

function MessageBubble({ message, isMine }) {
  const u = message.sender_user;
  return <div style={{ display: 'flex', gap: 10, justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>
    {!isMine && <Avatar user={u} size={32} />}
    <div style={{ maxWidth: 'min(72%, 620px)', background: isMine ? `linear-gradient(135deg, ${T.navy}, ${T.navyLight})` : T.white, color: isMine ? T.white : T.slate, border: `1px solid ${isMine ? 'rgba(255,255,255,.1)' : T.border}`, borderRadius: isMine ? '18px 18px 6px 18px' : '18px 18px 18px 6px', padding: 12, boxShadow: '0 10px 26px rgba(15,23,42,.06)' }}>
      <div style={{ color: isMine ? 'rgba(255,255,255,.72)' : T.navy, fontWeight: 900, fontSize: 12 }}>{isMine ? 'You' : displayName(u)}</div>
      {message.text && <div style={{ color: isMine ? T.white : T.slate, fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 5, lineHeight: 1.5 }}>{message.text}</div>}
      {message.attachment_url && <AttachmentView message={message} isMine={isMine} />}
      <div style={{ color: isMine ? 'rgba(255,255,255,.52)' : T.slateLight, fontSize: 10, marginTop: 7 }}>{dateTime(message.created_at)}</div>
    </div>
    {isMine && <Avatar user={u} size={32} />}
  </div>;
}

function AttachmentView({ message, isMine }) {
  const url = resolveAssetUrl(message.attachment_url);
  if (message.attachment_type === 'image') return <img src={url} alt={message.attachment_name} style={{ display: 'block', maxWidth: 300, maxHeight: 240, borderRadius: 14, marginTop: 9, border: `1px solid ${isMine ? 'rgba(255,255,255,.18)' : T.border}` }} />;
  if (message.attachment_type === 'video') return <video src={url} controls style={{ display: 'block', maxWidth: 330, maxHeight: 250, borderRadius: 14, marginTop: 9 }} />;
  return <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', marginTop: 9, padding: '8px 11px', borderRadius: 12, background: isMine ? 'rgba(255,255,255,.12)' : T.navyTint, color: isMine ? T.white : T.navy, fontWeight: 900, fontSize: 12 }}><Icon name="file" size={14} style={{marginRight:6}}/>{message.attachment_name || 'Open document'}</a>;
}

function CreateConversationModal({ open, onClose, onCreated, onError }) {
  const [type, setType] = useState('direct');
  const [title, setTitle] = useState('');
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!q.trim()) { setUsers([]); return; }
      try { setUsers(asList(await api.list(endpoints.socialUserSearch, { q }))); }
      catch (e) { onError(getErrorMessage(e)); }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const toggle = (user) => {
    setSelected(prev => prev.find(x => x.id === user.id) ? prev.filter(x => x.id !== user.id) : [...prev, user]);
  };

  const create = async () => {
    onError('');
    try {
      const payload = type === 'direct'
        ? { type: 'direct', user_id: selected[0]?.id }
        : { type: 'group', title, participant_ids: selected.map(x => x.id) };
      const conv = await api.create(endpoints.socialConversations, payload);
      setSelected([]); setTitle(''); setQ(''); setType('direct');
      onCreated(conv);
    } catch (e) { onError(getErrorMessage(e)); }
  };

  return <Modal open={open} onClose={onClose} title="Create chat" subtitle="Direct chat requires accepted invitation. Group allows via-via connected users." width={680}>
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <button onClick={() => { setType('direct'); setSelected([]); }} style={{ border: `1px solid ${type === 'direct' ? T.gold : T.border}`, background: type === 'direct' ? T.goldLight : T.white, borderRadius: 18, padding: 14, cursor: 'pointer', textAlign: 'left' }}><strong style={{ color: T.navy, display:'inline-flex', alignItems:'center', gap:7 }}><Icon name="message" size={17}/> Personal</strong><div style={{ color: T.slateLight, fontSize: 12, marginTop: 4 }}>One accepted user</div></button>
        <button onClick={() => { setType('group'); setSelected([]); }} style={{ border: `1px solid ${type === 'group' ? T.gold : T.border}`, background: type === 'group' ? T.goldLight : T.white, borderRadius: 18, padding: 14, cursor: 'pointer', textAlign: 'left' }}><strong style={{ color: T.navy, display:'inline-flex', alignItems:'center', gap:7 }}><Icon name="users" size={17}/> Group</strong><div style={{ color: T.slateLight, fontSize: 12, marginTop: 4 }}>Two or more users</div></button>
      </div>
      {type === 'group' && <Input label="Group title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Team group" />}
      <SearchBox value={q} onChange={e => setQ(e.target.value)} placeholder="Search users by username/email/name…" />
      {selected.length > 0 && <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{selected.map(u => <button key={u.id} onClick={() => toggle(u)} style={{ border: `1px solid ${T.gold}`, background: T.goldLight, color: T.goldDark, borderRadius: 999, padding: '6px 10px', cursor: 'pointer', fontWeight: 900 }}><Icon name="check" size={13}/>{displayName(u)}</button>)}</div>}
      <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto', padding: 4 }}>
        {users.map(u => <UserLine key={u.id} user={u} sub={u.email || u.username} meta={statusText(u.connection_status)} onClick={() => toggle(u)} right={selected.find(x => x.id === u.id) ? <Pill tone="gold">Selected</Pill> : null} />)}
        {q.trim() && users.length === 0 && <EmptyState icon={<Icon name="search" size={38}/>} title="No users found" sub="Try exact username or email." />}
      </div>
      <Btn variant="gold" onClick={create} disabled={type === 'direct' ? selected.length !== 1 : selected.length < 2} style={{ borderRadius: 14, justifyContent: 'center', padding: '11px 16px', fontWeight: 950 }}>{type === 'direct' ? 'Start Personal Chat' : 'Create Group'}</Btn>
    </div>
  </Modal>;
}
