import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { T } from '../theme';
import { api, endpoints, getAccessToken, getErrorMessage, normalizeList, resolveAssetUrl } from '../api/client';
import { useApiDetail, useApiList } from '../hooks/useApi';
import {
  Badge, Breadcrumb, Btn, Card, EmptyState, FilterChips, Input, Modal, PageHeader,
  PriorityBadge, SectionTitle, Select, StatusBadge, TableWrapper, Td, Textarea, Th, TypeBadge, WizardBar, MomNotepadModal,
} from '../components/UI';
import { parseNotepadMulti, parseActionItems } from '../utils/parser';
import { Icon } from '../components/Icons';

export function ProtectedRoute({ children }) {
  return getAccessToken() ? children : <Navigate to="/login" replace />;
}

const today = () => new Date().toISOString().slice(0, 10);
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const asList = (payload) => normalizeList(payload);
const nice = (s) => String(s || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const boolText = (v) => (v === false ? 'Inactive' : 'Active');
const timeText = (v) => (v ? String(v).slice(0, 5) : '—');
const dateText = (v) => (v || '—');
const monthLabel = (value) => {
  if (!value) return '—';
  const [year, month] = String(value).slice(0, 7).split('-');
  if (!year || !month) return value;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
};
const monthValue = (value) => String(value || today()).slice(0, 7) + '-01';
const addDays = (value, days) => { const d = new Date(`${value}T00:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const monthOptions = (() => {
  const currentYear = new Date().getFullYear();
  const rows = [];
  for (let year = currentYear - 2; year <= currentYear + 2; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const value = `${year}-${String(month).padStart(2, '0')}-01`;
      rows.push([value, monthLabel(value)]);
    }
  }
  return rows;
})();
const sourceText = (x) => x?.source_display || x?.company_name || x?.name || x?.manual_source_name || '—';
const projectsText = (x) => (x?.project_names || []).join(', ') || x?.project_name || '—';
const workingDayOptions = [[0, 'Monday'], [1, 'Tuesday'], [2, 'Wednesday'], [3, 'Thursday'], [4, 'Friday'], [5, 'Saturday'], [6, 'Sunday']];
const defaultWorkingDays = [0, 1, 2, 3, 4];
const workingDayLabel = (days = defaultWorkingDays) => workingDayOptions.filter(([v]) => (days || []).map(Number).includes(v)).map(([, label]) => label).join(', ') || 'Monday to Friday';
const TEMPLATE_VAR_RE = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}|{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}/g;
const renderTemplateText = (text = '', values = {}) => String(text || '').replace(TEMPLATE_VAR_RE, (_, a, b) => { const key = a || b; return values?.[key] ?? ''; });
const parseVariablesCsv = (value) => Array.isArray(value) ? value : String(value || '').split(',').map(x => x.trim()).filter(Boolean);
const extractTemplateVariables = (...texts) => {
  const names = [];
  for (const text of texts) {
    for (const match of String(text || '').matchAll(TEMPLATE_VAR_RE)) {
      const name = match[1] || match[2];
      if (name && !names.includes(name)) names.push(name);
    }
  }
  return names;
};

const normalizeMomNumbering = (value = '') => {
  const raw = String(value || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return '';
  const blocks = raw.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  const units = blocks.length > 1 ? blocks : raw.split('\n').map(x => x.trim()).filter(Boolean);
  return units.map((line, idx) => {
    const clean = line.replace(/^[-•*]\s*/, '').trim();
    if (/^\d+[.)]\s+/.test(clean)) return clean.replace(/^\d+[.)]\s+/, `${idx + 1}. `);
    return `${idx + 1}. ${clean}`;
  }).join('\n');
};

const mergeMomParsed = (current, parsed) => ({
  ...current,
  ...parsed,
  mom: parsed.mom ? normalizeMomNumbering(parsed.mom) : current.mom,
  action_items: parsed.action_items?.length ? parsed.action_items.map(p => ({...p, done: Boolean((current.action_items||[]).find(o => o.text === p.text)?.done) || Boolean(p.done)})) : current.action_items,
});
const UNSAVED_MESSAGE = "You have unsaved changes. Leave without saving?";

const normalizeDirtyValue = (value) => {
  if (value instanceof File) {
    return {
      name: value.name,
      size: value.size,
      type: value.type,
      lastModified: value.lastModified,
    };
  }

  if (Array.isArray(value)) return value.map(normalizeDirtyValue);

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalizeDirtyValue(value[key]);
        return acc;
      }, {});
  }

  return value === undefined ? null : value;
};

const dirtyString = (value) => JSON.stringify(normalizeDirtyValue(value));

function useUnsavedPrompt(isDirty) {
  const allowPopRef = useRef(false);

  useEffect(() => {
    if (!isDirty) return undefined;

    const beforeUnloadHandler = (event) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    const linkClickHandler = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const link = event.target?.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;

      const nextUrl = new URL(link.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (next === current) return;

      if (!window.confirm(UNSAVED_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.pushState({ __unsavedPrompt: true }, "", currentUrl);

    const popStateHandler = () => {
      if (allowPopRef.current) return;

      if (window.confirm(UNSAVED_MESSAGE)) {
        allowPopRef.current = true;
        window.history.back();
      } else {
        window.history.pushState({ __unsavedPrompt: true }, "", currentUrl);
      }
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.addEventListener("popstate", popStateHandler);
    document.addEventListener("click", linkClickHandler, true);

    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      window.removeEventListener("popstate", popStateHandler);
      document.removeEventListener("click", linkClickHandler, true);
    };
  }, [isDirty]);
}


function confirmUnsaved(isDirty) {
  return !isDirty || window.confirm('You have unsaved changes. Leave without saving?');
}

function useIsMobile() {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [mobile, setMobile] = useState(get);
  useEffect(() => {
    const onResize = () => setMobile(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
}


function saveDraftAndLeave(cacheKey, payload, navigate, path) {
  if (window.confirm('Unsaved changes. Save this form in cache before going back?')) {
    localStorage.setItem(cacheKey, JSON.stringify({ ...payload, saved_at: new Date().toISOString() }));
    navigate(path);
    return;
  }
  if (window.confirm('Leave without saving this form?')) navigate(path);
}

function loadCachedDraft(cacheKey) {
  try { return JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { return null; }
}

function clearCachedDraft(cacheKey) { localStorage.removeItem(cacheKey); }

function CacheBanner({ cacheKey, onRestore, onClear }) {
  const [draft, setDraft] = useState(() => loadCachedDraft(cacheKey));
  if (!draft) return null;
  return <Notice type="warning">
    Draft cache found from {draft.saved_at ? new Date(draft.saved_at).toLocaleString() : 'last session'}.
    <span style={{display:'inline-flex',gap:8,marginLeft:10}}>
      <Btn variant="outline" style={{padding:'3px 8px',fontSize:11}} onClick={() => { onRestore(draft); setDraft(null); }}>Autofill</Btn>
      <Btn variant="ghost" style={{padding:'3px 8px',fontSize:11}} onClick={() => { clearCachedDraft(cacheKey); onClear?.(); setDraft(null); }}>Clear Cache</Btn>
    </span>
  </Notice>;
}


function Notice({ type = 'info', children }) {
  const c = { info: T.info, error: T.error, success: T.success, warning: T.warning }[type];
  const bg = { info: T.infoBg, error: T.errorBg, success: T.successBg, warning: T.warningBg }[type];
  return <div style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${c}22`, background: bg, color: c, fontSize: 12, marginBottom: 12 }}>{children}</div>;
}

function LoadingCard({ label = 'Loading…' }) {
  return <Card><div style={{ color: T.slateLight, fontSize: 13 }}>{label}</div></Card>;
}

function ActionCell({ onView, onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
      {onView && <Btn variant="outline" style={{ padding: '4px 8px', fontSize: 11 }} onClick={onView}>View</Btn>}
      {onEdit && <Btn variant="outline" style={{ padding: '4px 8px', fontSize: 11 }} onClick={onEdit}>Edit</Btn>}
      {onDelete && <Btn variant="danger" style={{ padding: '4px 8px', fontSize: 11 }} onClick={onDelete}>Delete</Btn>}
    </div>
  );
}

function FormGrid({ children }) {
  const mobile = useIsMobile();
  return <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: mobile ? 10 : 14 }}>{children}</div>;
}

function RelationSelect({ label, value, onChange, items, labelKey = 'name', required, blank = '— Select —' }) {
  return (
    <Select label={label} required={required} value={value || ''} onChange={e => onChange(e.target.value)} options={[[ '', blank ], ...items.map(x => [String(x.id), x[labelKey] || x.company_name || x.name])]} />
  );
}

function MonthSelect({ label = 'Work Month', value, onChange }) {
  return <Select label={label} value={monthValue(value)} onChange={e => onChange(e.target.value)} options={monthOptions} />;
}

function MultiSelectBox({ label, selected = [], onToggle, items, labelKey = 'name' }) {
  const ids = selected.map(String);
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>{label}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
        {items.map(item => {
          const active = ids.includes(String(item.id));
          return <button key={item.id} type="button" onClick={() => onToggle(item.id)} style={{ border: `1px solid ${active ? T.gold : T.border}`, background: active ? T.goldLight : T.white, color: active ? T.goldDark : T.slate, padding: '6px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>{active && <Icon name="check" size={13} style={{marginRight:4}}/>}{item[labelKey] || item.company_name || item.name}</button>;
        })}
        {items.length === 0 && <span style={{ fontSize: 12, color: T.slateLight }}>No records yet.</span>}
      </div>
    </div>
  );
}

function useBootstrap() {
  const [data, setData] = useState({ jobs: [], sources: [], projects: [], employees: [], emailTypes: [], emailTemplates: [], emailVariables: [], documentCategories: [], noteFolders: [], noteShareableUsers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [jobs, sources, projects, employees, emailTypes, emailTemplates, emailVariables, documentCategories, noteFolders, noteShareableUsers] = await Promise.all([
        api.list(endpoints.jobs), api.list(endpoints.sources), api.list(endpoints.projects), api.list(endpoints.employees),
        api.list(endpoints.emailTypes), api.list(endpoints.emailTemplates), api.list(endpoints.emailVariables, { active: 1 }), api.list(endpoints.documentCategories, { is_active: true }),
        api.list(endpoints.noteFolders, { is_active: true }), api.list(endpoints.noteShareableUsers),
      ]);
      setData({ jobs: asList(jobs), sources: asList(sources), projects: asList(projects), employees: asList(employees), emailTypes: asList(emailTypes), emailTemplates: asList(emailTemplates), emailVariables: asList(emailVariables), documentCategories: asList(documentCategories), noteFolders: asList(noteFolders), noteShareableUsers: asList(noteShareableUsers) });
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return { ...data, loading, error, reloadBootstrap: load };
}

/* Dashboard */
export function DashboardPage() {
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const { item: data, loading, error } = useApiDetail('/dashboard/');
  const summary = data?.summary || {};
  const stats = [
    ['tasks', 'Tasks Due Today', summary.tasks_due_today || 0, T.gold],
    ['calendar', 'Upcoming Meetings', summary.upcoming_meetings_24h || 0, T.info],
    ['wallet', 'Pending Salary', money(summary.pending_salary_total), T.warning],
    ['leave', 'Leave Used This Month', summary.leave_days_used_this_month || 0, T.error],
  ];
  if (loading) return <LoadingCard label="Loading dashboard…" />;
  return (
    <div>
      <PageHeader title="Dashboard" sub="Daily control center" />
      {error && <Notice type="error">{error}</Notice>}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 20 }}>
        {stats.map(([icon, label, value, color]) => (
          <Card key={label} style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: '0 auto 0 0', width: 4, background: color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: T.slateLight, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span><span style={{ color }}><Icon name={icon} size={22}/></span></div>
            <div style={{ fontSize: 30, color: T.navy, fontWeight: 900, marginTop: 10 }}>{value}</div>
          </Card>
        ))}
      </div>
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle>Quick Actions</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: 12 }}>
          {[
            ['＋ Add Task', '/tasks/new'], ['＋ Add Meeting', '/meetings/new'], ['＋ Log Leave', '/leave/new'], ['＋ Record Salary', '/salary/new'], ['＋ Send Email', '/emails/new'], ['View Reports', '/reports'],
          ].map(([label, path]) => <Btn key={label} variant={label.startsWith('＋') ? 'gold' : 'primary'} onClick={() => navigate(path)} style={{ justifyContent: 'center', minHeight: 62 }}>{label}</Btn>)}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 20 }}>
        <Card><SectionTitle>Today's Tasks</SectionTitle><FeedList items={data?.today_tasks || []} empty="No tasks today" render={t => <><strong>{t.name}</strong><br/><span>{projectsText(t)} · <PriorityBadge priority={t.priority} /></span></>} /></Card>
        <Card><SectionTitle>Upcoming Meetings & Pending Salaries</SectionTitle><FeedList items={[...(data?.upcoming_meetings || []).map(x => ({...x, kind:'meeting'})), ...(data?.pending_salaries || []).map(x => ({...x, kind:'salary'}))]} empty="Nothing pending" render={x => x.kind === 'salary' ? <><strong>{sourceText(x)}</strong><br/><span>{money(x.pending_amount)} pending · <StatusBadge status={x.status} /></span></> : <><strong>{x.title}</strong><br/><span>{x.date} {timeText(x.start_time)} · <StatusBadge status={x.status} /></span></>} /></Card>
      </div>
    </div>
  );
}

function FeedList({ items, empty, render }) {
  if (!items.length) return <EmptyState icon={<Icon name="archive" size={38}/>}  title={empty} sub="Use quick actions to add records." />;
  return <div style={{ display: 'grid', gap: 10 }}>{items.map((x, idx) => <div key={`${x.kind || 'item'}-${x.id || idx}`} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, background: idx % 2 ? T.rowAlt : T.white, fontSize: 13, color: T.slate }}>{render(x)}</div>)}</div>;
}


function DateRangeFilter({ value, onChange }) {
  return <div style={{display:'flex',gap:8,alignItems:'end',marginBottom:14,flexWrap:'wrap'}}>
    <Input label="From Date" type="date" value={value.date_from || ''} onChange={e=>onChange({...value,date_from:e.target.value})} />
    <Input label="To Date" type="date" value={value.date_to || ''} onChange={e=>onChange({...value,date_to:e.target.value})} />
    <Btn variant="outline" onClick={()=>onChange({date_from:'',date_to:''})}>Clear Dates</Btn>
  </div>;
}

/* Tasks */
export function TaskListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ date_from: '', date_to: '' });
  const [filterOpen, setFilterOpen] = useState(false);
  const params = { ...(filter === 'all' ? {} : ['job','freelancing','manual'].includes(filter) ? { task_type: filter } : { status: filter }), ...dateFilter };
  const { items, loading, error, reload } = useApiList(endpoints.tasks, params, [filter, dateFilter.date_from, dateFilter.date_to]);
  const remove = async (id) => { if (!confirm('Delete this task?')) return; await api.remove(`/tasks/${id}/`); reload(); };
  return (
    <div>
      <Modal open={filterOpen} onClose={()=>setFilterOpen(false)} title="Filter Tasks" width={520}>
        <FilterChips active={filter} onChange={setFilter} options={[[ 'all','All' ],[ 'job','Job' ],[ 'freelancing','Freelance' ],[ 'manual','Manual' ],[ 'todo','Todo' ],[ 'in_progress','In Progress' ],[ 'completed','Completed' ]]} />
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}><Btn variant="outline" onClick={()=>{setFilter('all');setDateFilter({date_from:'',date_to:''});setFilterOpen(false);}}>Clear</Btn><Btn variant="gold" onClick={()=>setFilterOpen(false)}>Apply</Btn></div>
      </Modal>
      <PageHeader title="Tasks" sub={`${items.length} task records`} action={<div style={{display:'flex',gap:8}}><Btn variant="outline" onClick={()=>setFilterOpen(true)}><Icon name="search" size={15}/> Filter</Btn><Btn variant="gold" onClick={() => navigate('/tasks/new')}>＋ Add Task</Btn></div>} />
      {error && <Notice type="error">{error}</Notice>}
      {loading ? <LoadingCard /> : !items.length ? <EmptyState icon={<Icon name="tasks" size={38}/>} title="No tasks found" sub="Add your first task" action={<Btn variant="gold" onClick={() => navigate('/tasks/new')}>＋ Add Task</Btn>} /> : (
        <TableWrapper><thead><tr><Th>Task Name</Th><Th>Source / Project</Th><Th>Assigned By</Th><Th>Date</Th><Th>Start–End</Th><Th>Duration</Th><Th>Priority</Th><Th>Status</Th><Th>Actions</Th></tr></thead><tbody>
          {items.map((t, i) => <tr key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} style={{ cursor: 'pointer' }}><Td alt={i%2}><div style={{ fontWeight: 600, color: T.navy }}>{t.name}</div><TypeBadge type={t.task_type} /></Td><Td alt={i%2}><div>{sourceText(t)}</div><div style={{ fontSize: 11, color: T.slateLight }}>{projectsText(t)}</div></Td><Td alt={i%2}>{t.assigned_by_name || '—'}</Td><Td alt={i%2}>{dateText(t.date)}</Td><Td alt={i%2}>{timeText(t.start_time)}–{timeText(t.end_time)}</Td><Td alt={i%2}>{t.duration_minutes || 0} min</Td><Td alt={i%2}><PriorityBadge priority={t.priority} /></Td><Td alt={i%2}><StatusBadge status={t.status} /></Td><Td alt={i%2}><ActionCell onView={() => navigate(`/tasks/${t.id}`)} onDelete={() => remove(t.id)} /></Td></tr>)}
        </tbody></TableWrapper>
      )}
    </div>
  );
}

export function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { item: task, loading, error, reload } = useApiDetail(`/tasks/${id}/`, [id]);
  const [status, setStatus] = useState('');
  useEffect(() => { if (task) setStatus(task.status); }, [task]);
  const saveStatus = async () => { await api.update(`/tasks/${id}/`, { status }); reload(); };
  if (loading) return <LoadingCard />;
  if (error) return <Notice type="error">{error}</Notice>;
  if (!task) return null;
  return <RecordDetail title={task.name} back="/tasks" badges={<><TypeBadge type={task.task_type} /><PriorityBadge priority={task.priority} /><StatusBadge status={task.status} /></>} actions={<><Select value={status} onChange={e => setStatus(e.target.value)} options={[[ 'todo','Todo' ],[ 'in_progress','In Progress' ],[ 'completed','Completed' ],[ 'cancelled','Cancelled' ],[ 'hold','Hold' ]]} /><Btn variant="gold" onClick={saveStatus}>Save Status</Btn></>} sections={[['Task Details', [['Source', sourceText(task)], ['Project', projectsText(task)], ['Assigned By', task.assigned_by_name], ['Date', task.date], ['Start Time', timeText(task.start_time)], ['End Time', timeText(task.end_time)], ['Duration', `${task.duration_minutes || 0} min`], ['Reason', task.reason], ['Notes', task.notes]]], ['Members', (task.member_names || []).map((m, i) => [`Member ${i+1}`, m])]]} />;
}

