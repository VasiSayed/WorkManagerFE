import { useEffect, useMemo, useState } from 'react';
import { api, apiRequest, endpoints, getErrorMessage, normalizeList, resolveAssetUrl } from '../api/client';
import { Btn, Card, FilterChips, PageHeader, TableWrapper, Td, Th, Toast } from '../components/UI';
import { Icon } from '../components/Icons';
import VoiceTextInput from '../components/VoiceTextInput';
import { T } from '../theme';
import {
  ErrorBox, Field, FormGrid, FormModal, LinkBtn, Loading, localDate, MoneyIn, Muted, parseAmount, Pick, rupees, Segmented,
  TextIn,
} from './rental/shared';

/* ── API ── */

const ledger = {
  list: (params) => apiRequest(endpoints.expenses, { params }),
  summary: (params) => apiRequest(`${endpoints.expenses}summary/`, { params }),
  save: (body, id) => apiRequest(id ? `${endpoints.expenses}${id}/` : endpoints.expenses, { method: id ? 'PATCH' : 'POST', body }),
  uploadFiles: (id, files) => {
    const form = new FormData();
    files.forEach((f) => form.append('uploaded_files', f));
    return api.uploadUpdate(`${endpoints.expenses}${id}/`, form);
  },
  remove: (id) => api.remove(`${endpoints.expenses}${id}/`),
  removeFile: (id, fileId) => api.remove(`${endpoints.expenses}${id}/files/${fileId}/`),
  categories: () => apiRequest(endpoints.expenseCategories).then(normalizeList),
  saveCategory: (body, id) => apiRequest(id ? `${endpoints.expenseCategories}${id}/` : endpoints.expenseCategories, { method: id ? 'PATCH' : 'POST', body }),
  removeCategory: (id) => api.remove(`${endpoints.expenseCategories}${id}/`),
  contacts: () => apiRequest(endpoints.expenseContacts).then(normalizeList),
  saveContact: (body, id) => apiRequest(id ? `${endpoints.expenseContacts}${id}/` : endpoints.expenseContacts, { method: id ? 'PATCH' : 'POST', body }),
  removeContact: (id) => api.remove(`${endpoints.expenseContacts}${id}/`),
  tags: () => apiRequest(endpoints.expenseTags).then(normalizeList),
  removeTag: (id) => api.remove(`${endpoints.expenseTags}${id}/`),
};

/* ── Period helpers ── */

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function periodRange(key) {
  const now = new Date();
  if (key === 'this_month') return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
  if (key === 'last_month') return [ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), ymd(new Date(now.getFullYear(), now.getMonth(), 0))];
  if (key === 'this_year') return [`${now.getFullYear()}-01-01`, `${now.getFullYear()}-12-31`];
  if (key === 'last_30') { const from = new Date(now); from.setDate(from.getDate() - 29); return [ymd(from), ymd(now)]; }
  return ['', ''];
}
const PERIODS = [['this_month', 'This month'], ['last_month', 'Last month'], ['last_30', 'Last 30 days'], ['this_year', 'This year'], ['all', 'All time'], ['custom', 'Custom']];
const prettyDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const inputStyle = { width: '100%', padding: '9px 11px', border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: 'inherit', fontSize: 13, background: T.white, color: T.slate };
const NEW = '__new__';

/* ── Pickers with "add new" right inside the dropdown ── */

function PickOrAdd({ label, value, onChange, options, placeholder, addLabel, onAdd, disabled, hint }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const add = async () => {
    if (!text.trim()) return;
    setBusy(true); setError('');
    try { const created = await onAdd(text.trim()); onChange(String(created.id)); setAdding(false); setText(''); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <Field label={label} hint={hint} error={error}>
      {adding ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={addLabel}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } if (e.key === 'Escape') setAdding(false); }} style={{ ...inputStyle, flex: 1 }} />
          <Btn variant="gold" disabled={busy || !text.trim()} onClick={add} style={{ padding: '8px 12px' }}>Add</Btn>
          <Btn variant="outline" onClick={() => setAdding(false)} style={{ padding: '8px 10px' }}>×</Btn>
        </div>
      ) : (
        <select value={value ?? ''} disabled={disabled} onChange={(e) => (e.target.value === NEW ? setAdding(true) : onChange(e.target.value))} style={{ ...inputStyle, background: disabled ? T.rowAlt : T.white }}>
          <option value="">{placeholder}</option>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          {!disabled && <option value={NEW}>＋ {addLabel}</option>}
        </select>
      )}
    </Field>
  );
}

