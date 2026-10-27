import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, getErrorMessage, normalizeList, resolveAssetUrl } from '../../api/client';
import { Btn, Card, Modal } from '../../components/UI';
import { Icon } from '../../components/Icons';
import { T } from '../../theme';

/* ── API (backend: /api/property-management/) ── */

const PM = '/property-management';
const list = (path, params) => apiRequest(`${PM}${path}`, { params: { page_size: 200, ...params } }).then(normalizeList);
const get = (path, params) => apiRequest(`${PM}${path}`, { params });
const post = (path, body) => apiRequest(`${PM}${path}`, { method: 'POST', body: body ?? {} });
const patch = (path, body) => apiRequest(`${PM}${path}`, { method: 'PATCH', body });
const put = (path, body) => apiRequest(`${PM}${path}`, { method: 'PUT', body });
const del = (path) => apiRequest(`${PM}${path}`, { method: 'DELETE' });
const upload = (path, form, method = 'POST') => apiRequest(`${PM}${path}`, { method, body: form, isFormData: true });
const save = (path, id, body) => (id ? patch(`${path}${id}/`, body) : post(path, body));

export const pm = {
  options: () => get('/options/'),
  dashboard: (params) => get('/dashboard/', params),
  collection: (params) => get('/rent-collection/', params),
  monthlyReport: (params) => get('/reports/monthly/', params),

  properties: (params) => list('/properties/', params),
  propertyOverview: (id, month) => get(`/properties/${id}/overview/`, { month }),
  saveProperty: (data, id) => save('/properties/', id, data),
  saveFloor: (data, id) => save('/floors/', id, data),
  deleteFloor: (id) => del(`/floors/${id}/`),
  saveSection: (data) => post('/floor-sections/', data),
  deleteSection: (id) => del(`/floor-sections/${id}/`),
  units: (params) => list('/units/', params),
  saveUnit: (data, id) => save('/units/', id, data),

  tenants: (params) => list('/tenants/', params),
  tenant: (id) => get(`/tenants/${id}/`),
  tenantSummary: (id) => get(`/tenants/${id}/summary/`),
  saveTenant: (data, id) => save('/tenants/', id, data),

  agreements: (params) => list('/agreements/', params),
  agreement: (id) => get(`/agreements/${id}/`),
  saveAgreement: (data, id) => save('/agreements/', id, data),
  renewAgreement: (id, data) => post(`/agreements/${id}/renew/`, data),
  endAgreement: (id, data) => post(`/agreements/${id}/end/`, data),
  reviseRent: (id, data) => post(`/agreements/${id}/rent-revisions/`, data),
  agreementBalance: (id) => get(`/agreements/${id}/balance/`),
  applyCredit: (id) => post(`/agreements/${id}/apply-credit/`),
  uploadAgreementDocument: (id, form) => upload(`/agreements/${id}/documents/`, form),
  documents: (params) => list('/documents/', params),
  uploadDocument: (form) => upload('/documents/', form),

  reminderSettings: () => get('/reminder-settings/'),
  saveReminderSettings: (data) => put('/reminder-settings/', data),
  dismissReminder: (id) => patch(`/reminders/${id}/`, { dismissed: true }),

  recordPayment: (data) => post('/rent-payments/', data),
  payments: (params) => list('/rent-payments/', params),
  reversePayment: (id, reason) => post(`/rent-payments/${id}/reverse/`, { reason }),
  adjustCharge: (id, amount, reason) => post(`/charges/${id}/adjust/`, { amount, reason }),
  voidCharge: (id, reason) => post(`/charges/${id}/void/`, { reason }),
  addOneTimeCharge: (data) => post('/charges/', data),

  recurringCharges: (params) => list('/recurring-charges/', params),
  saveRecurringCharge: (data, id) => save('/recurring-charges/', id, data),
  discontinueRecurringCharge: (id, end_date) => post(`/recurring-charges/${id}/discontinue/`, { end_date }),

  expenses: (params) => list('/expenses/', params),
  saveExpense: (form, id) => (id ? upload(`/expenses/${id}/`, form, 'PATCH') : upload('/expenses/', form)),
  deleteExpense: (id) => del(`/expenses/${id}/`),

  meters: (params) => list('/electricity/meters/', params),
  meter: (id) => get(`/electricity/meters/${id}/`),
  saveMeter: (data, id) => save('/electricity/meters/', id, data),
  meterSplitSetup: (id, month) => get(`/electricity/meters/${id}/split-setup/`, { month }),
  // body: { month, amount, method, lines: { unitId: { units } | { amount } }, preview? }
  meterBill: (id, body, file) => (file
    ? upload(`/electricity/meters/${id}/bill/`, toFormData({ ...body, lines: JSON.stringify(body.lines || {}) }, { attachment: file }))
    : post(`/electricity/meters/${id}/bill/`, body)),
  meterBills: (id) => get(`/electricity/meters/${id}/bills/`),
  assignMeter: (data) => post('/electricity/meter-assignments/', data),
  endMeterAssignment: (id, end_date) => patch(`/electricity/meter-assignments/${id}/`, { end_date }),
  readings: (params) => list('/electricity/readings/', params),
  saveReading: (form) => upload('/electricity/readings/', form),
  bills: (params) => list('/electricity/bills/', params),
  bill: (id) => get(`/electricity/bills/${id}/`),
  createBill: (form) => upload('/electricity/bills/', form),
  cancelBill: (id) => post(`/electricity/bills/${id}/cancel/`),
  billCandidates: (id) => get(`/electricity/bills/${id}/candidates/`),
  allocateBill: (id, data) => post(`/electricity/bills/${id}/allocate/`, data),
  correctAllocation: (id, amount, reason) => post(`/electricity/allocations/${id}/correct/`, { amount, reason }),

  recordDeposit: (data) => post('/security-deposits/', data),
  settleDeposit: (data) => post('/security-deposits/settle/', data),
};