function RecordDetail({ title, back, badges, actions, sections }) {
  const navigate = useNavigate();
  return <div><Breadcrumb items={['Dashboard', title]} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}><div><h1 style={{ color: T.navy, fontSize: 24, marginBottom: 8 }}>{title}</h1><div style={{ display: 'flex', gap: 8 }}>{badges}</div></div><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Btn variant="outline" onClick={() => navigate(back)}>← Back</Btn>{actions}</div></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>{sections.map(([name, rows], idx) => <Card key={name}><SectionTitle>{name}</SectionTitle><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>{(rows || []).map(([k, v]) => <div key={k} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}`, paddingRight: 12 }}><div style={{ fontSize: 11, color: T.slateLight, textTransform: 'uppercase', fontWeight: 700 }}>{k}</div><div style={{ fontSize: 13, color: T.navy, whiteSpace: 'pre-wrap' }}>{v || '—'}</div></div>)}</div></Card>)}</div></div>;
}

const EMPTY_TASK_ROW = () => ({ id: Date.now() + Math.random(), name: '', description: '', date: today(), start: '', end: '', priority: 'normal', status: 'todo', assigned: '', reason: '', notes: '' });
export function AddTaskPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState({ type: 'job', source: '', project: '' });
  const [rows, setRows] = useState([EMPTY_TASK_ROW()]);
  const [notepad, setNotepad] = useState('');
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [sourceItems, setSourceItems] = useState([]);
  const [projectItems, setProjectItems] = useState([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const validRows = rows.filter(r => r.name.trim());
  const isDirty = validRows.length > 0 || Boolean(sel.source || sel.project);
  useUnsavedPrompt(isDirty);
  const cacheKey = 'pwm_add_task_draft';
  const saveDraftPayload = () => ({ step, sel, rows });
  const safeBack = () => { if (!isDirty) navigate('/tasks'); else saveDraftAndLeave(cacheKey, saveDraftPayload(), navigate, '/tasks'); };
  useEffect(() => {
    if (step !== 1 || !['job','freelancing'].includes(sel.type)) return;
    setLoadingSource(true);
    api.list(sel.type === 'job' ? endpoints.jobs : endpoints.sources)
      .then(data => setSourceItems(asList(data)))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoadingSource(false));
  }, [step, sel.type]);
  useEffect(() => {
    if (step !== 2 || !sel.source) return;
    const params = sel.type === 'job' ? { source_type: 'job', job: sel.source } : { source_type: 'freelancing', freelance_source: sel.source };
    setLoadingSource(true);
    api.list(endpoints.projects, params)
      .then(data => setProjectItems(asList(data)))
      .catch(err => setError(getErrorMessage(err)))
      .finally(() => setLoadingSource(false));
  }, [step, sel.type, sel.source]);
  const sources = sourceItems;
  const projects = projectItems;
  const upd = (id, field, value) => setRows(rs => rs.map(r => r.id === id ? { ...r, [field]: value } : r));
  const addRow = () => setRows(rs => [...rs, EMPTY_TASK_ROW()]);
  const parse = () => { const parsed = parseNotepadMulti(notepad).map((x, i) => ({ ...EMPTY_TASK_ROW(), ...x, id: Date.now() + i })); if (parsed.length) setRows(rs => rs.length === 1 && !rs[0].name ? parsed : [...rs, ...parsed]); setNotepad(''); setNotepadOpen(false); };
  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.create(endpoints.taskBulk, { type: sel.type, source: sel.source || undefined, project: sel.project || undefined, tasks: validRows });
      clearCachedDraft(cacheKey);
      navigate('/tasks');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(false); }
  };
  return <div><PageHeader title="Add Tasks" sub="Bulk create tasks from table or notepad import" action={<Btn variant="outline" onClick={safeBack}><Icon name="arrowLeft" size={15}/> Back</Btn>} />{error && <Notice type="error">{error}</Notice>}<CacheBanner cacheKey={cacheKey} onRestore={draft => { if (draft.sel) setSel(draft.sel); if (draft.rows) setRows(draft.rows); setStep(draft.step || 0); }} onClear={() => { setSel({ type:'job', source:'', project:'' }); setRows([EMPTY_TASK_ROW()]); setStep(0); }} /><Modal open={notepadOpen} onClose={() => setNotepadOpen(false)} title={<span style={{display:'inline-flex',alignItems:'center',gap:7}}><Icon name="note" size={16}/> Notepad — Quick Task Entry</span>} subtitle="Separate multiple tasks with a blank line" width={580}>
        <div style={{ background: T.cream, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: T.slateLight, lineHeight: 1.7 }}>
          <strong style={{ color: T.navy }}>Format:</strong> name, YYYY-MM-DD, HH:MM-HH:MM, priority, assigned to<br />
          <span style={{ fontFamily: 'monospace', color: T.navy, fontSize: 11 }}>Fix login bug, 2026-06-14, 10:00-12:00, high, Rahul</span><br />
          <span style={{ fontSize: 11 }}>Optional lines like <strong>Notes:</strong>, <strong>Reason:</strong>, <strong>Description:</strong> are kept in the task row.</span>
        </div>
        <textarea
          value={notepad}
          onChange={e => setNotepad(e.target.value)}
          autoFocus
          placeholder={`Fix login bug, 2026-06-14, 10:00-12:00, high, Rahul
Notes: Check JWT refresh also

Write unit tests
2026-06-15
09:00-11:00
normal
Reason: sprint hardening`}
          style={{ width: '100%', height: 180, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontFamily: "'Courier New', monospace", resize: 'none', outline: 'none', lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderColor = T.gold}
          onBlur={e => e.target.style.borderColor = T.border}
        />
        {(() => {
          const parsed = notepad.trim() ? parseNotepadMulti(notepad) : [];
          return parsed.length > 0 ? (
            <div style={{ marginTop: 10, padding: '8px 12px', background: T.successBg, borderRadius: 7, border: `1px solid #B7DFD0`, fontSize: 12, color: T.success }}>
              <Icon name="check" size={14}/> {parsed.length} task{parsed.length > 1 ? 's' : ''} detected: {parsed.map(x => x.name).join(' · ')}
            </div>
          ) : null;
        })()}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}>
          <Btn variant="outline" onClick={() => { setNotepad(''); setNotepadOpen(false); }}>Cancel</Btn>
          <Btn variant="gold" onClick={parse}>Parse & Add to Table →</Btn>
        </div>
      </Modal><Card><WizardBar steps={['Type','Source','Project','Tasks','Review']} current={step} onStep={setStep} />{step===0 && <TypeStep value={sel.type} onChange={v => { setSel({ type:v, source:'', project:'' }); setStep(v === 'manual' ? 3 : 1); }} />}{step===1 && <CardStep title={loadingSource ? 'Loading Source…' : 'Select Source'} items={sources} value={sel.source} onSelect={id => { setSel({ ...sel, source:id, project:'' }); setStep(2); }} empty="Create a Job / Freelance Source first from Management." back={() => setStep(0)} />}{step===2 && <CardStep title={loadingSource ? 'Loading Projects…' : 'Select Project'} items={projects} value={sel.project} onSelect={id => { setSel({ ...sel, project:id }); setStep(3); }} empty="No project yet. You can skip project." back={() => setStep(1)} skip={() => setStep(3)} />}{step===3 && <BulkTaskTable rows={rows} upd={upd} addRow={addRow} delRow={id => setRows(rs => rs.length > 1 ? rs.filter(r => r.id !== id) : rs)} onNotepad={() => setNotepadOpen(true)} next={() => setStep(4)} validCount={validRows.length} />}{step===4 && <ReviewBulk rows={validRows} save={save} saving={saving} back={() => setStep(3)} />}</Card></div>;
}

function TypeStep({ value, onChange }) {
  return <div><h2 style={{ color:T.navy, fontSize:16, marginBottom:12 }}>Select type</h2><div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14 }}>{[[ 'job','building','Job' ],[ 'freelancing','briefcase','Freelancing' ],[ 'manual','edit','Manual' ]].map(([v,icon,label]) => <button key={v} onClick={() => onChange(v)} style={{ padding:30, borderRadius:14, border:`2px solid ${value===v?T.gold:T.border}`, background:value===v?T.goldLight:T.white, cursor:'pointer' }}><div style={{color:T.navy,marginBottom:8}}><Icon name={icon} size={32}/></div><strong style={{ color:T.navy }}>{label}</strong></button>)}</div></div>;
}
function CardStep({ title, items, value, onSelect, empty, back, skip }) {
  return <div><h2 style={{ color:T.navy, fontSize:16, marginBottom:12 }}>{title}</h2>{!items.length ? <Notice type="warning">{empty}</Notice> : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>{items.map(x => <button key={x.id} onClick={() => onSelect(x.id)} style={{ textAlign:'left', padding:16, borderRadius:12, border:`2px solid ${String(value)===String(x.id)?T.gold:T.border}`, background:String(value)===String(x.id)?T.goldLight:T.white, cursor:'pointer' }}><strong style={{ color:T.navy }}>{x.company_name || x.name}</strong><div style={{ color:T.slateLight, fontSize:12 }}>{x.job_title || x.primary_contact_name || x.status}</div></button>)}</div>}<div style={{ marginTop:16, display:'flex', gap:8 }}><Btn variant="outline" onClick={back}>← Back</Btn>{skip && <Btn variant="outline" onClick={skip}>Skip Project</Btn>}</div></div>;
}
function BulkTaskTable({ rows, upd, addRow, delRow, onNotepad, next, validCount }) {
  return <div>
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
      <div>
        <h2 style={{ color:T.navy, fontSize:16 }}>Add Task Rows</h2>
        <p style={{ color:T.slateLight, fontSize:12 }}>{validCount} task ready</p>
      </div>
      <div style={{ display:'flex', gap:8 }}><Btn variant="outline" onClick={onNotepad}><Icon name="note" size={15}/> Notepad Import</Btn><Btn variant="gold" onClick={addRow}>＋ Row</Btn></div>
    </div>
    <TableWrapper><thead><tr><Th>#</Th><Th>Task Name</Th><Th>Date</Th><Th>Start</Th><Th>End</Th><Th>Priority</Th><Th>Status</Th><Th>Assigned</Th><Th>Notes</Th><Th></Th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id}><Td>{i+1}</Td><Td><input value={r.name} onChange={e=>upd(r.id,'name',e.target.value)} style={cellInput} /></Td><Td><input type="date" value={r.date} onChange={e=>upd(r.id,'date',e.target.value)} style={cellInput} /></Td><Td><input type="time" value={r.start} onChange={e=>upd(r.id,'start',e.target.value)} style={cellInput} /></Td><Td><input type="time" value={r.end} onChange={e=>upd(r.id,'end',e.target.value)} style={cellInput} /></Td><Td><select value={r.priority} onChange={e=>upd(r.id,'priority',e.target.value)} style={cellInput}>{['urgent','high','normal','low'].map(x=><option key={x} value={x}>{nice(x)}</option>)}</select></Td><Td><select value={r.status} onChange={e=>upd(r.id,'status',e.target.value)} style={cellInput}>{['todo','in_progress','completed'].map(x=><option key={x} value={x}>{nice(x)}</option>)}</select></Td><Td><input value={r.assigned} onChange={e=>upd(r.id,'assigned',e.target.value)} style={cellInput} /></Td><Td><textarea value={r.notes} onChange={e=>upd(r.id,'notes',e.target.value)} rows={1} placeholder="notes / reason" style={{...cellInput, resize:'vertical', minWidth:150}} /></Td><Td><Btn variant="ghost" onClick={()=>delRow(r.id)}><Icon name="x" size={15}/></Btn></Td></tr>)}</tbody></TableWrapper>
    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}><Btn variant="gold" disabled={!validCount} onClick={next}>Review & Save →</Btn></div>
  </div>;
}
const cellInput = { width:'100%', padding:'6px 8px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12 };
function ReviewBulk({ rows, save, saving, back }) { return <div><h2 style={{ color:T.navy, fontSize:16, marginBottom:12 }}>Review</h2><TableWrapper><thead><tr><Th>#</Th><Th>Name</Th><Th>Date</Th><Th>Time</Th><Th>Priority</Th><Th>Status</Th><Th>Assigned</Th><Th>Notes</Th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.id}><Td>{i+1}</Td><Td>{r.name}</Td><Td>{r.date}</Td><Td>{r.start}–{r.end}</Td><Td><PriorityBadge priority={r.priority}/></Td><Td><StatusBadge status={r.status}/></Td><Td>{r.assigned || '—'}</Td><Td>{r.notes || r.reason || r.description || '—'}</Td></tr>)}</tbody></TableWrapper><div style={{ display:'flex', justifyContent:'space-between', marginTop:16 }}><Btn variant="outline" onClick={back}>← Edit</Btn><Btn variant="gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : `Save ${rows.length} Task${rows.length !== 1 ? 's' : ''}`}</Btn></div></div>; }


function formatActionItems(items = []) {
  if (!items?.length) return '';
  return items.map((x, i) => `${i + 1}. ${x.done ? '[Done]' : '[Pending]'} ${x.text || ''}`).join('\n');
}


function printMomPdf(meeting, fields = []) {
  const esc = (v) => String(v || '').replace(/[&<>]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch])).replace(/\n/g, '<br/>');
  const selected = fields?.length ? fields : ['mom'];
  const sections = [];
  if (selected.includes('agenda') && meeting.agenda) sections.push(['Agenda', esc(meeting.agenda)]);
  if (selected.includes('mom')) sections.push(['Minutes of Meeting', esc(meeting.mom)]);
  if (selected.includes('conclusion')) sections.push(['Conclusion', esc(meeting.conclusion)]);
  if (selected.includes('next_action')) sections.push(['Next Actions', esc(meeting.next_action)]);
  if (selected.includes('action_items') && (meeting.action_items || []).length) {
    sections.push(['Point Status', `<ul>${(meeting.action_items||[]).map(x=>`<li><strong>${x.done ? 'Done' : 'Pending'}</strong> — ${esc(x.text)}</li>`).join('')}</ul>`]);
  }
  if (selected.includes('members') && (meeting.member_roles || []).length) {
    sections.push(['Members', `<table><thead><tr><th>Name</th><th>Role</th><th>Attendance</th></tr></thead><tbody>${(meeting.member_roles||[]).map(x=>`<tr><td>${esc(x.member_name)}</td><td>${esc(nice(x.role))}</td><td>${x.attended ? 'Present' : '—'}</td></tr>`).join('')}</tbody></table>`]);
  }
  const body = sections.map(([title, html]) => `<section><h2>${title}</h2><div class="section-body">${html || '<span class="muted">—</span>'}</div></section>`).join('');
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>${esc(meeting.title)} - MOM</title><style>
    @page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1B2A4A;margin:0;background:#fff} .wrap{padding:8px 0}.header{border:1px solid #D8D8D8;border-left:6px solid #C9A84C;border-radius:12px;padding:18px 20px;margin-bottom:18px}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#718096;font-weight:700}.title{font-size:26px;font-weight:800;margin:6px 0 10px}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 18px;color:#4A5568;font-size:12px}.meta b{color:#1B2A4A}section{break-inside:avoid;border:1px solid #D8D8D8;border-radius:12px;margin:12px 0;overflow:hidden}h2{margin:0;background:#FAF8F4;color:#1B2A4A;font-size:15px;padding:10px 14px;border-bottom:1px solid #D8D8D8}.section-body{padding:14px;font-size:13px;line-height:1.7;color:#4A5568;white-space:normal}table{width:100%;border-collapse:collapse}th{background:#1B2A4A;color:#fff;text-align:left;font-size:11px;padding:8px}td{border-bottom:1px solid #D8D8D8;padding:8px;font-size:12px;color:#4A5568}ul{margin:0;padding-left:18px}.muted{color:#718096}.footer{font-size:10px;color:#718096;margin-top:18px;text-align:right}@media print{button{display:none}.wrap{padding:0}}
  </style></head><body><div class="wrap"><div class="header"><div class="eyebrow">Minutes of Meeting</div><div class="title">${esc(meeting.title)}</div><div class="meta"><div><b>Date:</b> ${esc(meeting.date)}</div><div><b>Time:</b> ${esc(timeText(meeting.start_time))} - ${esc(timeText(meeting.end_time))}</div><div><b>Source:</b> ${esc(sourceText(meeting))}</div><div><b>Projects:</b> ${esc(projectsText(meeting))}</div><div><b>Status:</b> ${esc(nice(meeting.status))}</div><div><b>Location:</b> ${esc(meeting.location || '—')}</div></div></div>${body}<div class="footer">Generated from Personal Work Manager</div></div></body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(), 350);
}

function MomPdfModal({ open, meeting, meetings = [], selectedMeetingId = '', onMeetingChange, onClose }) {
  const [fields, setFields] = useState(['mom', 'conclusion', 'next_action']);
  const activeMeeting = meeting || meetings.find(x => String(x.id) === String(selectedMeetingId)) || null;
  const options = [
    ['agenda', 'Agenda'], ['mom', 'MOM'], ['conclusion', 'Conclusion'], ['next_action', 'Next Actions'], ['members', 'Members'], ['action_items', 'Point Status'],
  ];
  const toggle = (key) => setFields(fs => fs.includes(key) ? fs.filter(x => x !== key) : [...fs, key]);
  if (!open) return null;
  return <Modal open={open} onClose={onClose} title="Download MOM PDF" subtitle="Choose what should appear in the PDF" width={520}>
    {meetings.length > 0 && <Select label="Meeting" value={selectedMeetingId || ''} onChange={e=>onMeetingChange?.(e.target.value)} options={[[ '', '— Select Meeting —' ], ...meetings.map(x => [String(x.id), `${x.title} · ${x.date}`])]} />}
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginTop:14}}>
      {options.map(([key,label]) => <label key={key} style={{display:'flex',alignItems:'center',gap:8,border:`1px solid ${fields.includes(key)?T.gold:T.border}`,background:fields.includes(key)?T.goldLight:T.white,borderRadius:10,padding:'10px 12px',fontSize:13,color:T.slate,cursor:'pointer'}}>
        <input type="checkbox" checked={fields.includes(key)} onChange={()=>toggle(key)} /> {label}
      </label>)}
    </div>
    <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}>
      <Btn variant="outline" onClick={onClose}>Cancel</Btn>
      <Btn variant="gold" disabled={!activeMeeting || fields.length === 0} onClick={()=>activeMeeting && printMomPdf(activeMeeting, fields)}>Download PDF</Btn>
    </div>
  </Modal>;
}


