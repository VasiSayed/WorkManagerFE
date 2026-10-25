import { useEffect, useMemo, useRef, useState } from 'react';
import { api, endpoints, getErrorMessage, normalizeList, resolveAssetUrl } from '../api/client';
import { Badge, Btn, Card, PageHeader, TableWrapper, Td, Th } from '../components/UI';
import { Icon } from '../components/Icons';
import VoiceTextInput from '../components/VoiceTextInput';
import { T } from '../theme';

const today = () => { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; };
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const initialForm = () => ({
  id: null,
  mode: 'standalone',
  transaction_type: 'given',
  amount: '',
  name: '',
  date: today(),
  category: '',
  related_user: '',
  uploaded_files: [],
  existing_files: [],
});

function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`, gap: 4, padding: 4, background: T.rowAlt, border: `1px solid ${T.border}`, borderRadius: 10 }}>
      {options.map(([key, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)} style={{ padding: '9px 10px', border: 0, borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700, background: value === key ? T.navy : 'transparent', color: value === key ? T.white : T.slateLight }}>{label}</button>
      ))}
    </div>
  );
}

function FieldLabel({ children, required = false }) {
  return <label style={{ fontSize: 12, fontWeight: 700, color: T.slate }}>{children}{required && <span style={{ color: T.error }}> *</span>}</label>;
}

function SelectField({ label, value, onChange, options, disabled = false }) {
  return <div style={{ display: 'grid', gap: 5 }}><FieldLabel>{label}</FieldLabel><select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: `1px solid ${T.border}`, background: disabled ? T.rowAlt : T.white, color: T.slate, fontFamily: 'inherit' }}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
}

function FilePicker({ files, onChange }) {
  const inputRef = useRef(null);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <FieldLabel>Documents (optional, multiple)</FieldLabel>
      <button type="button" onClick={() => inputRef.current?.click()} style={{ border: `1px dashed ${T.border}`, background: T.rowAlt, borderRadius: 10, padding: '18px 14px', cursor: 'pointer', color: T.navy, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <Icon name="upload" size={18} /> Choose one or more files
      </button>
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => onChange(Array.from(e.target.files || []))} />
      {files.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{files.map((file, idx) => <span key={`${file.name}-${file.size}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 9px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.white, fontSize: 11, color: T.navy }}><Icon name="file" size={13}/>{file.name}<button type="button" onClick={() => onChange(files.filter((_, i) => i !== idx))} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: T.slateLight }}>×</button></span>)}</div>}
    </div>
  );
}

function Stat({ label, value, tone, sub }) {
  return <Card style={{ padding: 16, borderTop: `3px solid ${tone}` }}><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: T.slateLight, fontWeight: 800 }}>{label}</div><div style={{ fontSize: 24, fontWeight: 800, color: T.navy, marginTop: 7 }}>{money(value)}</div>{sub && <div style={{ fontSize: 11, color: T.slateLight, marginTop: 5 }}>{sub}</div>}</Card>;
}