function TagInput({ value, onChange, suggestions }) {
  const [text, setText] = useState('');
  const add = (name) => {
    const clean = name.trim().replace(/,$/, '');
    if (clean && !value.some((v) => v.toLowerCase() === clean.toLowerCase())) onChange([...value, clean]);
    setText('');
  };
  const options = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()) && (!text || s.toLowerCase().includes(text.toLowerCase()))).slice(0, 8);
  return (
    <Field label="Tags" hint="Type and press Enter. Tags are only yours.">
      <div style={{ ...inputStyle, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '6px 8px' }}>
        {value.map((t) => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, background: T.navyTint, color: T.navy, fontSize: 12, fontWeight: 600 }}>
            #{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((v) => v !== t))} style={{ border: 0, background: 'none', cursor: 'pointer', color: T.slateLight }}>×</button>
          </span>
        ))}
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={value.length ? '' : 'e.g. trip, office'}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text); } if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1)); }}
          onBlur={() => text && add(text)} style={{ border: 0, outline: 'none', flex: 1, minWidth: 90, fontFamily: 'inherit', fontSize: 13 }} />
      </div>
      {options.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
          {options.map((s) => <button key={s} type="button" onClick={() => add(s)} style={{ border: `1px dashed ${T.border}`, background: T.white, borderRadius: 999, padding: '2px 8px', fontSize: 11, color: T.slate, cursor: 'pointer' }}>+ {s}</button>)}
        </div>
      )}
    </Field>
  );
}

/* ── Entry form ── */

const emptyEntry = (type = 'given') => ({ transaction_type: type, amount: '', date: localDate(), name: '', category: '', sub_category: '', contact: '', tags: [], notes: '' });