function ActionPointEditor({ items = [], onChange }) {
  const rows = (items || []).filter(x => x?.text);
  if (!rows.length) return null;
  const toggle = (idx) => onChange(rows.map((x, i) => i === idx ? { ...x, done: !Boolean(x.done) } : x));
  const updateText = (idx, text) => onChange(rows.map((x, i) => i === idx ? { ...x, text } : x));
  return <div style={{gridColumn:'1 / -1', border:`1px solid ${T.border}`, borderRadius:10, padding:12, background:T.cream}}>
    <div style={{fontSize:12,fontWeight:800,color:T.navy,marginBottom:8}}>Next Action Checklist</div>
    <div style={{display:'grid',gap:8}}>
      {rows.map((item, idx) => <label key={idx} style={{display:'grid',gridTemplateColumns:'24px minmax(0,1fr)',gap:8,alignItems:'center',fontSize:13,color:T.slate}}>
        <input type="checkbox" checked={Boolean(item.done)} onChange={() => toggle(idx)} />
        <input value={item.text || ''} onChange={e => updateText(idx, e.target.value)} style={{...cellInput, textDecoration:item.done?'line-through':'none', color:item.done?T.slateLight:T.slate}} />
      </label>)}
    </div>
  </div>;
}


/* Meetings */
export function MeetingListPage() {
  const navigate=useNavigate();
  const [dateFilter,setDateFilter]=useState({date_from:'',date_to:''});
  const [filterOpen,setFilterOpen]=useState(false);
  const [pdfOpen,setPdfOpen]=useState(false);
  const [pdfMeetingId,setPdfMeetingId]=useState('');
  const {items,loading,error,reload}=useApiList(endpoints.meetings,dateFilter,[dateFilter.date_from,dateFilter.date_to]);
  const remove=async(id)=>{if(!confirm('Delete meeting?'))return; await api.remove(`/meetings/${id}/`); reload();};
  const actions=<div style={{display:'flex',gap:8,alignItems:'center'}}>
    <Btn variant="outline" onClick={()=>setFilterOpen(true)}><Icon name="search" size={15}/> Filter</Btn>
    <Btn variant="outline" onClick={()=>setPdfOpen(true)}>⬇ MOM PDF</Btn>
    <Btn variant="gold" onClick={()=>navigate('/meetings/new')}>＋ Add Meeting</Btn>
  </div>;
  return <div>
    <Modal open={filterOpen} onClose={()=>setFilterOpen(false)} title="Filter Meetings" width={460}>
      <DateRangeFilter value={dateFilter} onChange={setDateFilter}/>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8}}><Btn variant="outline" onClick={()=>{setDateFilter({date_from:'',date_to:''});setFilterOpen(false);}}>Clear</Btn><Btn variant="gold" onClick={()=>setFilterOpen(false)}>Apply</Btn></div>
    </Modal>
    <MomPdfModal open={pdfOpen} meetings={items} selectedMeetingId={pdfMeetingId} onMeetingChange={setPdfMeetingId} onClose={()=>setPdfOpen(false)} />
    <PageHeader title="Meetings / MOM" sub="List and calendar-ready meeting data" action={actions}/>
    {error&&<Notice type="error">{error}</Notice>}
    {loading?<LoadingCard/>:!items.length?<EmptyState title="No meetings yet" sub="Create your first record."/>:<TableWrapper><thead><tr><Th>Title</Th><Th>Source / Project</Th><Th>Date</Th><Th>Time</Th><Th>Status</Th><Th>MOM</Th><Th>Actions</Th></tr></thead><tbody>{items.map((m,i)=><tr key={m.id} onClick={()=>navigate(`/meetings/${m.id}`)} style={{cursor:'pointer'}}><Td alt={i%2}><strong style={{color:T.navy}}>{m.title}</strong><br/><TypeBadge type={m.meeting_type}/></Td><Td alt={i%2}>{sourceText(m)}<br/><span style={{fontSize:11,color:T.slateLight}}>{projectsText(m)}</span></Td><Td alt={i%2}>{m.date}</Td><Td alt={i%2}>{timeText(m.start_time)}–{timeText(m.end_time)}</Td><Td alt={i%2}><StatusBadge status={m.status}/></Td><Td alt={i%2}>{m.mom ? <Badge label="Filled" color="success"/> : <Badge label="Pending" color="warning"/>}</Td><Td alt={i%2}><div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}><Btn variant="outline" style={{padding:'4px 8px',fontSize:11}} onClick={()=>navigate(`/meetings/${m.id}`)}>View</Btn><Btn variant="outline" style={{padding:'4px 8px',fontSize:11}} onClick={()=>navigate(`/meetings/${m.id}/mom`)}>Edit</Btn><Btn variant="outline" style={{padding:'4px 8px',fontSize:11}} onClick={()=>{setPdfMeetingId(String(m.id));setPdfOpen(true);}}>PDF</Btn><Btn variant="danger" style={{padding:'4px 8px',fontSize:11}} onClick={()=>remove(m.id)}>Delete</Btn></div></Td></tr>)}</tbody></TableWrapper>}
  </div>;
}
export function MeetingDetailPage(){
  const {id}=useParams();
  const {item,loading,error}=useApiDetail(`/meetings/${id}/`,[id]);
  const [pdfOpen,setPdfOpen]=useState(false);
  if(loading)return <LoadingCard/>; if(error)return <Notice type="error">{error}</Notice>;
  const pdfAction=<><Btn variant="outline" onClick={()=>setPdfOpen(true)}>⬇ Download MOM PDF</Btn><MomPdfModal open={pdfOpen} meeting={item} onClose={()=>setPdfOpen(false)} /></>;
  return <RecordDetail title={item.title} back="/meetings" actions={pdfAction} badges={<><TypeBadge type={item.meeting_type}/><StatusBadge status={item.status}/></>} sections={[[ 'Details', [['Source',sourceText(item)],['Projects',projectsText(item)],['Date',item.date],['Start',timeText(item.start_time)],['End',timeText(item.end_time)],['Location',item.location],['Link',item.link],['Agenda',item.agenda]] ],[ 'MOM', [['Minutes',item.mom],['Conclusion',item.conclusion],['Next Action',item.next_action],['Action Points',formatActionItems(item.action_items||[])]] ],[ 'Members',(item.member_roles||[]).map(x=>[x.role,x.member_name]) ]]}/>;
}
export function MeetingMOMPage(){
  const {id}=useParams();
  const navigate=useNavigate();
  const {item,loading,error}=useApiDetail(`/meetings/${id}/`,[id]);
  const [notepadOpen,setNotepadOpen]=useState(false);
  const [form,setForm]=useState({mom:'',conclusion:'',next_action:'',action_items:[],status:'completed'});
  useEffect(()=>{if(item)setForm({mom:item.mom||'',conclusion:item.conclusion||'',next_action:item.next_action||'',action_items:item.action_items||[],status:item.status||'completed'});},[item]);
  const isDirty = item && (form.mom !== (item.mom||'') || form.conclusion !== (item.conclusion||'') || form.next_action !== (item.next_action||'') || JSON.stringify(form.action_items||[]) !== JSON.stringify(item.action_items||[]) || form.status !== (item.status||'completed'));
  useUnsavedPrompt(Boolean(isDirty));
  const safeBack = () => { if (confirmUnsaved(Boolean(isDirty))) navigate('/meetings'); };
  
  const save=async()=>{await api.update(`/meetings/${id}/mom/`,form); navigate(`/meetings/${id}`);};
  if(loading)return <LoadingCard/>;
  return <div>
    <MomNotepadModal open={notepadOpen} initialText={[form.mom, form.conclusion, form.next_action].filter(Boolean).join('\n\n')} onClose={()=>setNotepadOpen(false)} onParsed={p=>setForm(f=>mergeMomParsed(f,p))}/>
    <PageHeader title="Fill / Edit MOM" sub={item?.title} action={<Btn variant="outline" onClick={safeBack}><Icon name="arrowLeft" size={15}/> Back</Btn>}/>
    {error&&<Notice type="error">{error}</Notice>}
    <Card>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div>
          <SectionTitle>Minutes of Meeting</SectionTitle>
        </div>
        <Btn variant="gold" onClick={()=>setNotepadOpen(true)} style={{fontSize:12}}><Icon name="note" size={15}/> Notepad Import</Btn>
      </div>
      <FormGrid>
        <Textarea label="MOM / Discussion Notes" value={form.mom} onChange={e=>setForm({...form,mom:e.target.value})} onBlur={() => setForm(f => ({...f, mom: normalizeMomNumbering(f.mom)}))} rows={7}/>
        <Textarea label="Conclusion" value={form.conclusion} onChange={e=>setForm({...form,conclusion:e.target.value})} rows={7}/>
        <Textarea label="Next Actions" value={form.next_action} onChange={e=>setForm(f=>{ const parsed=parseActionItems(e.target.value); const oldItems=f.action_items||[]; return {...f,next_action:e.target.value,action_items:parsed.map(p=>({...p,done:Boolean(oldItems.find(o=>o.text===p.text)?.done) || Boolean(p.done)}))}; })} rows={5}/>
        <Select label="Status" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={[[ 'scheduled','Scheduled' ],[ 'completed','Completed' ],[ 'cancelled','Cancelled' ]]}/>
        <ActionPointEditor items={form.action_items} onChange={items=>setForm({...form,action_items:items})}/>
      </FormGrid>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16}}>
        <Btn variant="outline" onClick={()=>setNotepadOpen(true)}><Icon name="note" size={15}/> Notepad Import</Btn>
        <Btn variant="gold" onClick={save}>Save MOM</Btn>
      </div>
    </Card>
  </div>;
}
export function AddMeetingPage(){
  const navigate=useNavigate();
  const cacheKey='pwm_add_meeting_draft';
  const [step,setStep]=useState(0);
  const [notepadOpen,setNotepadOpen]=useState(false);
  const [sourceItems,setSourceItems]=useState([]);
  const [projectItems,setProjectItems]=useState([]);
  const [employeeItems,setEmployeeItems]=useState([]);
  const [loadingSource,setLoadingSource]=useState(false);
  const [form,setForm]=useState({meeting_type:'job',job:'',freelance_source:'',manual_source_name:'',projects:[],title:'',date:today(),start_time:'',end_time:'',location:'',link:'',agenda:'',mom:'',conclusion:'',next_action:'',action_items:[],status:'scheduled',member_roles:[]});
  const isDirty = Boolean(form.title || form.agenda || form.mom || form.conclusion || form.next_action || form.projects.length || form.member_roles.length || form.action_items.length || form.job || form.freelance_source || form.manual_source_name);
  const saveDraftPayload=()=>({step,form});
  const safeBack=()=>{ if(!isDirty) navigate('/meetings'); else saveDraftAndLeave(cacheKey, saveDraftPayload(), navigate, '/meetings'); };
  useEffect(()=>{ if(step!==1 || !['job','freelancing'].includes(form.meeting_type)) return; setLoadingSource(true); api.list(form.meeting_type==='job'?endpoints.jobs:endpoints.sources).then(d=>setSourceItems(asList(d))).catch(e=>alert(getErrorMessage(e))).finally(()=>setLoadingSource(false)); },[step,form.meeting_type]);
  useEffect(()=>{ if(step!==2) return; const params=form.meeting_type==='job'?{source_type:'job',job:form.job}:form.meeting_type==='freelancing'?{source_type:'freelancing',freelance_source:form.freelance_source}:{source_type:'manual'}; if(['job','freelancing'].includes(form.meeting_type) && !(form.job||form.freelance_source)) return; setLoadingSource(true); api.list(endpoints.projects,params).then(d=>setProjectItems(asList(d))).catch(e=>alert(getErrorMessage(e))).finally(()=>setLoadingSource(false)); },[step,form.meeting_type,form.job,form.freelance_source]);
  useEffect(()=>{ if(step===4) api.list(endpoints.employees).then(d=>setEmployeeItems(asList(d))).catch(()=>{}); },[step]);
  const sources=sourceItems;
  const toggleProject=id=>setForm(f=>({...f,projects:f.projects.map(String).includes(String(id))?f.projects.filter(x=>String(x)!==String(id)):[...f.projects,id]}));
  const toggleMember=id=>setForm(f=>{const exists=f.member_roles.some(x=>String(x.member)===String(id)); return {...f,member_roles:exists?f.member_roles.filter(x=>String(x.member)!==String(id)):[...f.member_roles,{member:id,role:'attendee',attended:false}]};});
  const setMemberRole=(memberId,role)=>setForm(f=>({...f,member_roles:f.member_roles.map(x=>String(x.member)===String(memberId)?{...x,role}:x)}));
  const save=async()=>{await api.create(endpoints.meetings,form); clearCachedDraft(cacheKey); navigate('/meetings');};
  return <div>
    <MomNotepadModal open={notepadOpen} initialText={[form.mom, form.conclusion, form.next_action].filter(Boolean).join('\n\n')} onClose={()=>setNotepadOpen(false)} onParsed={p=>setForm(f=>mergeMomParsed(f,p))}/>
    <PageHeader title="Add Meeting" sub="Stepper flow like Tasks: type → source → project → form → members → MOM → review" action={<Btn variant="outline" onClick={safeBack}><Icon name="arrowLeft" size={15}/> Back</Btn>} />
    <CacheBanner cacheKey={cacheKey} onRestore={draft=>{ if(draft.form) setForm(draft.form); setStep(draft.step||0); }} onClear={()=>{ setForm({meeting_type:'job',job:'',freelance_source:'',manual_source_name:'',projects:[],title:'',date:today(),start_time:'',end_time:'',location:'',link:'',agenda:'',mom:'',conclusion:'',next_action:'',action_items:[],status:'scheduled',member_roles:[]}); setStep(0); }} />
    <Card>
      <WizardBar steps={['Type','Source','Projects','Details','Members','MOM','Review']} current={step} onStep={setStep} />
      {step===0 && <div><h2 style={{color:T.navy,fontSize:16,marginBottom:12}}>Select meeting type</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14}}>{[[ 'job','building','Job Meeting' ],[ 'freelancing','briefcase','Freelancing Meeting' ],[ 'general','note','General' ],[ 'manual','edit','Manual' ]].map(([v,icon,label])=><button key={v} onClick={()=>{setForm({...form,meeting_type:v,job:'',freelance_source:'',manual_source_name:'',projects:[]}); setStep(v==='general'?2:1);}} style={{padding:26,borderRadius:14,border:`2px solid ${form.meeting_type===v?T.gold:T.border}`,background:form.meeting_type===v?T.goldLight:T.white,cursor:'pointer'}}><div style={{color:T.navy,marginBottom:8}}><Icon name={icon} size={30}/></div><strong style={{color:T.navy}}>{label}</strong></button>)}</div></div>}
      {step===1 && (form.meeting_type==='manual' ? <div><Input label="Manual Source" value={form.manual_source_name} onChange={e=>setForm({...form,manual_source_name:e.target.value})}/><div style={{marginTop:16,display:'flex',gap:8}}><Btn variant="outline" onClick={()=>setStep(0)}>← Back</Btn><Btn variant="gold" onClick={()=>setStep(2)} disabled={!form.manual_source_name}>Next →</Btn></div></div> : <CardStep title={loadingSource?'Loading Source…':form.meeting_type==='job'?'Select Job':'Select Freelance Source'} items={sources} value={form.meeting_type==='job'?form.job:form.freelance_source} onSelect={id=>{setForm({...form,[form.meeting_type==='job'?'job':'freelance_source']:id,projects:[]});setStep(2);}} empty="Create source first from Management." back={()=>setStep(0)} />)}
      {step===2 && <CardStep title={loadingSource?'Loading Projects…':'Select Projects'} items={projectItems} value="" onSelect={toggleProject} empty="No project yet. You can skip." back={()=>setStep(form.meeting_type==='general'?0:1)} skip={()=>setStep(3)} />}
      {step===2 && form.projects.length>0 && <div style={{marginTop:12}}><MultiSelectBox label="Selected Projects" selected={form.projects} onToggle={toggleProject} items={projectItems}/><div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}><Btn variant="gold" onClick={()=>setStep(3)}>Next →</Btn></div></div>}
      {step===3 && <div><FormGrid><Input label="Title" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><Input label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><Input label="Start Time" type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/><Input label="End Time" type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/><Input label="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/><Input label="Link" value={form.link} onChange={e=>setForm({...form,link:e.target.value})}/><Textarea label="Agenda" value={form.agenda} onChange={e=>setForm({...form,agenda:e.target.value})}/></FormGrid><div style={{display:'flex',justifyContent:'space-between',marginTop:16}}><Btn variant="outline" onClick={()=>setStep(2)}>← Back</Btn><Btn variant="gold" onClick={()=>setStep(4)} disabled={!form.title}>Next →</Btn></div></div>}
      {step===4 && <div><MultiSelectBox label="Members" selected={form.member_roles.map(x=>x.member)} onToggle={toggleMember} items={employeeItems}/>{form.member_roles.length>0&&<div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>{form.member_roles.map(row=>{const member=employeeItems.find(x=>String(x.id)===String(row.member));return <div key={row.member} style={{display:'flex',alignItems:'center',gap:8,border:`1px solid ${T.border}`,borderRadius:20,padding:'5px 8px',fontSize:12}}><span>{member?.name||row.member}</span><select value={row.role} onChange={e=>setMemberRole(row.member,e.target.value)} style={{border:'none',background:T.cream,fontSize:12}}><option value="host">Host</option><option value="attendee">Attendee</option><option value="client">Client</option><option value="optional">Optional</option></select></div>})}</div>}<div style={{display:'flex',justifyContent:'space-between',marginTop:16}}><Btn variant="outline" onClick={()=>setStep(3)}>← Back</Btn><Btn variant="gold" onClick={()=>setStep(5)}>Next →</Btn></div></div>}
      {step===5 && <div><div style={{display:'flex',justifyContent:'flex-end',marginBottom:10}}><Btn variant="outline" onClick={()=>setNotepadOpen(true)}><Icon name="note" size={15}/> Notepad Import</Btn></div><FormGrid><Textarea label="MOM / Discussion Notes" value={form.mom} onChange={e=>setForm({...form,mom:e.target.value})} onBlur={() => setForm(f => ({...f, mom: normalizeMomNumbering(f.mom)}))} rows={5}/><Textarea label="Conclusion" value={form.conclusion} onChange={e=>setForm({...form,conclusion:e.target.value})} rows={3}/><Textarea label="Next Actions" value={form.next_action} onChange={e=>setForm(f=>{ const parsed=parseActionItems(e.target.value); const oldItems=f.action_items||[]; return {...f,next_action:e.target.value,action_items:parsed.map(p=>({...p,done:Boolean(oldItems.find(o=>o.text===p.text)?.done) || Boolean(p.done)}))}; })} rows={3}/><ActionPointEditor items={form.action_items} onChange={items=>setForm({...form,action_items:items})}/></FormGrid><div style={{display:'flex',justifyContent:'space-between',marginTop:16}}><Btn variant="outline" onClick={()=>setStep(4)}>← Back</Btn><Btn variant="gold" onClick={()=>setStep(6)}>Review →</Btn></div></div>}
      {step===6 && <div><SectionTitle>Review</SectionTitle><pre style={{whiteSpace:'pre-wrap',fontSize:12,color:T.slate,background:T.cream,padding:12,borderRadius:8}}>{JSON.stringify({type:form.meeting_type,title:form.title,date:form.date,projects:form.projects.length,members:form.member_roles.length,action_points:form.action_items.length},null,2)}</pre><div style={{display:'flex',justifyContent:'space-between',marginTop:16}}><Btn variant="outline" onClick={()=>setStep(5)}>← Edit</Btn><Btn variant="gold" onClick={save}>Save Meeting</Btn></div></div>}
    </Card>
  </div>;
}