export function toFormData(fields, files = {}) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));
  });
  Object.entries(files).forEach(([key, file]) => { if (file) form.append(key, file, file.name); });
  return form;
}

/* ── Formatting ── */

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const rupees = (value) => { const n = Number(value ?? 0); return inr.format(Number.isFinite(n) ? n : 0); };
export const isPositive = (value) => Number(value ?? 0) > 0.004;

/** Validates a typed money value. Returns "1234.50" or null. */
export function parseAmount(text) {
  const cleaned = String(text ?? '').replace(/[,₹\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned).toFixed(2);
}

const pad = (n) => String(n).padStart(2, '0');
/** Local calendar date (never toISOString, which shifts to UTC). */
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const currentMonth = () => localDate().slice(0, 7);
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function shiftDate(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (month) => { const [y, m] = month.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
export function prettyDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
export const titleCase = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const newRequestKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
export const openFile = (url) => { if (url) window.open(resolveAssetUrl(url), '_blank', 'noopener'); };

/* ── Data loading ── */

export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setData(await fn()); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load, setData };
}

// Choice lists never change at runtime: fetch once and share between all components.
let optionsCache = null;
let optionsRequest = null;
export function useOptions() {
  const [options, setOptions] = useState(optionsCache);
  useEffect(() => {
    if (optionsCache) return;
    optionsRequest = optionsRequest || pm.options().then((o) => { optionsCache = o; return o; }).catch(() => { optionsRequest = null; return null; });
    let alive = true;
    optionsRequest.then((o) => { if (alive && o) setOptions(o); });
    return () => { alive = false; };
  }, []);
  return options || {};
}
export const choiceOptions = (choices = []) => choices.map((c) => [String(c.value), c.label]);

/** Runs an action with a confirm prompt, reports errors, then refreshes. */
export async function runAction({ confirmText, action, onDone, onError }) {
  if (confirmText && !window.confirm(confirmText)) return null;
  try {
    const result = await action();
    await onDone?.(result);
    return result;
  } catch (err) {
    (onError || ((m) => window.alert(m)))(getErrorMessage(err));
    return null;
  }
}

/* ── Small UI pieces ── */

const STATUS_TONES = {
  paid: [T.success, T.successBg], active: [T.success, T.successBg], allocated: [T.success, T.successBg], recovered: [T.success, T.successBg], occupied: [T.success, T.successBg],
  partially_paid: [T.warning, T.warningBg], partial: [T.warning, T.warningBg], expiring_soon: [T.warning, T.warningBg], draft: [T.warning, T.warningBg], pending: [T.warning, T.warningBg], maintenance: [T.warning, T.warningBg],
  unpaid: [T.info, T.infoBg], available: [T.info, T.infoBg], vacant: [T.info, T.infoBg],
  overdue: [T.error, T.errorBg], expired: [T.error, T.errorBg], terminated: [T.error, T.errorBg], cancelled: [T.slateLight, T.rowAlt],
};

export function StatusPill({ status, label }) {
  const [color, bg] = STATUS_TONES[status] || [T.slateLight, T.rowAlt];
  return <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, color, background: bg, whiteSpace: 'nowrap' }}>{label || titleCase(status)}</span>;
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, color: T.error, background: T.errorBg, border: '1px solid #FECACA', fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
      <span>{message}</span>
      {onRetry && <Btn variant="outline" style={{ padding: '4px 10px' }} onClick={onRetry}>Retry</Btn>}
    </div>
  );
}

export const Loading = () => <div style={{ padding: 28, textAlign: 'center', color: T.slateLight }}>Loading…</div>;
export const Muted = ({ children, style }) => <div style={{ fontSize: 12, color: T.slateLight, ...style }}>{children}</div>;
export const Empty = ({ children }) => <div style={{ padding: 24, textAlign: 'center', color: T.slateLight, fontSize: 13 }}>{children}</div>;