function EntryModal({ open, entry, initialType, lists, onClose, onSaved, onListsChanged }) {
  const [f, setF] = useState(emptyEntry());
  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setError(''); setFiles([]);
    if (entry) {
      setF({
        transaction_type: entry.transaction_type, amount: String(Number(entry.amount)), date: entry.date, name: entry.name || '',
        category: entry.category ? String(entry.category) : '', sub_category: entry.sub_category ? String(entry.sub_category) : '',
        contact: entry.contact ? String(entry.contact) : '', tags: (entry.tag_list || []).map((t) => t.name), notes: entry.notes || '',
      });
      setExistingFiles(entry.files || []);
    } else {
      setF(emptyEntry(initialType));
      setExistingFiles([]);
    }
  }, [open, entry, initialType]);

  const mains = lists.categories.filter((c) => !c.parent);
  const subs = lists.categories.filter((c) => String(c.parent) === String(f.category));
  const parsed = parseAmount(f.amount);
  const given = f.transaction_type === 'given';

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const body = {
        transaction_type: f.transaction_type, amount: parsed, date: f.date || localDate(), name: f.name.trim(), notes: f.notes,
        category: f.category ? Number(f.category) : null, sub_category: f.sub_category ? Number(f.sub_category) : null,
        contact: f.contact ? Number(f.contact) : null, tag_names: f.tags,
      };
      const saved = await ledger.save(body, entry?.id);
      if (files.length) await ledger.uploadFiles(saved.id, files);
      onSaved(saved);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const removeExisting = async (fileId) => {
    if (!window.confirm('Remove this attachment?')) return;
    try { await ledger.removeFile(entry.id, fileId); setExistingFiles((x) => x.filter((file) => file.id !== fileId)); }
    catch (err) { setError(getErrorMessage(err)); }
  };

  return (
    <FormModal open={open} onClose={onClose} title={entry ? 'Edit entry' : given ? 'Money given' : 'Money received'} subtitle="Only the amount is required" onSubmit={submit}
      submitLabel={parsed ? `${entry ? 'Save' : 'Add'} ${rupees(parsed)} ${given ? 'given' : 'received'}` : 'Save'} busy={busy} error={error} disabled={!parsed} width={640}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Segmented value={f.transaction_type} onChange={set('transaction_type')} options={[['given', '↑ Given (paid out)'], ['received', '↓ Received (came in)']]} />
      </div>
      <FormGrid min={180}>
        <MoneyIn label="Amount (₹)" required value={f.amount} onChange={set('amount')} autoFocus />
        <TextIn label="Date" type="date" value={f.date} onChange={set('date')} />
      </FormGrid>
      <VoiceTextInput label="Description" value={f.name} onChange={set('name')} placeholder={given ? 'e.g. Groceries, Petrol, Rent' : 'e.g. Salary, Refund'} />
      <FormGrid min={180}>
        <PickOrAdd label="Category" value={f.category} onChange={(v) => setF((x) => ({ ...x, category: v, sub_category: '' }))} placeholder="No category"
          options={mains.map((c) => [String(c.id), c.name])} addLabel="New category"
          onAdd={async (name) => { const c = await ledger.saveCategory({ name }); await onListsChanged(); return c; }} />
        <PickOrAdd label="Sub-category" value={f.sub_category} onChange={set('sub_category')} placeholder={f.category ? 'No sub-category' : 'Pick a category first'} disabled={!f.category}
          options={subs.map((c) => [String(c.id), c.name])} addLabel="New sub-category"
          onAdd={async (name) => { const c = await ledger.saveCategory({ name, parent: Number(f.category) }); await onListsChanged(); return c; }} />
        <PickOrAdd label={given ? 'Paid to' : 'Received from'} value={f.contact} onChange={set('contact')} placeholder="No one in particular"
          options={lists.contacts.map((c) => [String(c.id), c.phone ? `${c.name} · ${c.phone}` : c.name])} addLabel="New contact (name)"
          onAdd={async (name) => { const c = await ledger.saveContact({ name }); await onListsChanged(); return c; }} />
      </FormGrid>
      <TagInput value={f.tags} onChange={set('tags')} suggestions={lists.tags.map((t) => t.name)} />
      <TextIn label="Notes" value={f.notes} onChange={set('notes')} />
      <Field label="Receipts / bills (optional)">
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} style={{ ...inputStyle, padding: 7 }} />
        {(existingFiles.length > 0 || files.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {existingFiles.map((file) => (
              <span key={file.id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '4px 8px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }}>
                <a href={resolveAssetUrl(file.file_url || file.file)} target="_blank" rel="noreferrer" style={{ color: T.navy, fontWeight: 700 }}>{file.original_name || 'File'}</a>
                <button type="button" onClick={() => removeExisting(file.id)} style={{ border: 0, background: 'none', color: T.error, cursor: 'pointer' }}>×</button>
              </span>
            ))}
            {files.map((file) => <span key={file.name} style={{ padding: '4px 8px', borderRadius: 8, background: T.goldLight, fontSize: 11 }}>{file.name}</span>)}
          </div>
        )}
      </Field>
    </FormModal>
  );
}

/* ── Manage categories / contacts / tags ── */