function ListShell({ title, sub, add, onAdd, error, loading, empty, children }) { return <div><PageHeader title={title} sub={sub} action={add&&<Btn variant="gold" onClick={onAdd}>{add}</Btn>}/>{error&&<Notice type="error">{error}</Notice>}{loading?<LoadingCard/>:children?.props?.children?.props?.children?.length===0?<EmptyState title={empty} sub="Create your first record."/>:children}</div>; }
function WizardForm({ title, back, save, children, dirty=false }) { const navigate=useNavigate(); const [saving,setSaving]=useState(false); const [error,setError]=useState(''); useUnsavedPrompt(Boolean(dirty)); const leave=()=>{ if(confirmUnsaved(Boolean(dirty))) navigate(back); }; const submit=async()=>{setSaving(true);setError('');try{await save();}catch(err){setError(getErrorMessage(err));}finally{setSaving(false);}}; return <div><PageHeader title={title} action={<Btn variant="outline" onClick={leave}>← Back</Btn>}/>{error&&<Notice type="error">{error}</Notice>}<Card>{children}<div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}><Btn variant="outline" onClick={leave}>Cancel</Btn><Btn variant="gold" onClick={submit} disabled={saving}>{saving?'Saving…':'Save'}</Btn></div></Card></div>; }


/* Notes */
const noteTypeOptions = [[ 'plain','Plain Big Page' ],[ 'points','Point Wise Plan' ],[ 'table','Table' ],[ 'checklist','Checklist' ],[ 'custom','Custom JSON' ]];
const noteStatusOptions = [[ 'will_start','Will Start' ],[ 'started','Started' ],[ 'partial_done','Partial Done' ],[ 'almost_done','Almost Done' ],[ 'completed','Completed' ],[ 'cancelled','Cancelled' ]];
const emptyNoteData = (type) => type === 'table' ? { columns:['Name','Status','Date'], rows:[['', 'started', today()]] } : type === 'plain' ? { content:'' } : type === 'custom' ? {} : [{ name:'', status:'started', date:today() }];
const normalizeNoteData = (type, data) => {
  if(type === 'plain') return typeof data === 'string' ? { content:data } : (data && typeof data === 'object' && !Array.isArray(data) ? data : { content:'' });
  if(type === 'table') return data && typeof data === 'object' && !Array.isArray(data) ? { columns: data.columns || [], rows: data.rows || [] } : emptyNoteData('table');
  if(type === 'points' || type === 'checklist') return Array.isArray(data) ? data : [];
  return data || {};
};

function SourceFields({ form, setForm, boot }) {
  const freelanceProjects = (boot.projects || []).filter(p => p.source_type === 'freelancing' && (!form.freelance_source || String(p.freelance_source) === String(form.freelance_source)));
  const jobProjects = (boot.projects || []).filter(p => p.source_type === 'job' && (!form.job || String(p.job) === String(form.job)));
  const projectItems = form.freelance_source ? freelanceProjects : form.job ? jobProjects : boot.projects;
  return <>
    <RelationSelect label="Job" value={form.job} onChange={v=>setForm({...form,job:v,freelance_source:'',project:''})} items={boot.jobs || []} labelKey="company_name" blank="— Optional Job —" />
    <RelationSelect label="Freelance Source" value={form.freelance_source} onChange={v=>setForm({...form,freelance_source:v,job:'',project:''})} items={boot.sources || []} blank="— Optional Freelance Source —" />
    <RelationSelect label="Project" value={form.project} onChange={v=>setForm({...form,project:v})} items={projectItems || []} blank="— Optional Project —" />
  </>;
}

function TableNoteEditor({ value, onChange }) {
  const table = normalizeNoteData('table', value);
  const cols = table.columns?.length ? table.columns : ['Name','Status','Date'];
  const rows = table.rows || [];
  const [columnText, setColumnText] = useState(cols.join(', '));

  useEffect(() => {
    setColumnText(cols.join(', '));
  }, [cols.join('||')]);

  const applyColumns = (text = columnText) => {
    const nextCols = text.split(',').map(x => x.trim()).filter(Boolean);
    const safeCols = nextCols.length ? nextCols : ['Name'];
    const nextRows = rows.map(row => safeCols.map((_, ci) => row?.[ci] || ''));
    onChange({ ...table, columns: safeCols, rows: nextRows });
    setColumnText(safeCols.join(', '));
  };

  const updateCell = (r,c,val) => onChange({ ...table, columns: cols, rows: rows.map((row,idx)=>idx===r ? cols.map((_,ci)=>ci===c?val:(row?.[ci]||'')) : row) });
  const addRow = () => onChange({ ...table, columns: cols, rows: [...rows, cols.map(()=> '')] });
  const removeRow = (idx) => onChange({ ...table, columns: cols, rows: rows.filter((_,i)=>i!==idx) });

  return <div style={{gridColumn:'1 / -1'}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end'}}>
      <Input label="Table Columns comma separated" value={columnText} onChange={e=>setColumnText(e.target.value)} onBlur={()=>applyColumns()} placeholder="Task, Status, Date" />
      <Btn variant="outline" onClick={()=>applyColumns()} style={{height:38}}>Apply Columns</Btn>
    </div>
    <div style={{fontSize:11,color:T.slateLight,marginTop:6}}>Type columns with comma, then click Apply Columns or leave the field.</div>
    <div style={{overflowX:'auto',marginTop:12,border:`1px solid ${T.border}`,borderRadius:10}}>
      <table style={{width:'100%',borderCollapse:'collapse',minWidth:720}}>
        <thead><tr>{cols.map((c,idx)=><Th key={`${c}-${idx}`}>{c}</Th>)}<Th>Action</Th></tr></thead>
        <tbody>{rows.map((row,ri)=><tr key={ri}>{cols.map((c,ci)=><Td key={ci} alt={ri%2}><input value={row?.[ci] || ''} onChange={e=>updateCell(ri,ci,e.target.value)} style={{width:'100%',border:`1px solid ${T.border}`,borderRadius:6,padding:'7px 8px',fontSize:12}} /></Td>)}<Td alt={ri%2}><Btn variant="danger" onClick={()=>removeRow(ri)} style={{padding:'5px 10px',fontSize:11}}>Remove</Btn></Td></tr>)}</tbody>
      </table>
    </div>
    <Btn variant="outline" onClick={addRow} style={{marginTop:10}}>＋ Add Table Row</Btn>
  </div>;
}

function NoteDataEditor({ type, value, onChange }) {
  const data = normalizeNoteData(type, value);
  if(type === 'plain') return <div style={{gridColumn:'1 / -1'}}><Textarea label="Plain Note / Big Page" rows={14} value={data.content || ''} onChange={e=>onChange({ ...data, content:e.target.value })} placeholder="Write your full note here..." /></div>;
  if(type === 'points' || type === 'checklist') {
    const rows = Array.isArray(data) ? data : [];
    const update = (idx, patch) => onChange(rows.map((r,i)=>i===idx?{...r,...patch}:r));
    const add = () => onChange([...rows, { name:'', status:'started', date:today(), ...(type==='checklist'?{done:false}:{}) }]);
    const remove = (idx) => onChange(rows.filter((_,i)=>i!==idx));
    return <div style={{gridColumn:'1 / -1'}}>
      <SectionTitle>{type === 'checklist' ? 'Checklist Items' : 'Point Wise Plan'}</SectionTitle>
      <div style={{display:'grid',gap:10}}>{rows.map((row,idx)=><div key={idx} style={{display:'grid',gridTemplateColumns:type==='checklist'?'42px minmax(0,1.5fr) 170px 150px 42px':'minmax(0,1.5fr) 170px 150px 42px',gap:8,alignItems:'end',border:`1px solid ${T.border}`,background:T.cream,borderRadius:10,padding:10}}>
        {type==='checklist' && <label style={{display:'flex',alignItems:'center',justifyContent:'center',height:36}}><input type="checkbox" checked={Boolean(row.done)} onChange={e=>update(idx,{done:e.target.checked,status:e.target.checked?'completed':row.status})}/></label>}
        <Input label="Name / Point" value={row.name || ''} onChange={e=>update(idx,{name:e.target.value})}/>
        <Select label="Status" value={row.status || 'started'} onChange={e=>update(idx,{status:e.target.value})} options={noteStatusOptions}/>
        <Input label="Date" type="date" value={row.date || ''} onChange={e=>update(idx,{date:e.target.value})}/>
        <Btn variant="danger" onClick={()=>remove(idx)} style={{padding:'8px 10px'}}>×</Btn>
      </div>)}</div>
      <Btn variant="outline" onClick={add} style={{marginTop:10}}>＋ Add {type === 'checklist' ? 'Checklist Item' : 'Point'}</Btn>
    </div>;
  }
  if(type === 'table') return <TableNoteEditor value={data} onChange={onChange} />;
  return <div style={{gridColumn:'1 / -1'}}><Textarea label="Custom JSON / Raw Data" rows={10} value={typeof data?.raw === 'string' ? data.raw : JSON.stringify(data || {}, null, 2)} onChange={e=>onChange({ raw:e.target.value })}/></div>;
}

function NoteDataView({ type, data, onToggle, canEdit = false }) {
  const normalized = normalizeNoteData(type, data);
  if(type === 'plain') return <div style={{whiteSpace:'pre-wrap',lineHeight:1.7,fontSize:14,color:T.slate}}>{normalized.content || '—'}</div>;
  if(type === 'points' || type === 'checklist') return <div style={{display:'grid',gap:10}}>{(normalized || []).map((row,idx)=><div key={idx} style={{display:'flex',gap:10,alignItems:'flex-start',border:`1px solid ${T.border}`,background:idx%2?T.rowAlt:T.white,borderRadius:10,padding:12}}>
    {type === 'checklist' ? <input aria-label={`Toggle ${row.name || `item ${idx + 1}`}`} type="checkbox" checked={Boolean(row.done)} disabled={!canEdit} onChange={e=>onToggle?.(idx,e.target.checked)} style={{width:20,height:20,marginTop:2,cursor:canEdit?'pointer':'not-allowed',accentColor:T.success}}/> : <span style={{width:26,height:26,borderRadius:'50%',background:row.status==='completed'?T.successBg:T.goldLight,color:row.status==='completed'?T.success:T.goldDark,display:'inline-flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12}}>{idx+1}</span>}
    <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,color:T.navy,textDecoration:row.done?'line-through':'none'}}>{row.name || `Item ${idx+1}`}</div><div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}><StatusBadge status={row.status || 'started'} />{row.date && <Badge label={row.date} color="slate" />}</div></div>
  </div>)}</div>;
  if(type === 'table') {
    const cols = normalized.columns || [];
    const rows = normalized.rows || [];
    return <TableWrapper><thead><tr>{cols.map(c=><Th key={c}>{c}</Th>)}</tr></thead><tbody>{rows.map((row,ri)=><tr key={ri}>{cols.map((c,ci)=><Td key={ci} alt={ri%2}>{row?.[ci] || '—'}</Td>)}</tr>)}</tbody></TableWrapper>;
  }
  return <pre style={{whiteSpace:'pre-wrap',fontSize:12,color:T.slate,background:T.cream,border:`1px solid ${T.border}`,borderRadius:10,padding:12}}>{JSON.stringify(normalized, null, 2)}</pre>;
}

function notePreviewText(note) {
  const data = normalizeNoteData(note.data_type, note.data);
  if(note.data_type === 'plain') return String(data.content || '').slice(0, 120) || note.description || '—';
  if(note.data_type === 'table') return `${data.columns?.length || 0} columns · ${data.rows?.length || 0} rows`;
  if(Array.isArray(data)) return `${data.length} items`;
  return note.description || 'Custom JSON data';
}

function noteClipboardText(note) {
  const data = normalizeNoteData(note.data_type, note.data);
  const lines = [note.label, note.description].filter(Boolean);
  if (note.data_type === 'plain') lines.push(data.content || '');
  else if (note.data_type === 'table') {
    const columns = data.columns || [];
    lines.push(columns.join('\t'));
    (data.rows || []).forEach(row => lines.push((row || []).join('\t')));
  } else if (Array.isArray(data)) {
    data.forEach((row, index) => lines.push(`${index + 1}. ${row.done ? '[Done]' : '[ ]'} ${row.name || ''}${row.date ? ` (${row.date})` : ''}`));
  } else lines.push(JSON.stringify(data, null, 2));
  return lines.filter(Boolean).join('\n\n');
}

async function copyNoteToClipboard(note) {
  const text = noteClipboardText(note);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function NoteFolderTile({ folder, active, onClick, onDrop, standalone = false }) {
  const [over, setOver] = useState(false);
  return <button type="button" onClick={onClick} onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)} onDrop={e=>{e.preventDefault();setOver(false);onDrop?.(e.dataTransfer.getData('text/note-id'));}} style={{textAlign:'left',border:`1px solid ${over||active?T.gold:T.border}`,background:over||active?T.goldLight:T.white,borderRadius:12,padding:12,cursor:'pointer',minHeight:92,display:'flex',alignItems:'center',gap:12,boxShadow:over?'0 10px 24px rgba(201,168,76,.2)':'none'}}>
    <div style={{width:44,height:44,borderRadius:10,background:T.navyTint,color:T.navy,display:'inline-flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>{folder?.icon_url?<img src={resolveAssetUrl(folder.icon_url)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<Icon name={standalone?'note':'folder'} size={22}/>}</div>
    <div style={{minWidth:0}}><div style={{fontWeight:800,color:T.navy,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{standalone?'Standalone Notes':folder?.name}</div><div style={{fontSize:11,color:T.slateLight,marginTop:4}}>{standalone?'Notes without a folder':`${folder?.notes_count || 0} notes`}</div></div>
  </button>;
}

export function NoteListPage(){
  const navigate=useNavigate();
  const mobile=useIsMobile();
  const boot=useBootstrap();
  const [filter,setFilter]=useState('all');
  const [folder,setFolder]=useState('all');
  const [message,setMessage]=useState('');
  const [folderModal,setFolderModal]=useState(false);
  const [folderForm,setFolderForm]=useState({name:'',description:'',parent:'',icon_image:null});
  const params = {
    ...(filter==='all'?{}:filter==='shared'?{shared:true}:filter==='personal'?{owned:true}:noteStatusOptions.some(([v])=>v===filter)?{status:filter}:{data_type:filter}),
    ...(folder==='all'?{}:folder==='standalone'?{standalone:true}:{folder}),
  };
  const {items,loading,error,reload}=useApiList(endpoints.notes,params,[filter,folder]);
  const folders=boot.noteFolders || [];
  const remove=async(id)=>{if(!confirm('Delete note?'))return;await api.remove(`${endpoints.notes}${id}/`);reload();boot.reloadBootstrap();};
  const move=async(noteId,targetFolder)=>{if(!noteId)return;await api.create(`${endpoints.notes}${noteId}/move/`,{folder:targetFolder==='standalone'?null:targetFolder});setMessage('Note moved successfully.');reload();boot.reloadBootstrap();};
const saveFolder = async () => {
  try {
    const fd = new FormData();

    fd.append("name", folderForm.name.trim());
    fd.append("is_active", "true");

    if (folderForm.description?.trim()) {
      fd.append("description", folderForm.description.trim());
    }

    if (folderForm.parent) {
      fd.append("parent", folderForm.parent);
    }

    if (folderForm.icon_image instanceof File) {
      fd.append("icon_image", folderForm.icon_image);
    }

    await api.upload(endpoints.noteFolders, fd);

    setFolderModal(false);

    setFolderForm({
      name: "",
      description: "",
      parent: "",
      icon_image: null,
    });

    await boot.reloadBootstrap();
  } catch (error) {
    console.error("Unable to create note folder:", error);
  }
};
const copy=async(note)=>{await copyNoteToClipboard(note);setMessage('Note copied to clipboard.');};
  return <div><PageHeader title="Notes" sub="Create standalone notes or organize them into folders. Drag owned notes between folders." action={<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Btn variant="outline" onClick={()=>setFolderModal(true)}><Icon name="folder" size={15}/> Add Folder</Btn><Btn variant="gold" onClick={()=>navigate('/notes/new')}><Icon name="plus" size={15}/> Add Note</Btn></div>}/>
    {message&&<Notice type="success">{message}</Notice>}
    <Card style={{marginBottom:14}}><SectionTitle>Note Folders</SectionTitle><div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'repeat(auto-fill,minmax(210px,1fr))',gap:10}}><NoteFolderTile standalone active={folder==='standalone'} onClick={()=>setFolder('standalone')} onDrop={id=>move(id,'standalone')}/>{folders.map(f=><NoteFolderTile key={f.id} folder={f} active={String(folder)===String(f.id)} onClick={()=>setFolder(String(f.id))} onDrop={id=>move(id,f.id)}/>)}</div><button type="button" onClick={()=>setFolder('all')} style={{marginTop:10,border:0,background:'transparent',color:T.goldDark,fontSize:12,fontWeight:700,cursor:'pointer'}}>Show notes from all folders</button></Card>
    <FilterChips active={filter} onChange={setFilter} options={[[ 'all','All' ],[ 'personal','Owned by Me' ],[ 'shared','Shared with Me' ],[ 'plain','Plain' ],[ 'points','Points' ],[ 'table','Table' ],[ 'checklist','Checklist' ],[ 'started','Started' ],[ 'partial_done','Partial' ],[ 'completed','Completed' ]]}/>
    {error&&<Notice type="error">{error}</Notice>}
    {loading?<LoadingCard/>:!items.length?<EmptyState icon={<Icon name="note" size={38}/>} title="No notes found" sub="Create a note or select another folder." action={<Btn variant="gold" onClick={()=>navigate('/notes/new')}><Icon name="plus" size={15}/> Add Note</Btn>}/>:<div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'repeat(auto-fill,minmax(290px,1fr))',gap:14}}>{items.map(note=><Card key={note.id} draggable={Boolean(note.is_owner)} onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/note-id',String(note.id));}} style={{cursor:note.is_owner?'grab':'default',display:'flex',flexDirection:'column',gap:10}}><div onClick={()=>navigate(`/notes/${note.id}`)} style={{flex:1,cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}}><div style={{minWidth:0}}><h3 style={{fontSize:15,color:T.navy,marginBottom:5,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{note.label}</h3><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><Badge label={nice(note.data_type)} color="info"/><StatusBadge status={note.status}/>{note.visibility==='shared'&&<Badge label="Shared" color="gold"/>}</div></div>{note.is_owner&&<Icon name="grip" size={18} style={{color:T.slateLight}}/>}</div><p style={{fontSize:12,color:T.slateLight,lineHeight:1.5,marginTop:12}}>{notePreviewText(note)}</p><div style={{fontSize:11,color:T.slateLight,marginTop:10}}>{note.folder_name || 'Standalone'} · {note.job_name || note.freelance_source_name || note.project_name || 'General Note'}</div></div><div style={{display:'flex',justifyContent:'flex-end',gap:6,borderTop:`1px solid ${T.border}`,paddingTop:10,flexWrap:'wrap'}}>{note.is_owner&&<select aria-label="Move note to folder" value={note.folder?String(note.folder):'standalone'} onClick={e=>e.stopPropagation()} onChange={e=>move(note.id,e.target.value)} style={{minWidth:mobile?'100%':150,padding:'6px 9px',border:`1px solid ${T.border}`,borderRadius:7,background:T.white,color:T.navy,fontSize:11,cursor:'pointer'}}><option value="standalone">Standalone</option>{folders.map(f=><option key={f.id} value={String(f.id)}>{f.name}</option>)}</select>}<Btn variant="outline" onClick={()=>copy(note)} style={{fontSize:11,padding:'5px 9px'}}><Icon name="copy" size={14}/> Copy</Btn>{note.can_edit&&<Btn variant="outline" onClick={()=>navigate(`/notes/${note.id}/edit`)} style={{fontSize:11,padding:'5px 9px'}}><Icon name="edit" size={14}/> Edit</Btn>}{note.is_owner&&<Btn variant="danger" onClick={()=>remove(note.id)} style={{fontSize:11,padding:'5px 9px'}}><Icon name="trash" size={14}/> Delete</Btn>}</div></Card>)}</div>}
    <Modal open={folderModal} onClose={()=>setFolderModal(false)} title="Create Note Folder" subtitle="Folders are optional; standalone notes remain supported."><div style={{display:'grid',gap:12}}><Input label="Folder Name" required value={folderForm.name} onChange={e=>setFolderForm({...folderForm,name:e.target.value})}/><Select label="Parent Folder" value={folderForm.parent} onChange={e=>setFolderForm({...folderForm,parent:e.target.value})} options={[[ '', 'No Parent' ],...folders.map(f=>[String(f.id),f.name])]}/><Textarea label="Description" value={folderForm.description} onChange={e=>setFolderForm({...folderForm,description:e.target.value})}/><Input label="Folder Icon Image" type="file" onChange={e=>setFolderForm({...folderForm,icon_image:e.target.files?.[0]||null})}/><div style={{display:'flex',justifyContent:'flex-end',gap:8}}><Btn variant="outline" onClick={()=>setFolderModal(false)}>Cancel</Btn><Btn variant="gold" onClick={saveFolder} disabled={!folderForm.name.trim()}><Icon name="check" size={15}/> Create Folder</Btn></div></div></Modal>
  </div>;
}

export function NoteDetailPage(){
  const {id}=useParams();const navigate=useNavigate();const mobile=useIsMobile();const {item,loading,error,reload}=useApiDetail(`${endpoints.notes}${id}/`,[id]);const [message,setMessage]=useState('');
  const remove=async()=>{if(!confirm('Delete note?'))return;await api.remove(`${endpoints.notes}${id}/`);navigate('/notes');};
  const setStatus=async(status)=>{await api.update(`${endpoints.notes}${id}/`,{status});reload();};
  const toggle=async(index,done)=>{await api.create(`${endpoints.notes}${id}/checklist-items/${index}/toggle/`,{done});setMessage(done?'Checklist item marked done.':'Checklist item marked not done.');reload();};
  const copy=async()=>{await copyNoteToClipboard(item);setMessage('Note copied to clipboard.');};
  if(loading)return <LoadingCard/>;if(error)return <Notice type="error">{error}</Notice>;if(!item)return null;
  return <div><Breadcrumb items={['Dashboard','Notes',item.label]}/><PageHeader title={item.label} sub={item.description || 'Note detail'} action={<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Btn variant="outline" onClick={()=>navigate('/notes')}><Icon name="arrowLeft" size={15}/> Back</Btn><Btn variant="outline" onClick={copy}><Icon name="copy" size={15}/> Copy</Btn>{item.can_edit&&<Btn variant="outline" onClick={()=>navigate(`/notes/${id}/edit`)}><Icon name="edit" size={15}/> Edit</Btn>}{item.is_owner&&<Btn variant="danger" onClick={remove}><Icon name="trash" size={15}/> Delete</Btn>}</div>}/>
    {message&&<Notice type="success">{message}</Notice>}
    <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'minmax(0,1fr) 280px',gap:18}}><Card><div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}><Badge label={nice(item.data_type)} color="info"/><StatusBadge status={item.status}/><Badge label={item.visibility==='shared'?'Shared':'Personal'} color={item.visibility==='shared'?'gold':'slate'}/></div><NoteDataView type={item.data_type} data={item.data} canEdit={item.can_edit} onToggle={toggle}/></Card><Card><SectionTitle>Info</SectionTitle>{[['Folder',item.folder_name||'Standalone'],['Job',item.job_name],['Freelance Source',item.freelance_source_name],['Project',item.project_name],['Shared With',(item.shared_users||[]).map(x=>x.display_name).join(', ')||'Only me'],['Created',item.created_at],['Updated',item.updated_at]].map(([l,v])=><div key={l} style={{padding:'9px 0',borderBottom:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.slateLight,fontWeight:800,textTransform:'uppercase'}}>{l}</div><div style={{fontSize:13,color:T.navy,fontWeight:600,marginTop:3,wordBreak:'break-word'}}>{v||'—'}</div></div>)}{item.can_edit&&<><SectionTitle style={{marginTop:14}}>Change Status</SectionTitle><Select value={item.status} onChange={e=>setStatus(e.target.value)} options={noteStatusOptions}/></>}</Card></div>
  </div>;
}