export function KV({ label, value, strong, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: `1px dashed ${T.border}`, fontSize: 13 }}>
      <span style={{ color: T.slateLight }}>{label}</span>
      <span style={{ color: tone || T.navy, fontWeight: strong ? 800 : 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export function Stat({ label, value, sub, tone = T.navy, to }) {
  const body = (
    <Card style={{ padding: 16, borderTop: `3px solid ${tone}`, height: '100%' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: T.slateLight, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginTop: 7 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.slateLight, marginTop: 5 }}>{sub}</div>}
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export const StatGrid = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>{children}</div>;
export const FormGrid = ({ children, min = 220 }) => <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`, gap: 12 }}>{children}</div>;

export function CardTitle({ title, sub, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
      <div><h2 style={{ color: T.navy, fontSize: 16 }}>{title}</h2>{sub && <Muted style={{ marginTop: 3 }}>{sub}</Muted>}</div>
      {action && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{action}</div>}
    </div>
  );
}

const inputStyle = { width: '100%', padding: '9px 11px', border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13, background: T.white, color: T.slate };

export function Field({ label, required, hint, error, children }) {
  return (
    <label style={{ display: 'grid', gap: 5, alignContent: 'start' }}>
      {label && <span style={{ fontSize: 12, fontWeight: 700, color: T.slate }}>{label}{required && <span style={{ color: T.error }}> *</span>}</span>}
      {children}
      {error ? <span style={{ fontSize: 11, color: T.error }}>{error}</span> : hint ? <span style={{ fontSize: 11, color: T.slateLight }}>{hint}</span> : null}
    </label>
  );
}

export function TextIn({ label, required, hint, error, value, onChange, type = 'text', ...rest }) {
  return <Field label={label} required={required} hint={hint} error={error}><input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle} {...rest} /></Field>;
}

export function MoneyIn(props) {
  return <TextIn inputMode="decimal" placeholder="0" {...props} />;
}

export function TextArea({ label, value, onChange, rows = 2 }) {
  return <Field label={label}><textarea rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></Field>;
}

/** options: [[value, label], ...]; values are kept as strings. */
export function Pick({ label, required, hint, value, onChange, options, placeholder }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Field>
  );
}

export function Check({ label, hint, checked, onChange }) {
  return (
    <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer', padding: '6px 0' }}>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: T.navy }} />
      <span><span style={{ fontSize: 13, color: T.navy, fontWeight: 600 }}>{label}</span>{hint && <Muted style={{ marginTop: 2 }}>{hint}</Muted>}</span>
    </label>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, padding: 4, background: T.rowAlt, border: `1px solid ${T.border}`, borderRadius: 10 }}>
      {options.map(([key, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)} style={{ padding: '7px 12px', border: 0, borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: String(value) === String(key) ? T.navy : 'transparent', color: String(value) === String(key) ? T.white : T.slateLight }}>{label}</button>
      ))}
    </div>
  );
}

export function MonthBar({ month, onChange }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 4 }}>
      <button type="button" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))} style={navBtn}><Icon name="arrowLeft" size={15} /></button>
      <input type="month" value={month} onChange={(e) => e.target.value && onChange(e.target.value)} style={{ border: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: T.navy, background: 'transparent', width: 150, textAlign: 'center' }} />
      <button type="button" aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))} style={navBtn}><Icon name="arrowRight" size={15} /></button>
      {month !== currentMonth() && <button type="button" onClick={() => onChange(currentMonth())} style={{ ...navBtn, width: 'auto', padding: '0 9px', fontSize: 11, fontWeight: 700 }}>Today</button>}
    </div>
  );
}
const navBtn = { width: 30, height: 30, border: 0, borderRadius: 7, background: T.rowAlt, color: T.navy, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

export function PropertyFilter({ properties, value, onChange }) {
  if (!properties || properties.length < 2) return null;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
      <option value="">All properties</option>
      {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}

export const Toolbar = ({ children }) => <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>{children}</div>;

export function FilePick({ label = 'Attach file', file, onChange, accept }) {
  return (
    <Field label={label}>
      <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)} style={{ ...inputStyle, padding: 7 }} />
      {file && <Muted>{file.name}</Muted>}
    </Field>
  );
}

export function FormModal({ open, onClose, title, subtitle, children, onSubmit, submitLabel = 'Save', busy, disabled, error, width = 620, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} width={width}>
      <form onSubmit={(e) => { e.preventDefault(); if (!busy && !disabled) onSubmit(); }}>
        <ErrorBox message={error} />
        <div style={{ display: 'grid', gap: 12 }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant={danger ? 'danger' : 'gold'} disabled={busy || disabled}>{busy ? 'Saving…' : submitLabel}</Btn>
        </div>
      </form>
    </Modal>
  );
}

/** Small form state helper: const [f, set] = useForm({...}); set('field')(value) */
export function useForm(initial) {
  const [form, setForm] = useState(initial);
  const set = useCallback((key) => (value) => setForm((f) => ({ ...f, [key]: value })), []);
  return [form, set, setForm];
}

export const linkStyle = { color: T.goldDark, fontWeight: 700, cursor: 'pointer', background: 'none', border: 0, padding: 0, fontSize: 12, fontFamily: 'inherit' };
export const LinkBtn = ({ children, onClick, danger }) => <button type="button" onClick={onClick} style={{ ...linkStyle, color: danger ? T.error : T.goldDark }}>{children}</button>;