function ManageModal({ open, lists, onClose, onChanged }) {
  const [tab, setTab] = useState('categories');
  const [error, setError] = useState('');
  const run = async (fn) => { setError(''); try { await fn(); await onChanged(); } catch (err) { setError(getErrorMessage(err)); } };
  const rename = (kind, item) => {
    const name = window.prompt('New name', item.name);
    if (!name || name.trim() === item.name) return;
    run(() => (kind === 'contact' ? ledger.saveContact({ name: name.trim() }, item.id) : ledger.saveCategory({ name: name.trim() }, item.id)));
  };
  const remove = (label, fn) => { if (window.confirm(`Delete ${label}? Entries keep their amounts but lose this link.`)) run(fn); };
  const mains = lists.categories.filter((c) => !c.parent);
  const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px dashed ${T.border}`, fontSize: 13 };

  return (
    <FormModal open={open} onClose={onClose} title="Categories, contacts & tags" onSubmit={onClose} submitLabel="Done" width={620}>
      <ErrorBox message={error} />
      <Segmented value={tab} onChange={setTab} options={[['categories', 'Categories'], ['contacts', 'Contacts'], ['tags', 'Tags']]} />
      {tab === 'categories' && (
        <div>
          <Btn variant="outline" onClick={() => { const name = window.prompt('Category name'); if (name?.trim()) run(() => ledger.saveCategory({ name: name.trim() })); }}><Icon name="plus" size={14} /> Category</Btn>
          {mains.length === 0 && <Muted style={{ marginTop: 10 }}>No categories yet.</Muted>}
          {mains.map((c) => (
            <div key={c.id} style={{ marginTop: 10, border: `1px solid ${T.border}`, borderRadius: 10, padding: '4px 12px' }}>
              <div style={row}>
                <strong style={{ color: T.navy }}>{c.name}</strong>
                <span style={{ display: 'flex', gap: 10 }}>
                  <LinkBtn onClick={() => { const name = window.prompt(`Sub-category of ${c.name}`); if (name?.trim()) run(() => ledger.saveCategory({ name: name.trim(), parent: c.id })); }}>+ Sub</LinkBtn>
                  <LinkBtn onClick={() => rename('category', c)}>Rename</LinkBtn>
                  <LinkBtn danger onClick={() => remove(`${c.name} and its sub-categories`, () => ledger.removeCategory(c.id))}>Delete</LinkBtn>
                </span>
              </div>
              {lists.categories.filter((s) => s.parent === c.id).map((s) => (
                <div key={s.id} style={{ ...row, paddingLeft: 16 }}>
                  <span>↳ {s.name}</span>
                  <span style={{ display: 'flex', gap: 10 }}>
                    <LinkBtn onClick={() => rename('category', s)}>Rename</LinkBtn>
                    <LinkBtn danger onClick={() => remove(s.name, () => ledger.removeCategory(s.id))}>Delete</LinkBtn>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {tab === 'contacts' && (
        <div>
          <Btn variant="outline" onClick={() => { const name = window.prompt('Contact name'); if (!name?.trim()) return; const phone = window.prompt('Phone (optional)') || ''; run(() => ledger.saveContact({ name: name.trim(), phone: phone.trim() })); }}><Icon name="plus" size={14} /> Contact</Btn>
          {lists.contacts.length === 0 && <Muted style={{ marginTop: 10 }}>No contacts yet. They are only visible to you.</Muted>}
          {lists.contacts.map((c) => (
            <div key={c.id} style={row}>
              <span><strong style={{ color: T.navy }}>{c.name}</strong>{c.phone && <Muted>{c.phone}</Muted>}</span>
              <span style={{ display: 'flex', gap: 10 }}>
                <LinkBtn onClick={() => { const phone = window.prompt(`Phone for ${c.name}`, c.phone || ''); if (phone !== null) run(() => ledger.saveContact({ phone: phone.trim() }, c.id)); }}>Phone</LinkBtn>
                <LinkBtn onClick={() => rename('contact', c)}>Rename</LinkBtn>
                <LinkBtn danger onClick={() => remove(c.name, () => ledger.removeContact(c.id))}>Delete</LinkBtn>
              </span>
            </div>
          ))}
        </div>
      )}
      {tab === 'tags' && (
        <div>
          <Muted>Tags are created when you type them on an entry.</Muted>
          {lists.tags.length === 0 && <Muted style={{ marginTop: 10 }}>No tags yet.</Muted>}
          {lists.tags.map((t) => (
            <div key={t.id} style={row}>
              <span>#{t.name} <Muted style={{ display: 'inline' }}>· {t.entries} entr{t.entries === 1 ? 'y' : 'ies'}</Muted></span>
              <LinkBtn danger onClick={() => remove(`#${t.name}`, () => ledger.removeTag(t.id))}>Delete</LinkBtn>
            </div>
          ))}
        </div>
      )}
    </FormModal>
  );
}