export function NoteFormPage(){
  const {id}=useParams();const edit=Boolean(id);const navigate=useNavigate();const boot=useBootstrap();
  const [form,setForm]=useState({label:'',description:'',folder:'',visibility:'personal',shared_with:[],share_permission:'edit',job:'',freelance_source:'',project:'',members:[],data_type:'plain',data:emptyNoteData('plain'),status:'will_start',is_active:true});
  const [loading,setLoading]=useState(edit);const [error,setError]=useState('');
  useEffect(()=>{if(!edit)return;setLoading(true);api.get(`${endpoints.notes}${id}/`).then(item=>setForm({...item,folder:item.folder||'',job:item.job||'',freelance_source:item.freelance_source||'',project:item.project||'',members:item.members||[],shared_with:(item.shared_users||[]).map(x=>x.id),share_permission:item.shared_users?.[0]?.permission||'edit',data:normalizeNoteData(item.data_type,item.data)})).catch(e=>setError(getErrorMessage(e))).finally(()=>setLoading(false));},[id,edit]);
  const toggleMember=memberId=>setForm(f=>({...f,members:f.members.map(String).includes(String(memberId))?f.members.filter(x=>String(x)!==String(memberId)):[...f.members,memberId]}));
  const toggleShare=userId=>setForm(f=>({...f,shared_with:f.shared_with.map(String).includes(String(userId))?f.shared_with.filter(x=>String(x)!==String(userId)):[...f.shared_with,userId]}));
  const setType=type=>setForm(f=>({...f,data_type:type,data:emptyNoteData(type)}));
  const ownerControlled=!edit || form.is_owner!==false;
  const save=async()=>{try{const contentPayload={label:form.label,description:form.description,data_type:form.data_type,data:form.data,status:form.status};const payload=ownerControlled?{...contentPayload,folder:form.folder||null,visibility:form.shared_with.length?'shared':'personal',shared_with:form.shared_with,share_permission:form.share_permission,job:form.job||null,freelance_source:form.freelance_source||null,project:form.project||null,members:form.members||[],is_active:form.is_active===true||form.is_active==='true'}:contentPayload;if(edit)await api.update(`${endpoints.notes}${id}/`,payload);else await api.create(endpoints.notes,payload);navigate('/notes');}catch(e){setError(getErrorMessage(e));}};
  if(loading)return <LoadingCard/>;
  return <WizardForm title={edit?'Edit Note':'Add Note'} back={edit?`/notes/${id}`:'/notes'} save={save} dirty={Boolean(form.label||form.description)}>{error&&<Notice type="error">{error}</Notice>}{!ownerControlled&&<Notice type="info">You can edit this shared note's content, checklist and status. Folder, source and sharing settings remain controlled by the owner.</Notice>}<FormGrid>
    <Input label="Label" required value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/>{ownerControlled&&<RelationSelect label="Folder / Bunch" value={form.folder} onChange={v=>setForm({...form,folder:v})} items={boot.noteFolders||[]} blank="Standalone Note"/>}
    <Select label="Data Type" value={form.data_type} onChange={e=>setType(e.target.value)} options={noteTypeOptions}/><Select label="Status" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={noteStatusOptions}/>
    {ownerControlled&&<><Select label="Active" value={String(form.is_active)} onChange={e=>setForm({...form,is_active:e.target.value==='true'})} options={[[ 'true','Active' ],[ 'false','Inactive' ]]}/><Select label="Shared User Permission" value={form.share_permission} onChange={e=>setForm({...form,share_permission:e.target.value})} options={[[ 'edit','Can Edit' ],[ 'view','View Only' ]]}/></>}
    <Textarea label="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>{ownerControlled&&<SourceFields form={form} setForm={setForm} boot={boot}/>} 
    {ownerControlled&&<div style={{gridColumn:'1 / -1'}}><MultiSelectBox label="Related Members" selected={form.members} onToggle={toggleMember} items={boot.employees||[]}/></div>}
    {ownerControlled&&<div style={{gridColumn:'1 / -1'}}><MultiSelectBox label="Share with Accepted / Invited Users" selected={form.shared_with} onToggle={toggleShare} items={boot.noteShareableUsers||[]} labelKey="display_name"/><div style={{fontSize:11,color:T.slateLight,marginTop:6}}>Only users with an accepted invitation are available. Leave empty to keep this note personal.</div></div>}
    <NoteDataEditor type={form.data_type} value={form.data} onChange={data=>setForm({...form,data})}/>
  </FormGrid></WizardForm>;
}

/* Documents */
const getDocumentUrl = (doc) => resolveAssetUrl(doc?.document_file || doc?.document_url || doc?.external_url);
const allDocumentFiles = (doc) => {
  const rows = [];
  const legacy = getDocumentUrl(doc);
  if (legacy && (doc?.document_file || doc?.document_path)) rows.push({ id: 'legacy', name: String(doc.document_path || doc.name || 'Primary file').split('/').pop(), url: legacy, legacy: true });
  (doc?.files || []).forEach(file => rows.push({ id: file.id, name: file.original_name || String(file.file || '').split('/').pop(), url: resolveAssetUrl(file.file_url || file.file) }));
  if (!rows.length && doc?.external_url) rows.push({ id: 'external', name: 'External Link', url: resolveAssetUrl(doc.external_url), external: true });
  return rows;
};

function DownloadButton({ url, label='Download', style={}, download=true }) {
  const finalUrl=resolveAssetUrl(url);if(!finalUrl)return <Btn variant="outline" disabled style={style}>No File</Btn>;
  return <a href={finalUrl} {...(download?{download:true}:{})} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{display:'inline-flex'}}><Btn variant="outline" style={style}><Icon name="download" size={14}/> {label}</Btn></a>;
}

export function DocumentListPage(){
  const navigate=useNavigate();const boot=useBootstrap();const mobile=useIsMobile();const [searchParams,setSearchParams]=useSearchParams();
  const listOpen=searchParams.get('view')==='list';const category=searchParams.get('category')||'';const standalone=searchParams.get('standalone')==='true';
  const [documents,setDocuments]=useState([]);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const categories=boot.documentCategories||[];const categoryLabel=cat=>cat?.parent_name?`${cat.parent_name} / ${cat.name}`:cat?.name||'Uncategorized';const selectedCategory=categories.find(c=>String(c.id)===String(category));
  const loadDocuments=async(categoryId='',isStandalone=false)=>{setLoading(true);setError('');try{setDocuments(asList(await api.list(endpoints.documents,isStandalone?{standalone:'true'}:(categoryId?{category:categoryId}:{}))));}catch(err){setError(getErrorMessage(err));setDocuments([]);}finally{setLoading(false);}};
  useEffect(()=>{if(listOpen)loadDocuments(category,standalone);},[listOpen,category,standalone]);
  const openList=categoryId=>setSearchParams({view:'list',...(categoryId?{category:String(categoryId)}:{})});const openStandalone=()=>setSearchParams({view:'list',standalone:'true'});const backToFolders=()=>setSearchParams({});
  const remove=async id=>{if(!confirm('Delete document?'))return;await api.remove(`${endpoints.documents}${id}/`);loadDocuments(category,standalone);};
  const detailUrl=doc=>`/documents/${doc.id}?from=list${standalone?'&standalone=true':(category?`&category=${category}`:'')}`;
  const folderCard=(key,label,sub,onClick,iconUrl)=><button key={key} type="button" onClick={onClick} style={{textAlign:'left',border:`1px solid ${T.border}`,background:T.white,borderRadius:12,padding:14,cursor:'pointer',minHeight:96,display:'flex',alignItems:'center',gap:12}}><div style={{width:48,height:48,borderRadius:10,background:T.navyTint,color:T.navy,display:'inline-flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>{iconUrl?<img src={resolveAssetUrl(iconUrl)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<Icon name="folder" size={24}/>}</div><div><strong style={{color:T.navy,fontSize:14,lineHeight:1.25}}>{label}</strong><div style={{fontSize:12,color:T.slateLight,marginTop:5}}>{sub}</div></div></button>;
  if(!listOpen)return <div><PageHeader title="Documents" sub="Choose a category folder or open all documents." action={<Btn variant="gold" onClick={()=>navigate('/documents/new')}><Icon name="plus" size={15}/> Add Document</Btn>}/><Card><SectionTitle>Document Folders</SectionTitle><div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'repeat(auto-fill,minmax(230px,1fr))',gap:12}}>{folderCard('all','All Documents','View every document',()=>openList(''))}{folderCard('standalone','Standalone','Documents without a category',openStandalone)}{categories.map(cat=>folderCard(cat.id,categoryLabel(cat),cat.parent_name?'Sub-folder':'Category folder',()=>openList(cat.id),cat.icon_url))}</div></Card></div>;
  return <div><PageHeader title={standalone?'Standalone Documents':(category?categoryLabel(selectedCategory):'All Documents')} sub={standalone?'Documents saved without a category':(category?'Documents in the selected category':'Showing all documents')} action={<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Btn variant="outline" onClick={backToFolders}><Icon name="arrowLeft" size={15}/> Folders</Btn><Btn variant="gold" onClick={()=>navigate(`/documents/new?${standalone?'returnStandalone=true':`returnCategory=${category}`}`)}><Icon name="plus" size={15}/> Add Document</Btn></div>}/>
    <Card style={{marginBottom:16}}><div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'minmax(260px,380px) auto',gap:12,alignItems:'end'}}><Select label="Filter by Category" value={category} onChange={e=>openList(e.target.value)} options={[[ '', 'All Documents' ],...categories.map(cat=>[String(cat.id),categoryLabel(cat)])]}/><div style={{fontSize:12,color:T.slateLight,paddingBottom:9}}>{loading?'Loading documents...':`${documents.length} document${documents.length===1?'':'s'} found`}</div></div></Card>
    {error&&<Notice type="error">{error}</Notice>}{loading?<LoadingCard/>:!documents.length?<EmptyState icon={<Icon name="files" size={38}/>} title="No documents found" sub={category?'This folder has no documents yet.':'No documents available.'} action={<Btn variant="gold" onClick={()=>navigate(`/documents/new?${standalone?'returnStandalone=true':`returnCategory=${category}`}`)}><Icon name="plus" size={15}/> Add Document</Btn>}/>:<div style={{overflowX:'auto'}}><TableWrapper><thead><tr><Th>Name</Th><Th>Category</Th><Th>Source</Th><Th>Files</Th><Th>Status</Th><Th>Actions</Th></tr></thead><tbody>{documents.map((doc,i)=><tr key={doc.id} onClick={()=>navigate(detailUrl(doc))} style={{cursor:'pointer'}}><Td alt={i%2}><strong style={{color:T.navy}}>{doc.name||'Document'}</strong><br/><span style={{fontSize:11,color:T.slateLight}}>{doc.description||'—'}</span></Td><Td alt={i%2}>{doc.category_name||'—'}</Td><Td alt={i%2}>{doc.job_name||doc.freelance_source_name||doc.project_name||'General'}</Td><Td alt={i%2}>{allDocumentFiles(doc).length}</Td><Td alt={i%2}><Badge label={boolText(doc.is_active)} color={doc.is_active===false?'slate':'success'}/></Td><Td alt={i%2}><ActionCell onView={()=>navigate(detailUrl(doc))} onEdit={()=>navigate(`/documents/${doc.id}/edit?from=list${standalone?'&standalone=true':(category?`&category=${category}`:'')}`)} onDelete={()=>remove(doc.id)}/></Td></tr>)}</tbody></TableWrapper></div>}
  </div>;
}