export function ExpensePage() {
  const [form, setForm] = useState(initialForm());
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ given: 0, received: 0, net: 0 });
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [expensesPayload, categoryPayload, usersPayload, summaryPayload] = await Promise.all([
        api.list(endpoints.expenses, { ordering: '-date' }),
        api.list(endpoints.expenseCategories, { is_active: 'true', ordering: 'name' }),
        api.list(endpoints.expenseUsers),
        api.get(`${endpoints.expenses}summary/`),
      ]);
      setItems(normalizeList(expensesPayload));
      setCategories(normalizeList(categoryPayload));
      setUsers(normalizeList(usersPayload));
      setSummary(summaryPayload || { given: 0, received: 0, net: 0 });
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const userOptions = useMemo(() => [['', 'No related user'], ...users.map((u) => [String(u.id), u.display_name || u.full_name || u.email])], [users]);
  const categoryOptions = useMemo(() => [['', 'Select category'], ...categories.map((c) => [String(c.id), c.name])], [categories]);

  const reset = () => setForm(initialForm());

  const save = async () => {
    if (!String(form.amount).trim() || Number(form.amount) <= 0) {
      setError('Amount is required and must be greater than zero.');
      return;
    }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('transaction_type', form.transaction_type);
      fd.append('amount', String(form.amount));
      fd.append('name', form.name.trim());
      if (form.date) fd.append('date', form.date);
      fd.append('category', form.mode === 'category' ? form.category : '');
      fd.append('related_user', form.related_user || '');
      form.uploaded_files.forEach((file) => fd.append('uploaded_files', file));
      if (form.id) await api.uploadUpdate(`${endpoints.expenses}${form.id}/`, fd);
      else await api.upload(endpoints.expenses, fd);
      reset();
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const edit = (item) => setForm({
    id: item.id,
    mode: item.category ? 'category' : 'standalone',
    transaction_type: item.transaction_type,
    amount: item.amount,
    name: item.name || '',
    date: item.date || today(),
    category: item.category ? String(item.category) : '',
    related_user: item.related_user ? String(item.related_user) : '',
    uploaded_files: [],
    existing_files: item.files || [],
  });

  const remove = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await api.remove(`${endpoints.expenses}${id}/`); if (form.id === id) reset(); await load(); }
    catch (e) { setError(getErrorMessage(e)); }
  };

  const deleteExistingFile = async (fileId) => {
    if (!form.id || !window.confirm('Remove this attachment?')) return;
    try {
      await api.remove(`${endpoints.expenses}${form.id}/files/${fileId}/`);
      setForm((f) => ({ ...f, existing_files: f.existing_files.filter((x) => x.id !== fileId) }));
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const created = await api.create(endpoints.expenseCategories, { name, is_active: true });
      setNewCategory('');
      await load();
      setForm((f) => ({ ...f, mode: 'category', category: String(created.id) }));
    } catch (e) { setError(getErrorMessage(e)); }
  };

  return (
    <div>
      <PageHeader title="Expenses" sub="Simple money movement: Given, Received, and Net = Received − Given." />
      {error && <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, color: T.error, background: T.errorBg, border: `1px solid #FECACA`, fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Total Given" value={summary.given} tone={T.error} sub="Money paid / given" />
        <Stat label="Total Received" value={summary.received} tone={T.success} sub="Money received" />
        <Stat label="Net" value={summary.net} tone={T.info} sub="Received − Given" />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div><h2 style={{ color: T.navy, fontSize: 16 }}>{form.id ? 'Edit Expense' : 'Add Expense'}</h2><div style={{ fontSize: 11, color: T.slateLight, marginTop: 3 }}>Only Amount is mandatory. Everything else is optional.</div></div>
          {form.id && <Btn variant="outline" onClick={reset}>Cancel edit</Btn>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
          <div style={{ display: 'grid', gap: 5 }}><FieldLabel>Entry Mode</FieldLabel><Segmented value={form.mode} onChange={(mode) => setForm((f) => ({ ...f, mode, category: mode === 'standalone' ? '' : f.category }))} options={[[ 'standalone','Standalone' ],[ 'category','Category' ]]}/></div>
          <div style={{ display: 'grid', gap: 5 }}><FieldLabel>Transaction Type</FieldLabel><Segmented value={form.transaction_type} onChange={(transaction_type) => setForm((f) => ({ ...f, transaction_type }))} options={[[ 'given','Given' ],[ 'received','Received' ]]}/></div>

          <div style={{ display: 'grid', gap: 5 }}><FieldLabel required>Amount</FieldLabel><div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 12, top: 9, color: T.slate, fontWeight: 700 }}>₹</span><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '9px 12px 9px 30px', border: `1px solid ${T.border}`, borderRadius: 8, outline: 'none', fontFamily: 'inherit' }}/></div></div>
          <VoiceTextInput value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
          <div style={{ display: 'grid', gap: 5 }}><FieldLabel>Date</FieldLabel><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={{ width: '100%', padding: '9px 11px', border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: 'inherit' }}/></div>
          <SelectField label="Related User" value={form.related_user} onChange={(related_user) => setForm((f) => ({ ...f, related_user }))} options={userOptions}/>

          {form.mode === 'category' && <div style={{ display: 'grid', gap: 8 }}><SelectField label="Expense Category" value={form.category} onChange={(category) => setForm((f) => ({ ...f, category }))} options={categoryOptions}/><div style={{ display: 'flex', gap: 6 }}><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addCategory(); } }} style={{ minWidth: 0, flex: 1, padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: 8 }}/><Btn variant="outline" onClick={addCategory}><Icon name="plus" size={14}/> Add</Btn></div></div>}

          <div style={{ gridColumn: '1 / -1' }}><FilePicker files={form.uploaded_files} onChange={(uploaded_files) => setForm((f) => ({ ...f, uploaded_files }))}/></div>
          {form.existing_files.length > 0 && <div style={{ gridColumn: '1 / -1' }}><FieldLabel>Existing attachments</FieldLabel><div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 7 }}>{form.existing_files.map((file) => <span key={file.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 8px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }}><a href={resolveAssetUrl(file.file_url || file.file)} target="_blank" rel="noreferrer" style={{ color: T.navy, fontWeight: 700 }}>{file.original_name || 'Attachment'}</a><button type="button" onClick={() => deleteExistingFile(file.id)} style={{ border: 0, background: 'transparent', color: T.error, cursor: 'pointer' }}>×</button></span>)}</div></div>}
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}><Btn variant="gold" onClick={save} disabled={saving}>{saving ? 'Saving…' : form.id ? 'Update Expense' : 'Save Expense'}</Btn><Btn variant="outline" onClick={reset}>Clear</Btn></div>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><h2 style={{ color: T.navy, fontSize: 16 }}>Expense History</h2><div style={{ fontSize: 11, color: T.slateLight, marginTop: 3 }}>{loading ? 'Loading…' : `${items.length} record${items.length === 1 ? '' : 's'}`}</div></div><Btn variant="outline" onClick={load}>Refresh</Btn></div>
        {!loading && items.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: T.slateLight }}>No expenses yet.</div> : <TableWrapper><thead><tr><Th>Type</Th><Th>Amount</Th><Th>Name</Th><Th>Category</Th><Th>User</Th><Th>Date</Th><Th>Docs</Th><Th>Actions</Th></tr></thead><tbody>{items.map((item, i) => <tr key={item.id}><Td alt={i%2}><Badge label={item.transaction_type === 'received' ? 'Received' : 'Given'} color={item.transaction_type === 'received' ? 'success' : 'error'}/></Td><Td alt={i%2}><strong>{money(item.amount)}</strong></Td><Td alt={i%2}>{item.name || '—'}</Td><Td alt={i%2}>{item.category_name || 'Standalone'}</Td><Td alt={i%2}>{item.related_user_name || '—'}</Td><Td alt={i%2}>{item.date}</Td><Td alt={i%2}>{item.files?.length || 0}</Td><Td alt={i%2}><div style={{ display: 'flex', gap: 6 }}><Btn variant="outline" style={{ padding: '5px 8px' }} onClick={() => edit(item)}><Icon name="edit" size={13}/></Btn><Btn variant="danger" style={{ padding: '5px 8px' }} onClick={() => remove(item.id)}><Icon name="trash" size={13}/></Btn></div></Td></tr>)}</tbody></TableWrapper>}
      </Card>
    </div>
  );
}

export default ExpensePage;