/* ── Page ── */

function Total({ label, value, tone, sub }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${tone}` }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: T.slateLight, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone === T.navy ? T.navy : tone, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.slateLight, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const emptyFilters = { period: 'this_month', from: '', to: '', type: '', category: '', contact: '', tag: '', search: '', min: '', max: '', receipts: false };

export function ExpensePage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [search, setSearch] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [view, setView] = useState('ledger');
  const [lists, setLists] = useState({ categories: [], contacts: [], tags: [] });
  const [rows, setRows] = useState([]);
  const [next, setNext] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { type } | { entry }
  const [manage, setManage] = useState(false);
  const [toast, setToast] = useState('');
  const setFilter = (k) => (v) => setFilters((x) => ({ ...x, [k]: v }));

  // Debounce the search box.
  useEffect(() => { const t = setTimeout(() => setFilters((x) => ({ ...x, search })), 300); return () => clearTimeout(t); }, [search]);

  const params = useMemo(() => {
    const [from, to] = filters.period === 'custom' ? [filters.from, filters.to] : periodRange(filters.period);
    return {
      date_from: from, date_to: to, type: filters.type, category: filters.category, contact: filters.contact, tag: filters.tag,
      search: filters.search, min_amount: filters.min, max_amount: filters.max, has_files: filters.receipts ? 'true' : '',
    };
  }, [filters]);

  const loadLists = async () => {
    const [categories, contacts, tags] = await Promise.all([ledger.categories(), ledger.contacts(), ledger.tags()]);
    setLists({ categories, contacts, tags });
  };
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [page, totals] = await Promise.all([ledger.list({ ...params, page_size: 50 }), ledger.summary(params)]);
      setRows(normalizeList(page)); setNext(page.next || null); setSummary(totals);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  const loadMore = async () => {
    if (!next) return;
    try {
      const url = new URL(next);
      const page = await apiRequest(`${url.pathname.replace(/^.*?\/api/, '')}${url.search}`);
      setRows((r) => [...r, ...normalizeList(page)]); setNext(page.next || null);
    } catch (err) { setError(getErrorMessage(err)); }
  };

  useEffect(() => { loadLists().catch((err) => setError(getErrorMessage(err))); }, []);
  useEffect(() => { void load(); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (row) => {
    if (!window.confirm(`Delete ${rupees(row.amount)} ${row.transaction_type} on ${prettyDate(row.date)}?`)) return;
    try { await ledger.remove(row.id); setToast('Entry deleted'); await Promise.all([load(), loadLists()]); }
    catch (err) { setError(getErrorMessage(err)); }
  };

  const mains = lists.categories.filter((c) => !c.parent);
  const categoryOptions = mains.flatMap((c) => [[String(c.id), c.name], ...lists.categories.filter((s) => s.parent === c.id).map((s) => [String(s.id), `   ↳ ${s.name}`])]);
  const activeCount = ['type', 'category', 'contact', 'tag', 'search', 'min', 'max'].filter((k) => filters[k]).length + (filters.receipts ? 1 : 0);
  const net = Number(summary?.net || 0);
  const periodLabel = (PERIODS.find(([v]) => v === filters.period) || [])[1];

  return (
    <div>
      <PageHeader
        title="Expense Ledger"
        sub="Every rupee given and received, with categories, people and tags."
        action={<>
          <Btn variant="outline" onClick={() => setManage(true)}><Icon name="settings" size={14} /> Categories & contacts</Btn>
          <Btn variant="danger" onClick={() => setModal({ type: 'given' })}><Icon name="arrowRight" size={14} /> Given</Btn>
          <Btn variant="primary" onClick={() => setModal({ type: 'received' })} style={{ background: T.success, borderColor: T.success }}><Icon name="arrowLeft" size={14} /> Received</Btn>
        </>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 14 }}>
        <Total label="Given" value={rupees(summary?.given)} tone={T.error} sub={periodLabel} />
        <Total label="Received" value={rupees(summary?.received)} tone={T.success} sub={periodLabel} />
        <Total label="Net" value={`${net < 0 ? '−' : ''}${rupees(Math.abs(net))}`} tone={net < 0 ? T.error : T.success} sub="Received − Given" />
        <Total label="Entries" value={summary?.count ?? '—'} tone={T.navy} sub={activeCount ? `${activeCount} filter${activeCount > 1 ? 's' : ''} on` : 'No filters'} />
      </div>

      <Card style={{ marginBottom: 14, padding: 14 }}>
        <FilterChips options={PERIODS} active={filters.period} onChange={setFilter('period')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginTop: -6 }}>
          {filters.period === 'custom' && <>
            <TextIn label="From" type="date" value={filters.from} onChange={setFilter('from')} />
            <TextIn label="To" type="date" value={filters.to} onChange={setFilter('to')} />
          </>}
          <Field label="Search"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Description, notes, person…" style={inputStyle} /></Field>
          <Pick label="Type" value={filters.type} onChange={setFilter('type')} placeholder="Given & received" options={[['given', 'Given only'], ['received', 'Received only']]} />
          <Pick label="Category" value={filters.category} onChange={setFilter('category')} placeholder="All categories" options={categoryOptions} />
          <Pick label="Contact" value={filters.contact} onChange={setFilter('contact')} placeholder="Everyone" options={lists.contacts.map((c) => [String(c.id), c.name])} />
          <Pick label="Tag" value={filters.tag} onChange={setFilter('tag')} placeholder="Any tag" options={lists.tags.map((t) => [String(t.id), `#${t.name}`])} />
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <LinkBtn onClick={() => setShowMore((v) => !v)}>{showMore ? '− Fewer filters' : '+ Amount range, receipts'}</LinkBtn>
          {activeCount > 0 && <LinkBtn danger onClick={() => { setSearch(''); setFilters((x) => ({ ...emptyFilters, period: x.period, from: x.from, to: x.to })); }}>Clear filters</LinkBtn>}
        </div>
        {showMore && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginTop: 10, alignItems: 'end' }}>
            <MoneyIn label="Min amount (₹)" value={filters.min} onChange={setFilter('min')} />
            <MoneyIn label="Max amount (₹)" value={filters.max} onChange={setFilter('max')} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: T.navy, paddingBottom: 10 }}>
              <input type="checkbox" checked={filters.receipts} onChange={(e) => setFilter('receipts')(e.target.checked)} /> With receipts only
            </label>
          </div>
        )}
      </Card>

      <ErrorBox message={error} onRetry={load} />

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <Segmented value={view} onChange={setView} options={[['ledger', 'Ledger'], ['contacts', 'By contact'], ['categories', 'By category']]} />
          {view === 'ledger' && <Muted>{loading ? 'Loading…' : `${rows.length} of ${summary?.count ?? rows.length} entries · balance runs oldest → newest`}</Muted>}
        </div>

        {view === 'ledger' && (loading && !rows.length ? <Loading /> : rows.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: T.slateLight }}>
            No entries {activeCount ? 'match these filters' : 'in this period'}.
            <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Btn variant="danger" onClick={() => setModal({ type: 'given' })}>+ Given</Btn>
              <Btn variant="primary" onClick={() => setModal({ type: 'received' })} style={{ background: T.success, borderColor: T.success }}>+ Received</Btn>
            </div>
          </div>
        ) : (
          <>
            <TableWrapper>
              <thead><tr><Th>Date</Th><Th>Description</Th><Th>Category</Th><Th>Contact</Th><Th>Given</Th><Th>Received</Th><Th>Balance</Th><Th /></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const bal = Number(r.balance || 0);
                  return (
                    <tr key={r.id}>
                      <Td alt={i % 2}><span style={{ whiteSpace: 'nowrap' }}>{prettyDate(r.date)}</span></Td>
                      <Td alt={i % 2}>
                        <div style={{ fontWeight: 600, color: T.navy }}>{r.name || <span style={{ color: T.slateLight, fontWeight: 400 }}>—</span>}{r.files?.length > 0 && <span title={`${r.files.length} receipt(s)`} style={{ marginLeft: 6, color: T.slateLight }}><Icon name="file" size={12} /></span>}</div>
                        {(r.tag_list || []).length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>{r.tag_list.map((t) => <button key={t.id} type="button" onClick={() => setFilter('tag')(String(t.id))} style={{ border: 0, background: T.navyTint, color: T.navy, borderRadius: 999, padding: '1px 7px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>#{t.name}</button>)}</div>}
                        {r.notes && <Muted>{r.notes}</Muted>}
                      </Td>
                      <Td alt={i % 2}>{r.category_name ? <>{r.category_name}{r.sub_category_name && <Muted>↳ {r.sub_category_name}</Muted>}</> : <span style={{ color: T.slateLight }}>—</span>}</Td>
                      <Td alt={i % 2}>{r.contact_name || r.related_user_name || <span style={{ color: T.slateLight }}>—</span>}</Td>
                      <Td alt={i % 2}>{r.transaction_type === 'given' ? <strong style={{ color: T.error }}>{rupees(r.amount)}</strong> : ''}</Td>
                      <Td alt={i % 2}>{r.transaction_type === 'received' ? <strong style={{ color: T.success }}>{rupees(r.amount)}</strong> : ''}</Td>
                      <Td alt={i % 2}><span style={{ fontWeight: 700, color: bal < 0 ? T.error : T.navy, whiteSpace: 'nowrap' }}>{bal < 0 ? '−' : ''}{rupees(Math.abs(bal))}</span></Td>
                      <Td alt={i % 2}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn variant="outline" style={{ padding: '5px 8px' }} onClick={() => setModal({ entry: r })}><Icon name="edit" size={13} /></Btn>
                          <Btn variant="outline" style={{ padding: '5px 8px', color: T.error }} onClick={() => remove(r)}><Icon name="trash" size={13} /></Btn>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrapper>
            {next && <div style={{ textAlign: 'center', marginTop: 12 }}><Btn variant="outline" onClick={loadMore}>Load more</Btn></div>}
          </>
        ))}

        {view !== 'ledger' && (
          !summary ? <Loading /> : (
            <TableWrapper>
              <thead><tr><Th>{view === 'contacts' ? 'Contact' : 'Category'}</Th><Th>Entries</Th><Th>Given</Th><Th>Received</Th><Th>Net</Th><Th /></tr></thead>
              <tbody>
                {(view === 'contacts' ? summary.by_contact : summary.by_category).map((g, i) => {
                  const n = Number(g.net);
                  return (
                    <tr key={g.id ?? 'none'}>
                      <Td alt={i % 2}><strong style={{ color: g.id ? T.navy : T.slateLight }}>{g.name || (view === 'contacts' ? 'No contact' : 'No category')}</strong></Td>
                      <Td alt={i % 2}>{g.count}</Td>
                      <Td alt={i % 2}><span style={{ color: T.error }}>{rupees(g.given)}</span></Td>
                      <Td alt={i % 2}><span style={{ color: T.success }}>{rupees(g.received)}</span></Td>
                      <Td alt={i % 2}><strong style={{ color: n < 0 ? T.error : T.success }}>{n < 0 ? '−' : ''}{rupees(Math.abs(n))}</strong>{view === 'contacts' && g.id && n !== 0 && <Muted>{n < 0 ? 'you gave more' : 'you got more'}</Muted>}</Td>
                      <Td alt={i % 2}>{g.id && <LinkBtn onClick={() => { setFilter(view === 'contacts' ? 'contact' : 'category')(String(g.id)); setView('ledger'); }}>View entries ›</LinkBtn>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrapper>
          )
        )}
      </Card>

      <EntryModal open={!!modal} entry={modal?.entry} initialType={modal?.type || 'given'} lists={lists} onClose={() => setModal(null)} onListsChanged={loadLists}
        onSaved={(e) => { setModal(null); setToast(`Saved ${rupees(e.amount)} ${e.transaction_type}`); load(); loadLists(); }} />
      <ManageModal open={manage} lists={lists} onClose={() => setManage(false)} onChanged={async () => { await loadLists(); await load(); }} />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

export default ExpensePage;