export function DocumentDetailPage(){
  const {id}=useParams();const navigate=useNavigate();const [searchParams]=useSearchParams();const {item,loading,error,reload}=useApiDetail(`${endpoints.documents}${id}/`,[id]);const mobile=useIsMobile();
  const category=searchParams.get('category')||'';const standalone=searchParams.get('standalone')==='true';const backUrl=searchParams.get('from')==='list'?`/documents?view=list${standalone?'&standalone=true':(category?`&category=${category}`:'')}`:'/documents';
  const remove=async()=>{if(!confirm('Delete document?'))return;await api.remove(`${endpoints.documents}${id}/`);navigate(backUrl);};
  const deleteExtra=async fileId=>{if(!confirm('Delete this uploaded file?'))return;await api.remove(`${endpoints.documents}${id}/files/${fileId}/`);reload();};
  if(loading)return <LoadingCard/>;if(error)return <Notice type="error">{error}</Notice>;if(!item)return null;const files=allDocumentFiles(item);
  return <div><Breadcrumb items={['Dashboard','Documents',item.name||'Document']}/><PageHeader title={item.name||'Document'} sub={item.description||'Document detail'} action={<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Btn variant="outline" onClick={()=>navigate(backUrl)}><Icon name="arrowLeft" size={15}/> Back to Documents</Btn><Btn variant="outline" onClick={()=>navigate(`/documents/${id}/edit?from=list${standalone?'&standalone=true':(category?`&category=${category}`:'')}`)}><Icon name="edit" size={15}/> Edit</Btn><Btn variant="danger" onClick={remove}><Icon name="trash" size={15}/> Delete</Btn></div>}/>
    <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'minmax(0,1fr) minmax(300px,.7fr)',gap:18}}><Card><SectionTitle>Document Information</SectionTitle>{[['Category',item.category_name],['Job',item.job_name],['Freelance Source',item.freelance_source_name],['Project',item.project_name],['External URL',item.external_url],['Active',boolText(item.is_active)]].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',gap:16,padding:'10px 0',borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:12,color:T.slateLight,fontWeight:700}}>{l}</span><span style={{fontSize:13,color:T.navy,fontWeight:600,textAlign:'right',wordBreak:'break-word'}}>{v||'—'}</span></div>)}</Card><Card><SectionTitle>Files ({files.length})</SectionTitle><div style={{display:'grid',gap:10}}>{files.map(file=><div key={file.id} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:10,display:'flex',alignItems:'center',gap:10}}><Icon name={file.external?'share':'file'} size={20} style={{color:T.navy}}/><div style={{minWidth:0,flex:1,fontSize:12,fontWeight:700,color:T.navy,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{file.name}</div><DownloadButton url={file.url} label={file.external?'Open':'Download'} download={!file.external} style={{padding:'5px 8px',fontSize:11}}/>{!file.legacy&&!file.external&&<Btn variant="danger" onClick={()=>deleteExtra(file.id)} style={{padding:'6px'}}><Icon name="trash" size={14}/></Btn>}</div>)}{!files.length&&<div style={{fontSize:12,color:T.slateLight}}>No file available.</div>}</div></Card></div>
  </div>;
}

export function DocumentFormPage(){
  const {id}=useParams();const edit=Boolean(id);const navigate=useNavigate();const [searchParams]=useSearchParams();const boot=useBootstrap();const returnCategory=searchParams.get('category')||searchParams.get('returnCategory')||'';const returnStandalone=searchParams.get('standalone')==='true'||searchParams.get('returnStandalone')==='true';
  const defaultForm={name:'',description:'',mode:returnCategory?'category':'standalone',category:returnCategory,job:'',freelance_source:'',project:'',document_file:null,uploaded_files:[],external_url:'',is_active:true};
  const [form,setForm]=useState(defaultForm);const initialFormRef=useRef(dirtyString(defaultForm));const [loading,setLoading]=useState(edit);const [error,setError]=useState('');
  useEffect(()=>{if(!edit)return;setLoading(true);api.get(`${endpoints.documents}${id}/`).then(item=>{const next={...item,mode:item.category?'category':'standalone',category:item.category||'',job:item.job||'',freelance_source:item.freelance_source||'',project:item.project||'',document_file:null,uploaded_files:[],is_active:item.is_active!==false};initialFormRef.current=dirtyString(next);setForm(next);}).catch(e=>setError(getErrorMessage(e))).finally(()=>setLoading(false));},[id,edit]);
  const isDirty=dirtyString(form)!==initialFormRef.current;
  const save=async()=>{try{const fd=new FormData();fd.append('name',form.name||'');['description','job','freelance_source','project','external_url'].forEach(k=>{if(form[k]!==undefined&&form[k]!==null&&form[k]!=='')fd.append(k,form[k]);});fd.append('category',form.mode==='category'?(form.category||''):'');fd.append('is_active',form.is_active?'true':'false');if(form.document_file instanceof File)fd.append('document_file',form.document_file);(form.uploaded_files||[]).forEach(file=>fd.append('uploaded_files',file));if(edit)await api.uploadUpdate(`${endpoints.documents}${id}/`,fd);else await api.upload(endpoints.documents,fd);initialFormRef.current=dirtyString(form);navigate(`/documents?view=list${form.mode==='standalone'?'&standalone=true':(form.category?`&category=${form.category}`:'')}`);}catch(e){setError(getErrorMessage(e));}};
  if(loading)return <LoadingCard/>;
  return <WizardForm title={edit?'Edit Document':'Add Document'} back={edit?`/documents/${id}?from=list${returnStandalone?'&standalone=true':(returnCategory?`&category=${returnCategory}`:'')}`:`/documents?view=list${returnStandalone?'&standalone=true':(returnCategory?`&category=${returnCategory}`:'')}`} save={save} dirty={isDirty}>{error&&<Notice type="error">{error}</Notice>}<FormGrid>
    <div style={{display:'grid',gap:5}}><label style={{fontSize:12,fontWeight:600,color:T.slate}}>Document Mode</label><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,padding:4,border:`1px solid ${T.border}`,borderRadius:9,background:T.rowAlt}}>{[['standalone','Standalone'],['category','Category']].map(([value,label])=><button type="button" key={value} onClick={()=>setForm({...form,mode:value,category:value==='standalone'?'':form.category})} style={{border:0,borderRadius:7,padding:'8px 10px',cursor:'pointer',fontSize:12,fontWeight:700,background:form.mode===value?T.navy:'transparent',color:form.mode===value?T.white:T.slateLight}}>{label}</button>)}</div></div><Input label="Name (optional)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="If blank, first file name is used"/>{form.mode==='category'&&<RelationSelect label="Category" value={form.category} onChange={v=>setForm({...form,category:v})} items={boot.documentCategories||[]} blank="Select Category"/>}
    <SourceFields form={form} setForm={setForm} boot={boot}/><Select label="Active" value={String(form.is_active)} onChange={e=>setForm({...form,is_active:e.target.value==='true'})} options={[[ 'true','Active' ],[ 'false','Inactive' ]]}/><Textarea label="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><Input label="External URL" value={form.external_url||''} onChange={e=>setForm({...form,external_url:e.target.value})} placeholder="Optional external link"/>
    <Input label={edit?'Replace Legacy Primary File':'Legacy Primary File (Optional)'} type="file" onChange={e=>setForm({...form,document_file:e.target.files?.[0]||null})}/><Input label="Upload Multiple Files" type="file" multiple onChange={e=>setForm({...form,uploaded_files:Array.from(e.target.files||[])})} style={{height:42}}/>
    <div style={{gridColumn:'1 / -1',fontSize:11,color:T.slateLight}}>Use the multiple-file field for new uploads. The legacy primary file remains supported so existing document data is not lost.</div>
    {form.uploaded_files?.length>0&&<div style={{gridColumn:'1 / -1',display:'grid',gap:6}}>{form.uploaded_files.map(file=><div key={`${file.name}-${file.size}`} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:T.navy}}><Icon name="file" size={15}/>{file.name}</div>)}</div>}
    {edit&&allDocumentFiles(form).length>0&&<div style={{gridColumn:'1 / -1'}}><SectionTitle>Current Files</SectionTitle><div style={{display:'grid',gap:8}}>{allDocumentFiles(form).map(file=><div key={file.id} style={{display:'flex',alignItems:'center',gap:8}}><Icon name="file" size={15}/><span style={{fontSize:12,color:T.navy,flex:1}}>{file.name}</span><DownloadButton url={file.url} style={{fontSize:11,padding:'5px 8px'}}/></div>)}</div></div>}
  </FormGrid></WizardForm>;
}

/* Leave */
export function LeaveListPage(){ const navigate=useNavigate(); const {items,loading,error,reload}=useApiList(endpoints.leave); const remove=async(id)=>{if(!confirm('Delete leave?'))return; await api.remove(`/leave/${id}/`); reload();}; return <ListShell title="Leave / Holiday / Half Day" sub="Calendar/list data from backend" add="＋ Log Leave" onAdd={()=>navigate('/leave/new')} error={error} loading={loading}><TableWrapper><thead><tr><Th>Company</Th><Th>Date</Th><Th>Type</Th><Th>Paid</Th><Th>Deduction</Th><Th>Status</Th><Th>Actions</Th></tr></thead><tbody>{items.map((x,i)=><tr key={x.id}><Td alt={i%2}>{x.company_name}</Td><Td alt={i%2}>{x.date}</Td><Td alt={i%2}>{nice(x.leave_type)}</Td><Td alt={i%2}>{x.is_paid?'Paid':'Unpaid'}</Td><Td alt={i%2}>{money(x.deduction_amount)}</Td><Td alt={i%2}><StatusBadge status={x.status}/></Td><Td alt={i%2}><ActionCell onDelete={()=>remove(x.id)}/></Td></tr>)}</tbody></TableWrapper></ListShell> }
export function LeaveDetailPage(){ const {id}=useParams(); const {item,loading,error}=useApiDetail(`/leave/${id}/`,[id]); if(loading)return <LoadingCard/>; if(error)return <Notice type="error">{error}</Notice>; return <RecordDetail title={item.title} back="/leave" badges={<><Badge label={nice(item.leave_type)} color="gold"/><StatusBadge status={item.status}/></>} sections={[[ 'Details', [['Company',item.company_name],['Date',item.date],['Reason',item.reason],['Paid',item.is_paid?'Yes':'No'],['Deduction',money(item.deduction_amount)],['Notes',item.notes]] ]]}/> }
export function AddLeavePage() {
  const navigate = useNavigate();
  const boot = useBootstrap();

  const defaultForm = {
    job: "",
    leave_type: "full_day",
    date: today(),
    title: "",
    reason: "",
    is_paid: true,
    deduction_amount: 0,
    status: "approved",
    notes: "",
    send_email: false,
    email_template: "",
    email_recipients: [],
  };

  const [form, setForm] = useState(defaultForm);
  const initialFormRef = useRef(dirtyString(defaultForm));
  const isDirty = dirtyString(form) !== initialFormRef.current;

  const toggle = (id) =>
    setForm((f) => ({
      ...f,
      email_recipients: f.email_recipients.map(String).includes(String(id))
        ? f.email_recipients.filter((x) => String(x) !== String(id))
        : [...f.email_recipients, id],
    }));

  const save = async () => {
    await api.create(endpoints.leave, form);
    initialFormRef.current = dirtyString(form);
    navigate("/leave");
  };

  return (
    <WizardForm title="Add Leave" back="/leave" save={save} dirty={isDirty}>
      <FormGrid>
        <RelationSelect
          label="Company / Job"
          required
          value={form.job}
          onChange={(v) => setForm({ ...form, job: v })}
          items={boot.jobs}
          labelKey="company_name"
        />

        <Select
          label="Type"
          value={form.leave_type}
          onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
          options={[
            "full_day",
            "half_day",
            "leave",
            "sick_leave",
            "paid_leave",
            "unpaid_leave",
            "week_off",
            "holiday",
          ].map((x) => [x, nice(x)])}
        />

        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <Input
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <Select
          label="Paid"
          value={form.is_paid ? "yes" : "no"}
          onChange={(e) =>
            setForm({ ...form, is_paid: e.target.value === "yes" })
          }
          options={[
            ["yes", "Paid"],
            ["no", "Unpaid"],
          ]}
        />

        <Input
          label="Deduction Amount"
          type="number"
          value={form.deduction_amount}
          onChange={(e) =>
            setForm({ ...form, deduction_amount: e.target.value })
          }
        />
        <Textarea
          label="Reason"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </FormGrid>

      <div style={{ marginTop: 14 }}>
        <MultiSelectBox
          label="Email Recipients"
          selected={form.email_recipients}
          onToggle={toggle}
          items={boot.employees}
        />
      </div>
    </WizardForm>
  );
}

/* Salary */
export function SalaryListPage(){ const navigate=useNavigate(); const {items,loading,error}=useApiList(endpoints.salary); const totals=items.reduce((a,x)=>({expected:a.expected+Number(x.expected_amount||0),received:a.received+Number(x.received_amount||0),pending:a.pending+Number(x.pending_amount||0)}),{expected:0,received:0,pending:0}); return <div><PageHeader title="Salary / Payments" sub="Expected vs received vs pending" action={<Btn variant="gold" onClick={()=>navigate('/salary/new')}>＋ Record Salary</Btn>}/><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:16}}>{[['Expected',totals.expected],['Received',totals.received],['Pending',totals.pending]].map(([k,v])=><Card key={k}><SectionTitle>{k}</SectionTitle><div style={{fontSize:26,fontWeight:900,color:T.navy}}>{money(v)}</div></Card>)}</div>{error&&<Notice type="error">{error}</Notice>}{loading?<LoadingCard/>:<TableWrapper><thead><tr><Th>Month</Th><Th>Source</Th><Th>Expected</Th><Th>Received</Th><Th>Pending</Th><Th>Status</Th><Th>Date</Th></tr></thead><tbody>{items.map((x,i)=><tr key={x.id} onClick={()=>navigate(`/salary/${x.id}`)} style={{cursor:'pointer'}}><Td alt={i%2}>{x.month}</Td><Td alt={i%2}>{sourceText(x)}</Td><Td alt={i%2}>{money(x.expected_amount)}</Td><Td alt={i%2}>{money(x.received_amount)}</Td><Td alt={i%2}>{money(x.pending_amount)}</Td><Td alt={i%2}><StatusBadge status={x.status}/></Td><Td alt={i%2}>{x.received_date||'—'}</Td></tr>)}</tbody></TableWrapper>}</div> }
export function SalaryDetailPage(){ const {id}=useParams(); const {item,loading,error}=useApiDetail(`/salary/${id}/`,[id]); if(loading)return <LoadingCard/>; if(error)return <Notice type="error">{error}</Notice>; return <RecordDetail title={`Salary ${item.month}`} back="/salary" badges={<StatusBadge status={item.status}/>} sections={[[ 'Summary', [['Source',sourceText(item)],['Expected',money(item.expected_amount)],['Received',money(item.received_amount)],['Pending',money(item.pending_amount)],['Received Date',item.received_date],['Notes',item.notes]] ],[ 'Calculation Lines',(item.calculation_lines||[]).map((x,i)=>[`Line ${i+1}`,`${x.from_date} to ${x.to_date} · ${x.days} days · ${money(x.amount)}`]) ]]}/> }
export function AddSalaryPage(){
  const navigate=useNavigate();
  const boot=useBootstrap();
  const [form,setForm]=useState({salary_type:'job',job:'',freelance_source:'',project:'',manual_source_name:'',month:today().slice(0,7)+'-01',period_start:'',period_end:'',expected_amount:0,received_amount:0,received_date:today(),notes:'',calculation_lines:[]});
  const [autoLoading, setAutoLoading] = useState(false);
  const cleanDate = (value) => {
    if (!value) return null;
    if (typeof value === "string" && value.includes("T"))
      return value.split("T")[0];
    return value;
  };

  const cleanAmount = (value) => {
    if (value === "" || value === null || value === undefined) return "0.00";
    return String(value);
  };

  const buildSalaryPayload = () => {
    const payload = {
      salary_type: form.salary_type,
      month: monthValue(form.month),
      expected_amount: cleanAmount(form.expected_amount),
      received_amount: cleanAmount(form.received_amount),
      received_date: cleanDate(form.received_date),
      notes: form.notes || "",
      calculation_lines: form.calculation_lines || [],
    };

    if (form.salary_type === "job") {
      payload.job = form.job;
    }

    if (form.salary_type === "freelancing") {
      payload.freelance_source = form.freelance_source || null;
      payload.project = form.project || null;
      payload.period_start = cleanDate(form.period_start);
      payload.period_end = cleanDate(form.period_end);
    }

    if (form.salary_type === "manual") {
      payload.manual_source_name = form.manual_source_name || "";
    }

    return payload;
  };
  const freelanceProjects = boot.projects.filter(p => p.source_type === 'freelancing' && (!form.freelance_source || String(p.freelance_source) === String(form.freelance_source)));
  const canCalc = (form.salary_type==='job' && form.job) || (form.salary_type==='freelancing' && (form.project || form.freelance_source));
const calcPayload = () => ({
  salary_type: form.salary_type,
  job: form.job || null,
  freelance_source: form.freelance_source || null,
  project: form.project || null,
  month: monthValue(form.month),
  received_date: cleanDate(form.received_date),
  period_start: cleanDate(form.period_start),
  period_end: cleanDate(form.period_end),
});
  const applyCalcResult = (res) => setForm(f=>({
    ...f,
    month: res.month || monthValue(f.month),
    period_start: res.period_start || f.period_start,
    period_end: res.period_end || f.period_end,
    expected_amount: res.expected_amount,
    calculation_lines: res.calculation_lines || [],
  }));
  const calc=async()=>{ if (!canCalc) return null; const res=await api.create(endpoints.salaryCalculate, calcPayload()); applyCalcResult(res); return res; };
  useEffect(() => {
    if (!canCalc) return undefined;
    let cancelled = false;
    const run = async () => {
      setAutoLoading(true);
      try {
        const res = await api.create(endpoints.salaryCalculate, calcPayload());
        if (!cancelled) applyCalcResult(res);
      } catch (err) {
        if (!cancelled) console.warn('Salary auto calculation failed', err);
      } finally {
        if (!cancelled) setAutoLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [form.salary_type, form.job, form.freelance_source, form.project, form.month, form.received_date, form.period_start, form.period_end]);
  const save = async () => {
    await api.create(endpoints.salary, buildSalaryPayload());
    navigate("/salary");
  };
  const pending = Number(form.expected_amount||0)-Number(form.received_amount||0);
  return <WizardForm title="Add Salary / Payment" back="/salary" save={save}><FormGrid>
    <Select label="Type" value={form.salary_type} onChange={e=>setForm({...form,salary_type:e.target.value,job:'',freelance_source:'',project:'',expected_amount:0,period_start:'',period_end:'',calculation_lines:[]})} options={[[ 'job','Job Salary' ],[ 'freelancing','Freelance Payment' ],[ 'manual','Manual Payment' ]]}/>
    {form.salary_type==='job'&&<RelationSelect label="Job" value={form.job} onChange={v=>setForm({...form,job:v})} items={boot.jobs} labelKey="company_name"/>}
    {form.salary_type==='freelancing'&&<RelationSelect label="Freelance Source" value={form.freelance_source} onChange={v=>setForm({...form,freelance_source:v,project:'',period_start:'',period_end:''})} items={boot.sources}/>} 
    {form.salary_type==='freelancing'&&<RelationSelect label="Project" value={form.project} onChange={v=>setForm({...form,project:v,period_start:'',period_end:''})} items={freelanceProjects} blank="— Select project or use source monthly —"/>}
    {form.salary_type==='manual'&&<Input label="Manual Source" value={form.manual_source_name} onChange={e=>setForm({...form,manual_source_name:e.target.value})}/>} 
    <Input label="Received Date" type="date" value={form.received_date} onChange={e=>setForm({...form,received_date:e.target.value})}/>
    {form.salary_type==='job' && <MonthSelect label="Work Month" value={form.month} onChange={v=>setForm({...form,month:v})}/>} 
    {form.salary_type==='freelancing' && <Input label="Period From" type="date" value={form.period_start} onChange={e=>setForm({...form,period_start:e.target.value})}/>} 
    {form.salary_type==='freelancing' && <Input label="Period To" type="date" value={form.period_end} onChange={e=>setForm({...form,period_end:e.target.value})}/>} 
    <Input label="Expected Amount" type="number" value={form.expected_amount} onChange={e=>setForm({...form,expected_amount:e.target.value})}/>
    <Input label="Received Amount" type="number" value={form.received_amount} onChange={e=>setForm({...form,received_amount:e.target.value})}/>
    <Textarea label="Notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
  </FormGrid>
  <div style={{marginTop:14,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
    <Btn variant="outline" onClick={calc} disabled={!canCalc}>{autoLoading ? 'Calculating…' : `Auto Calculate ${form.salary_type==='freelancing'?'Freelance Payment':'Job Salary'}`}</Btn>
    <Badge label={`Pending: ${money(pending)}`} color={pending===0?'success':'warning'}/>
  </div>
  {form.calculation_lines?.length>0 && <div style={{marginTop:14}}><SectionTitle>Calculation Breakdown</SectionTitle><div style={{display:'grid',gap:8}}>{form.calculation_lines.map((line,i)=><div key={i} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:10,fontSize:12,color:T.slate,background:T.cream}}>{line.from_date} to {line.to_date} · {line.days} days · {money(line.amount)}<br/><span style={{color:T.slateLight}}>{line.notes}</span></div>)}</div></div>}
  </WizardForm>;
}

/* Emails */
export function EmailListPage(){ const navigate=useNavigate(); const {items,loading,error}=useApiList(endpoints.emails); return <ListShell title="Emails" sub="Email inbox/log from backend" add="＋ Send Email" onAdd={()=>navigate('/emails/new')} error={error} loading={loading}><TableWrapper><thead><tr><Th>Subject</Th><Th>To</Th><Th>Type</Th><Th>Status</Th><Th>Date</Th><Th>Actions</Th></tr></thead><tbody>{items.map((x,i)=><tr key={x.id} onClick={()=>navigate(`/emails/${x.id}`)} style={{cursor:'pointer'}}><Td alt={i%2}>{x.subject}</Td><Td alt={i%2}>{x.to_emails || (x.recipient_names||[]).join(', ')}</Td><Td alt={i%2}>{x.email_type_name || 'Custom'}</Td><Td alt={i%2}><StatusBadge status={x.status}/></Td><Td alt={i%2}>{x.sent_at || x.created_at}</Td><Td alt={i%2}><ActionCell onView={()=>navigate(`/emails/${x.id}`)} onEdit={async()=>{await api.create(`/emails/${x.id}/send/`,{}); window.location.reload();}}/></Td></tr>)}</tbody></TableWrapper></ListShell>; }
export function EmailDetailPage(){ const {id}=useParams(); const {item,loading,error}=useApiDetail(`/emails/${id}/`,[id]); if(loading)return <LoadingCard/>; if(error)return <Notice type="error">{error}</Notice>; return <RecordDetail title={item.subject} back="/emails" badges={<StatusBadge status={item.status}/>} sections={[[ 'Email', [['Type',item.email_type_name],['To',item.to_emails],['CC',item.cc],['BCC',item.bcc],['Recipients',(item.recipient_names||[]).join(', ')],['Body',item.body],['Error',item.error_message]] ]]}/> }
export function SendEmailPage(){
  const navigate=useNavigate();
  const boot=useBootstrap();
  const [form,setForm]=useState({email_type:'',template:'',recipients:[],to_emails:'',cc:'',bcc:'',subject:'',body:'',variable_values:{},status:'draft'});
  const selectedTemplate=boot.emailTemplates.find(x=>String(x.id)===String(form.template));
  const templateVariables=(selectedTemplate?.variable_details || (selectedTemplate?.template_variables || []).map(key => ({ key, label: key.replaceAll('_', ' '), default_value: '' })));
  const previewSubject=renderTemplateText(form.subject, form.variable_values);
  const previewBody=renderTemplateText(form.body, form.variable_values);
  const isDirty=Boolean(form.email_type||form.template||form.to_emails||form.subject||form.body||form.recipients.length);
  const toggle=id=>setForm(f=>({...f,recipients:f.recipients.map(String).includes(String(id))?f.recipients.filter(x=>String(x)!==String(id)):[...f.recipients,id]}));
  const applyTemplate=id=>{
    const t=boot.emailTemplates.find(x=>String(x.id)===String(id));
    const vars=(t?.variable_details || (t?.template_variables || []).map(key => ({key, default_value:''}))).reduce((acc,v)=>({...acc,[v.key]:form.variable_values?.[v.key]||v.default_value||''}),{});
    setForm({...form,template:id,email_type:t?.email_type||form.email_type,subject:t?.subject||form.subject,body:t?.body||form.body,variable_values:vars});
  };
  const setVariable=(key,value)=>setForm(f=>({...f,variable_values:{...(f.variable_values||{}),[key]:value}}));
  const save=async(send=false)=>{const created=await api.create(endpoints.emails,{...form,status:send?'draft':form.status}); if(send) await api.create(`/emails/${created.id}/send/`,{}); navigate('/emails');};
  return <WizardForm title="Send Email" back="/emails" save={()=>save(false)} dirty={isDirty}>
    <FormGrid>
      <RelationSelect label="Email Type" value={form.email_type} onChange={v=>setForm({...form,email_type:v})} items={boot.emailTypes}/>
      <RelationSelect label="Template" value={form.template} onChange={applyTemplate} items={boot.emailTemplates}/>
      <Input label="To Emails" value={form.to_emails} onChange={e=>setForm({...form,to_emails:e.target.value})} placeholder="manual@email.com, second@email.com"/>
      <Input label="CC" value={form.cc} onChange={e=>setForm({...form,cc:e.target.value})}/>
      <Input label="BCC" value={form.bcc} onChange={e=>setForm({...form,bcc:e.target.value})}/>
      <Input label="Subject" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/>
      <Textarea label="Body" value={form.body} onChange={e=>setForm({...form,body:e.target.value})} rows={8}/>
    </FormGrid>
    {templateVariables.length>0 && <Card style={{marginTop:14,background:T.cream}}>
      <SectionTitle>Template Variables</SectionTitle>
      <p style={{fontSize:12,color:T.slateLight,marginBottom:10}}>Fill these values for placeholders like {'{{name}}'} before sending.</p>
      <FormGrid>{templateVariables.map(v=><Input key={v.key} label={v.label || nice(v.key)} value={form.variable_values?.[v.key]||''} onChange={e=>setVariable(v.key,e.target.value)} placeholder={v.default_value || ''}/>)}</FormGrid>
    </Card>}
    <div style={{marginTop:14}}><MultiSelectBox label="Recipients" selected={form.recipients} onToggle={toggle} items={boot.employees}/></div>
    <Card style={{marginTop:14}}><SectionTitle>Preview</SectionTitle><strong style={{color:T.navy}}>{previewSubject || 'No subject'}</strong><div style={{whiteSpace:'pre-wrap',fontSize:13,color:T.slate,marginTop:8}}>{previewBody || 'No body'}</div></Card>
    <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:16}}><Btn variant="outline" onClick={()=>save(false)}>Save Draft</Btn><Btn variant="gold" onClick={()=>save(true)}>Send Now</Btn></div>
  </WizardForm>;
}

/* Reports */
export function ReportsPage(){ const {category}=useParams(); const [data,setData]=useState(null); const [error,setError]=useState(''); const cats=['tasks','meetings','salary','leave','emails','employees','designations']; useEffect(()=>{api.get(category?`/reports/${category}/`:'/reports/').then(setData).catch(e=>setError(getErrorMessage(e)));},[category]); return <div><PageHeader title={category?`${nice(category)} Report`:'Reports'} sub="Report hub and category reports" />{error&&<Notice type="error">{error}</Notice>}{!category?<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:16}}>{cats.map(c=><Card key={c} style={{cursor:'pointer'}}><a href={`/reports/${c}`}><div style={{color:T.navy,marginBottom:8}}><Icon name="chart" size={30}/></div><h3 style={{color:T.navy}}>{nice(c)} Reports</h3><p style={{fontSize:12,color:T.slateLight,marginTop:6}}>Open {nice(c)} report</p></a></Card>)}</div>:<Card><pre style={{whiteSpace:'pre-wrap',fontSize:13,color:T.slate}}>{JSON.stringify(data,null,2)}</pre></Card>}</div>; }

/* Management */
const managementConfigs = {
  jobs: { title:'Jobs', path:endpoints.jobs, add:'Add Job', fields:[['company_name','Company Name'],['job_title','Job Title'],['current_designation','Current Designation'],['joining_date','Joining Date','date'],['current_salary','Current Monthly Salary','number'],['salary_cycle_start_day','Cycle Start','number'],['salary_cycle_end_day','Cycle End','number'],['salary_received_day','Received Day','number'],['working_days','Working Days','working-days'],['status','Status','select',[[ 'active','Active'],['probation','Probation'],['resigned','Resigned']]],['notes','Notes','textarea']] },
  sources: { title:'Freelancing Sources', path:endpoints.sources, add:'Add Source', fields:[['name','Name'],['primary_contact_name','Primary Contact'],['platform','Platform','select',[[ 'direct','Direct' ],[ 'upwork','Upwork' ],[ 'fiverr','Fiverr' ],[ 'toptal','Toptal' ],[ 'other','Other' ]]],['email','Email','email'],['phone','Phone'],['status','Status','select',[[ 'active','Active' ],[ 'inactive','Inactive' ],[ 'closed','Closed' ]]],['default_billing_type','Default Billing','select',[[ 'project_wise','Project Wise' ],[ 'monthly','Monthly Retainer' ],[ 'manual','Manual' ]]],['default_monthly_amount','Default Monthly Amount','number'],['payment_due_day','Payment Due Day','number'],['notes','Notes','textarea']] },
  projects: { title:'Projects', path:endpoints.projects, add:'Add Project', fields:[['name','Name'],['source_type','Source Type','select',[[ 'job','Job' ],[ 'freelancing','Freelancing' ],[ 'manual','Manual' ]]],['job','Job','relation:jobs'],['freelance_source','Freelancing Source','relation:sources'],['manual_source_name','Manual Source'],['status','Status','select',[[ 'active','Active' ],[ 'in_progress','In Progress' ],[ 'completed','Completed' ],[ 'hold','Hold' ],[ 'cancelled','Cancelled' ]]],['start_date','Start Date','date'],['end_date','End Date','date'],['budget','Project Budget / Old Quoted Amount (Optional)','number'],['billing_type','Billing Type','select',[[ 'fixed_project','Project Wise / Fixed' ],[ 'monthly','Monthly Retainer' ],[ 'manual','Manual During Payment' ]]],['billing_amount','Billing Amount','number'],['payment_due_day','Payment Due Day','number'],['notes','Notes','textarea']] },
  employees: { title:'Employees / Members', path:endpoints.employees, add:'Add Member', fields:[['name','Name'],['member_type','Type','select',[[ 'self','Self' ],[ 'senior','Senior' ],[ 'employee','Employee' ],[ 'client','Client' ],[ 'freelancer','Freelancer' ]]],['source_type','Belongs To','select',[[ 'job','Job' ],[ 'freelancing','Freelancing' ],[ 'manual','Manual / Other' ]]],['job','Job','relation:jobs'],['freelance_source','Freelancing Source','relation:sources'],['company','Manual Company / Source'],['designation','Designation'],['email','Email','email'],['phone','Phone'],['notes','Notes','textarea']] },
  'email-types': { title:'Email Types', path:endpoints.emailTypes, add:'Add Email Type', fields:[['name','Name'],['code','Code'],['description','Description','textarea']] },
  'email-templates': { title:'Email Templates', path:endpoints.emailTemplates, add:'Add Template', fields:[['email_type','Email Type','relation:emailTypes'],['name','Name'],['subject','Subject'],['body','Body','template-body'],['available_variables','Ask Extra Variables','variables']] },
  'email-variables': { title:'Email Variables', path:endpoints.emailVariables, add:'Add Variable', fields:[['key','Variable Key'],['label','Display Label'],['category','Category','select',[[ 'common','Common' ],[ 'person','Person / Recipient' ],[ 'job','Job' ],[ 'project','Project' ],[ 'task','Task' ],[ 'meeting','Meeting / MOM' ],[ 'leave','Leave' ],[ 'salary','Salary / Payment' ],[ 'custom','Custom' ]]],['default_value','Example / Default Value'],['is_required','Required While Sending','boolean'],['is_active','Active','boolean'],['description','Description','textarea']] },
  designations: { title:'Designation History', path:endpoints.designations, add:'Add Designation', fields:[['job','Job','relation:jobs'],['old_designation','Old Designation'],['new_designation','New Designation'],['effective_date','Effective Date','date'],['reason','Reason','textarea']] },
  'salary-changes': { title:'Salary Changes', path:endpoints.salaryChanges, add:'Add Salary Change', fields:[['job','Job','relation:jobs'],['old_amount','Old Amount','number'],['new_amount','New Amount','number'],['effective_date','Effective Date','date'],['reason','Reason','textarea']] },
  'document-categories': { title:'Document Categories', path:endpoints.documentCategories, add:'Add Document Category', fields:[['name','Name'],['parent','Parent Category','relation:documentCategories'],['description','Description','textarea'],['icon_image','Category Icon Image','file'],['is_active','Active','boolean']] },
};export function ManagementPage(){ const {section='jobs'}=useParams(); const config=managementConfigs[section]||managementConfigs.jobs; const boot=useBootstrap(); const {items,loading,error,reload}=useApiList(config.path, {}, [section]); const [open,setOpen]=useState(false); const [editing,setEditing]=useState(null); const remove=async(id)=>{if(!confirm('Delete record?'))return; await api.remove(`${config.path}${id}/`); reload();}; return <div><PageHeader title={config.title} sub="Management setup page" action={<Btn variant="gold" onClick={()=>{setEditing(null);setOpen(true);}}>＋ {config.add}</Btn>}/>{error&&<Notice type="error">{error}</Notice>}{loading?<LoadingCard/>:<TableWrapper><thead><tr><Th>ID</Th><Th>Main</Th><Th>Status/Type</Th><Th>Created</Th><Th>Actions</Th></tr></thead><tbody>{items.map((x,i)=><tr key={x.id}><Td alt={i%2}>{x.id}</Td><Td alt={i%2}><strong style={{color:T.navy}}>{x.company_name||x.name||x.title||x.subject||x.host||x.new_designation||`Record ${x.id}`}</strong><br/><span style={{fontSize:11,color:T.slateLight}}>{x.job_title||x.email||x.description||x.notes||''}</span></Td><Td alt={i%2}>{x.status?<StatusBadge status={x.status}/>:<Badge label={x.member_type||x.source_type||x.code||'Active'} color="navy"/>}</Td><Td alt={i%2}>{x.created_at||'—'}</Td><Td alt={i%2}><ActionCell onEdit={()=>{setEditing(x);setOpen(true);}} onDelete={()=>remove(x.id)}/></Td></tr>)}</tbody></TableWrapper>}<CrudModal open={open} onClose={()=>setOpen(false)} config={config} item={editing} boot={boot} onSaved={()=>{setOpen(false);reload();}} /></div>; }
function CrudModal({ open, onClose, config, item, boot, onSaved }) {
  const [form, setForm] = useState({});
  const initialFormRef = useRef(dirtyString({}));
  const [error, setError] = useState("");

  useEffect(() => {
    const defaults = { working_days: defaultWorkingDays };

    if (config.title === "Freelancing Sources") {
      Object.assign(defaults, {
        platform: "direct",
        status: "active",
        default_billing_type: "project_wise",
        payment_due_day: 5,
      });
    }

    if (config.title === "Projects") {
      Object.assign(defaults, {
        source_type: "job",
        status: "active",
        billing_type: "manual",
        billing_amount: 0,
      });
    }

    if (config.title === "Employees / Members") {
      Object.assign(defaults, {
        source_type: "manual",
        member_type: "employee",
      });
    }

    if (config.title === "Jobs") {
      Object.assign(defaults, {
        status: "active",
        salary_cycle_start_day: 1,
        salary_cycle_end_day: 31,
        salary_received_day: 7,
        working_days: defaultWorkingDays,
      });
    }

    if (config.title === "Email Variables") {
      Object.assign(defaults, {
        category: "custom",
        is_required: false,
        is_active: true,
      });
    }

    if (config.title === "Document Categories") {
      Object.assign(defaults, {
        parent: "",
        description: "",
        icon_image: null,
        is_active: true,
      });
    }

    const next = item
      ? { ...item, ...(config.title === "Document Categories" ? { icon_image: null } : {}) }
      : defaults;

    initialFormRef.current = dirtyString(next);
    setForm(next);
    setError("");
  }, [item, open, config.title]);

  useEffect(() => {
    if (
      open &&
      [
        "Projects",
        "Email Templates",
        "Employees / Members",
        "Email Variables",
        "Document Categories",
      ].includes(config.title)
    ) {
      boot.reloadBootstrap?.();
    }
  }, [open, config.title]);

  useEffect(() => {
    if (config.title === "Email Templates") {
      boot.reloadBootstrap?.();
    }
  }, [config.title]);

  const isDirty = open && dirtyString(form) !== initialFormRef.current;

  useUnsavedPrompt(Boolean(isDirty));

  const guardedClose = () => {
    if (confirmUnsaved(Boolean(isDirty))) {
      onClose();
    }
  };

  const set = (k, v) => {
    if (
      ["Projects", "Employees / Members"].includes(config.title) &&
      k === "source_type" &&
      v === "freelancing"
    ) {
      boot.reloadBootstrap?.();
    }

    setForm((f) => {
      const next = { ...f, [k]: v };

      if (config.title === "Projects" && k === "source_type") {
        if (v === "job") {
          next.freelance_source = "";
          next.manual_source_name = "";
          next.billing_type = "manual";
          next.billing_amount = 0;
        }

        if (v === "freelancing") {
          next.job = "";
          next.manual_source_name = "";
          if (!next.billing_type || next.billing_type === "manual") {
            next.billing_type = "fixed_project";
          }
        }

        if (v === "manual") {
          next.job = "";
          next.freelance_source = "";
          next.billing_type = "manual";
          next.billing_amount = 0;
        }
      }

      if (config.title === "Employees / Members" && k === "source_type") {
        if (v === "job") {
          next.freelance_source = "";
          next.company = "";
        }

        if (v === "freelancing") {
          next.job = "";
          next.company = "";
        }

        if (v === "manual") {
          next.job = "";
          next.freelance_source = "";
        }
      }

      if (k === "default_billing_type" && v !== "monthly") {
        next.default_monthly_amount = 0;
      }

      return next;
    });
  };

  const relationItems = (key) =>
    key === "jobs"
      ? boot.jobs
      : key === "sources"
        ? boot.sources
        : key === "emailTypes"
          ? boot.emailTypes
          : key === "documentCategories"
            ? boot.documentCategories
            : [];

  const shouldShowField = (name) => {
    if (config.title === "Projects") {
      const type = form.source_type || "job";

      if (name === "job") return type === "job";
      if (name === "freelance_source") return type === "freelancing";
      if (name === "manual_source_name") return type === "manual";
      if (["billing_type", "billing_amount", "payment_due_day"].includes(name))
        return type === "freelancing";
    }

    if (config.title === "Freelancing Sources") {
      if (name === "default_monthly_amount")
        return form.default_billing_type === "monthly";
    }

    if (config.title === "Employees / Members") {
      const type = form.source_type || "manual";

      if (name === "job") return type === "job";
      if (name === "freelance_source") return type === "freelancing";
      if (name === "company") return type === "manual";
    }

    return true;
  };

  const cleanedPayload = () => {
    const data = { ...form };

    if (config.title === "Projects") {
      if (data.source_type === "job") {
        data.freelance_source = null;
        data.manual_source_name = "";
        data.billing_type = "manual";
        data.billing_amount = 0;
        data.payment_due_day = null;
      } else if (data.source_type === "freelancing") {
        data.job = null;
        data.manual_source_name = "";
      } else if (data.source_type === "manual") {
        data.job = null;
        data.freelance_source = null;
        data.billing_type = "manual";
        data.billing_amount = 0;
        data.payment_due_day = null;
      }
    }

    if (config.title === "Freelancing Sources") {
      if (data.default_billing_type !== "monthly") {
        data.default_monthly_amount = 0;
      }

      if (
        data.default_monthly_amount === "" ||
        data.default_monthly_amount === null ||
        data.default_monthly_amount === undefined
      ) {
        data.default_monthly_amount = 0;
      }
    }

    if (config.title === "Email Templates") {
      const explicit = parseVariablesCsv(data.available_variables);
      const fromText = extractTemplateVariables(data.subject, data.body);
      data.available_variables = Array.from(
        new Set([...fromText, ...explicit]),
      );
    }

    if (config.title === "Employees / Members") {
      const type = data.source_type || "manual";

      if (type === "job") {
        data.freelance_source = null;
        data.company = "";
      }

      if (type === "freelancing") {
        data.job = null;
        data.company = "";
      }

      if (type === "manual") {
        data.job = null;
        data.freelance_source = null;
      }
    }

    if (config.title === "Jobs") {
      data.working_days = (data.working_days || defaultWorkingDays).map(Number);
    }

    if (config.title === "Email Variables") {
      data.key = String(data.key || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "");

      data.is_required =
        data.is_required === true || data.is_required === "true";
      data.is_active = data.is_active === true || data.is_active === "true";
    }

    if (config.title === "Document Categories") {
      if (data.parent === "") data.parent = null;
      data.is_active = data.is_active === true || data.is_active === "true";
      if (!(data.icon_image instanceof File)) delete data.icon_image;
      ["id", "parent_name", "icon_url", "created_at", "updated_at"].forEach((key) => delete data[key]);
    }

    return data;
  };

  const save = async () => {
    try {
      const payload = cleanedPayload();

      if (config.title === "Document Categories" && payload.icon_image instanceof File) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") fd.append(k, v);
        });
        if (item?.id) await api.uploadUpdate(`${config.path}${item.id}/`, fd);
        else await api.upload(config.path, fd);
      } else if (config.title === "Attachments" && payload.file instanceof File) {
        const fd = new FormData();

        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            fd.append(k, v);
          }
        });

        if (item?.id) {
          await api.update(`${config.path}${item.id}/`, payload);
        } else {
          await api.upload(config.path, fd);
        }
      } else if (item?.id) {
        await api.update(`${config.path}${item.id}/`, payload);
      } else {
        await api.create(config.path, payload);
      }

      initialFormRef.current = dirtyString(form);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={guardedClose}
      title={item ? "Edit Record" : config.add}
      width={760}
    >
      {error && <Notice type="error">{error}</Notice>}

      {config.title === "Employees / Members" && (
        <Notice type="info">
          Select whether this member belongs to a Job, Freelancing Source, or
          Manual/Other source. This keeps task, meeting and email selection
          cleaner.
        </Notice>
      )}

      {config.title === "Email Templates" && (
        <Notice type="info">
          {
            "Drag or click variables into the body. Variables written as {name} or {{name}} are asked while sending. Line breaks are kept exactly as typed."
          }
        </Notice>
      )}

      {config.title === "Email Variables" && (
        <Notice type="info">
          {
            "Create reusable variables once, then use them in Email Templates by drag/drop. Example key: project_name creates placeholder {project_name}."
          }
        </Notice>
      )}

      <FormGrid>
        {config.fields
          .filter(([name]) => shouldShowField(name))
          .map(([name, label, type = "text", opts]) => {
            if (type === "textarea") {
              return (
                <Textarea
                  key={name}
                  label={label}
                  value={form[name] || ""}
                  onChange={(e) => set(name, e.target.value)}
                />
              );
            }

            if (type === "template-body") {
              return (
                <EmailTemplateBodyBuilder
                  key={name}
                  label={label}
                  value={form[name] || ""}
                  onChange={(v) => set(name, v)}
                  variables={boot.emailVariables || []}
                  onCreated={async (v) => {
                    await api.create(endpoints.emailVariables, v);
                    await boot.reloadBootstrap?.();
                  }}
                />
              );
            }

            if (type === "file") {
              return (
                <div key={name}>
                  <Input label={label} type="file" onChange={(e) => set(name, e.target.files?.[0] || null)} />
                  {form.icon_url && <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.slateLight }}><img src={resolveAssetUrl(form.icon_url)} alt="Current category icon" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 8 }} /> Current icon</div>}
                </div>
              );
            }

            if (type === "working-days") {
              return (
                <WorkingDaysPicker
                  key={name}
                  label={label}
                  value={form[name] || defaultWorkingDays}
                  onChange={(v) => set(name, v)}
                />
              );
            }

            if (type === "variables") {
              return (
                <Input
                  key={name}
                  label={label}
                  value={
                    Array.isArray(form[name])
                      ? form[name].join(", ")
                      : form[name] || ""
                  }
                  onChange={(e) => set(name, e.target.value)}
                  placeholder="optional: manager_name, reason"
                />
              );
            }

            if (type === "boolean") {
              return (
                <Select
                  key={name}
                  label={label}
                  value={String(form[name] ?? true)}
                  onChange={(e) => set(name, e.target.value === "true")}
                  options={[
                    ["true", "Yes"],
                    ["false", "No"],
                  ]}
                />
              );
            }

            if (type?.startsWith?.("relation:")) {
              const rel = type.split(":")[1];
              const items = relationItems(rel);
              const blank =
                rel === "sources" && items.length === 0
                  ? "Create Freelancing Source first"
                  : rel === "documentCategories"
                    ? "— Root Category —"
                    : "— Select —";

              const filteredItems =
                config.title === "Document Categories" && item?.id
                  ? items.filter((x) => String(x.id) !== String(item.id))
                  : items;

              return (
                <RelationSelect
                  key={name}
                  label={label}
                  value={form[name] || ""}
                  onChange={(v) => set(name, v)}
                  items={filteredItems}
                  labelKey={rel === "jobs" ? "company_name" : "name"}
                  blank={blank}
                />
              );
            }

            if (type === "select") {
              return (
                <Select
                  key={name}
                  label={label}
                  value={form[name] || ""}
                  onChange={(e) => set(name, e.target.value)}
                  options={[["", "— Select —"], ...opts]}
                />
              );
            }


            return (
              <Input
                key={name}
                label={label}
                type={type}
                value={form[name] || ""}
                onChange={(e) => set(name, e.target.value)}
              />
            );
          })}
      </FormGrid>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 18,
        }}
      >
        <Btn variant="outline" onClick={guardedClose}>
          Cancel
        </Btn>
        <Btn variant="gold" onClick={save}>
          Save
        </Btn>
      </div>
    </Modal>
  );
}

function EmailTemplateBodyBuilder({ label, value, onChange, variables = [], onCreated }){
  const textRef = useRef(null);
  const [newVar, setNewVar] = useState({ key: '', label: '', category: 'custom', description: '' });
  const [creating, setCreating] = useState(false);
  const activeVariables = (variables || []).filter(v => v.is_active !== false);
  const byCategory = activeVariables.reduce((acc, v) => { const c = v.category || 'custom'; (acc[c] ||= []).push(v); return acc; }, {});
  const insertAtCursor = (placeholder) => {
    const node = textRef.current;
    const text = value || '';
    if (!node) return onChange(`${text}${text ? ' ' : ''}${placeholder}`);
    const start = node.selectionStart ?? text.length;
    const end = node.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${placeholder}${text.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => { node.focus(); node.selectionStart = node.selectionEnd = start + placeholder.length; });
  };
  const createVariable = async () => {
    const key = String(newVar.key || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!key) return alert('Variable key is required. Example: client_name');
    setCreating(true);
    try {
      await onCreated?.({ ...newVar, key, label: newVar.label || nice(key), is_active: true, is_required: false });
      insertAtCursor(`{${key}}`);
      setNewVar({ key: '', label: '', category: 'custom', description: '' });
    } catch (err) { alert(getErrorMessage(err)); }
    finally { setCreating(false); }
  };
  const chipStyle = { border:`1px solid ${T.border}`, background:T.white, color:T.navy, padding:'5px 8px', borderRadius:20, fontSize:11, cursor:'grab', display:'inline-flex', gap:5, alignItems:'center' };
  return <div style={{gridColumn:'1 / -1'}}>
    <label style={{fontSize:12,fontWeight:600,color:T.slate}}>{label}</label>
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 300px',gap:14,marginTop:6,alignItems:'start'}}>
      <textarea
        ref={textRef}
        value={value || ''}
        onChange={e=>onChange(e.target.value)}
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{ e.preventDefault(); const text=e.dataTransfer.getData('text/plain'); if(text) insertAtCursor(text); }}
        placeholder={'Write email body here. Drag variables like {name} from right side.'}
        rows={12}
        style={{padding:'10px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none',width:'100%',resize:'vertical',fontFamily:'inherit',whiteSpace:'pre-wrap',lineHeight:1.45}}
        onFocus={e => e.target.style.borderColor = T.gold}
        onBlur={e => e.target.style.borderColor = T.border}
      />
      <div style={{border:`1px solid ${T.border}`,borderRadius:10,background:T.cream,padding:12}}>
        <div style={{fontSize:12,fontWeight:800,color:T.navy,marginBottom:8}}>Variable Library</div>
        <div style={{maxHeight:240,overflow:'auto',display:'grid',gap:10}}>
          {Object.keys(byCategory).length===0 && <div style={{fontSize:12,color:T.slateLight}}>No variables yet. Add one below.</div>}
          {Object.entries(byCategory).map(([cat, list]) => <div key={cat}>
            <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.08em',color:T.slateLight,margin:'4px 0'}}>{nice(cat)}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{list.map(v => {
              const placeholder = v.placeholder || `{${v.key}}`;
              return <button key={v.id || v.key} type="button" draggable title={v.description || placeholder} onDragStart={e=>e.dataTransfer.setData('text/plain', placeholder)} onClick={()=>insertAtCursor(placeholder)} style={chipStyle}>＋ {placeholder}</button>;
            })}</div>
          </div>)}
        </div>
        <div style={{borderTop:`1px solid ${T.border}`,marginTop:12,paddingTop:10,display:'grid',gap:8}}>
          <div style={{fontSize:12,fontWeight:700,color:T.navy}}>Add New Variable</div>
          <Input label="Key" value={newVar.key} onChange={e=>setNewVar({...newVar,key:e.target.value})} placeholder="client_name" />
          <Input label="Label" value={newVar.label} onChange={e=>setNewVar({...newVar,label:e.target.value})} placeholder="Client Name" />
          <Select label="Category" value={newVar.category} onChange={e=>setNewVar({...newVar,category:e.target.value})} options={[[ 'common','Common' ],[ 'person','Person' ],[ 'job','Job' ],[ 'project','Project' ],[ 'task','Task' ],[ 'meeting','Meeting / MOM' ],[ 'leave','Leave' ],[ 'salary','Salary' ],[ 'custom','Custom' ]]} />
          <Btn variant="outline" disabled={creating} onClick={createVariable} style={{justifyContent:'center'}}>{creating?'Adding…':'Add Variable + Insert'}</Btn>
        </div>
      </div>
    </div>
    <div style={{fontSize:11,color:T.slateLight,marginTop:6}}>Tip: drag a chip into the exact line/place, or click it to insert at cursor. Line breaks stay exactly as written.</div>
  </div>;
}

function WorkingDaysPicker({ label, value, onChange }){
  const selected=(value||defaultWorkingDays).map(Number);
  const toggle=(day)=>{ const active=selected.includes(day); onChange(active ? selected.filter(x=>x!==day) : [...selected,day].sort()); };
  return <div><label style={{fontSize:12,fontWeight:600,color:T.slate}}>{label}</label><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>{workingDayOptions.map(([day,name])=><button key={day} type="button" onClick={()=>toggle(day)} style={{border:`1px solid ${selected.includes(day)?T.gold:T.border}`,background:selected.includes(day)?T.goldLight:T.white,color:selected.includes(day)?T.goldDark:T.slate,padding:'7px 10px',borderRadius:18,fontSize:12,cursor:'pointer'}}>{selected.includes(day)&&<Icon name="check" size={13} style={{marginRight:4}}/>}{name.slice(0,3)}</button>)}</div><div style={{fontSize:11,color:T.slateLight,marginTop:6}}>Current: {workingDayLabel(selected)}</div></div>;
}

export function SettingsPage(){ const [me,setMe]=useState(null); const [msg,setMsg]=useState(''); const [err,setErr]=useState(''); const [pw,setPw]=useState({old_password:'',new_password:''}); useEffect(()=>{api.auth.me().then(setMe).catch(e=>setErr(getErrorMessage(e)));},[]); const saveProfile=async()=>{try{const res=await api.auth.updateMe(me); setMe(res); setMsg('Profile saved.');}catch(e){setErr(getErrorMessage(e));}}; const savePw=async()=>{try{await api.auth.changePassword(pw); setMsg('Password changed.'); setPw({old_password:'',new_password:''});}catch(e){setErr(getErrorMessage(e));}}; if(!me)return <LoadingCard/>; return <div><PageHeader title="Settings" sub="Profile, password and preferences" />{msg&&<Notice type="success">{msg}</Notice>}{err&&<Notice type="error">{err}</Notice>}<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}><Card><SectionTitle>Profile</SectionTitle><div style={{display:'grid',gap:12}}><Input label="Full Name" value={me.full_name||''} onChange={e=>setMe({...me,full_name:e.target.value})}/><Input label="Phone" value={me.phone||''} onChange={e=>setMe({...me,phone:e.target.value})}/><Input label="Email" value={me.email||''} onChange={()=>{}}/><Btn variant="gold" onClick={saveProfile}>Save Profile</Btn></div></Card><Card><SectionTitle>Change Password</SectionTitle><div style={{display:'grid',gap:12}}><Input label="Old Password" type="password" value={pw.old_password} onChange={e=>setPw({...pw,old_password:e.target.value})}/><Input label="New Password" type="password" value={pw.new_password} onChange={e=>setPw({...pw,new_password:e.target.value})}/><Btn variant="gold" onClick={savePw}>Change Password</Btn></div></Card></div></div>; }
