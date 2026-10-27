import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { Btn, Card, PageHeader, TableWrapper, Td, Th, Toast } from '../../components/UI';
import { Icon } from '../../components/Icons';
import { T } from '../../theme';
import {
  CardTitle, Check, currentMonth, Empty, ErrorBox, FilePick, FormGrid, FormModal, isPositive, KV, LinkBtn, Loading, localDate,
  MoneyIn, monthLabel, MonthBar, Muted, openFile, parseAmount, Pick, pm, prettyDate, PropertyFilter, rupees, runAction,
  Segmented, StatusPill, TextArea, TextIn, titleCase, Toolbar, useLoad,
} from './shared';

const SPLITS = [['equal', 'Equal split'], ['meter', 'By units used'], ['manual', 'Manual amount']];
const SPLIT_HELP = {
  equal: 'The bill is divided equally between the tenants of these units.',
  meter: "Enter how many units each unit used (from its sub-meter). A vacant unit's share is paid by you.",
  manual: "Type each tenant's amount. Anything left over is recorded as paid by you.",
};

/* ── Meter: which units does it supply? ── */

function MeterModal({ open, meter, properties, defaultProperty, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const units = useLoad(() => (open && f.property ? pm.units({ property: f.property }) : Promise.resolve([])), [open, f.property]);

  useEffect(() => {
    if (!open) return;
    setError('');
    setF(meter
      ? { property: String(meter.property), name: meter.name, meter_number: meter.meter_number, units: meter.units || [], default_split: meter.default_split || 'equal', notes: meter.notes, is_active: meter.is_active }
      : { property: defaultProperty || (properties.length === 1 ? String(properties[0].id) : ''), name: '', meter_number: '', units: [], default_split: 'equal', notes: '', is_active: true });
  }, [open, meter, defaultProperty, properties]);

  const toggleUnit = (id) => setF((x) => ({ ...x, units: x.units.includes(id) ? x.units.filter((u) => u !== id) : [...x.units, id] }));
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const meterType = f.units.length > 1 ? 'shared' : 'individual';
      onSaved(await pm.saveMeter({ ...f, property: Number(f.property), meter_type: meterType }, meter?.id));
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <FormModal open={open} onClose={onClose} title={meter ? `Edit ${meter.name}` : 'New electricity meter'} subtitle="Tick the units this meter supplies" onSubmit={submit} busy={busy} error={error}
      disabled={!f.property || !f.name?.trim() || !f.meter_number?.trim()}>
      <FormGrid>
        <Pick label="Property" required value={f.property} onChange={(v) => setF((x) => ({ ...x, property: v, units: [] }))} placeholder="Choose…" options={properties.map((p) => [String(p.id), p.name])} />
        <TextIn label="Meter name" required value={f.name} onChange={set('name')} placeholder="e.g. Ground floor meter" />
        <TextIn label="Meter / consumer number" required value={f.meter_number} onChange={set('meter_number')} />
      </FormGrid>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.slate, marginBottom: 4 }}>Shared by units</div>
        {!f.property ? <Muted>Choose a property first.</Muted> : (units.data || []).length === 0 ? <Muted>No units in this property yet.</Muted> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 6 }}>
            {units.data.map((u) => {
              const on = (f.units || []).includes(u.id);
              return (
                <div key={u.id} style={{ border: `1px solid ${on ? T.gold : T.border}`, background: on ? T.goldLight : T.white, borderRadius: 8, padding: '2px 10px' }}>
                  <Check label={u.name} hint={u.current_agreement ? u.current_agreement.tenant_name : 'Vacant'} checked={on} onChange={() => toggleUnit(u.id)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.slate, marginBottom: 5 }}>Usual way to split the bill</div>
        <Segmented value={f.default_split} onChange={set('default_split')} options={SPLITS} />
        <Muted style={{ marginTop: 5 }}>{SPLIT_HELP[f.default_split]} You can change it each month.</Muted>
      </div>
      {meter && <Check label="Meter in use" checked={f.is_active} onChange={set('is_active')} />}
      <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
    </FormModal>
  );
}

/* ── Monthly bill: amount + split → added to each tenant's rent for the month ── */

export function MonthlyBillModal({ meter, initialMonth, onClose, onSaved }) {
  const open = !!meter;
  const [month, setMonth] = useState(initialMonth || currentMonth());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('equal');
  const [inputs, setInputs] = useState({});
  const [more, setMore] = useState(false);
  const [billDate, setBillDate] = useState(localDate());
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setup = useLoad(() => (open ? pm.meterSplitSetup(meter.id, month) : Promise.resolve(null)), [open, meter?.id, month]);

  useEffect(() => {
    if (!open) return;
    setMonth(initialMonth || currentMonth());
    setAmount(''); setMethod(meter.default_split || 'equal'); setInputs({}); setMore(false);
    setBillDate(localDate()); setDueDate(''); setFile(null); setNotes(''); setPreview(null); setError('');
  }, [open, meter, initialMonth]);

  const rows = setup.data?.units || [];
  const parsed = parseAmount(amount);
  const key = (row) => String(row.unit_id);
  const body = (extra = {}) => ({
    month,
    amount: parsed,
    method,
    lines: Object.fromEntries(rows.map((r) => [key(r), method === 'meter' ? { units: inputs[key(r)] ?? '' } : method === 'manual' ? { amount: inputs[key(r)] ?? '' } : {}])),
    ...extra,
  });
  const inputsReady = method === 'equal'
    || (method === 'meter' && rows.every((r) => String(inputs[key(r)] ?? '').trim() !== ''))
    || (method === 'manual' && rows.filter((r) => r.agreement_id).every((r) => String(inputs[key(r)] ?? '').trim() !== ''));

  // Live preview of each tenant's share.
  useEffect(() => {
    setPreview(null); setPreviewError('');
    if (!open || !parsed || !inputsReady || !rows.length || setup.data?.existing_bill) return undefined;
    const timer = setTimeout(() => {
      pm.meterBill(meter.id, body({ preview: true })).then(setPreview).catch((err) => setPreviewError(getErrorMessage(err)));
    }, 350);
    return () => clearTimeout(timer);
  }, [open, parsed, method, JSON.stringify(inputs), month, rows.length, inputsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareFor = (row) => preview?.units?.find((u) => u.unit_id === row.unit_id);
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const res = await pm.meterBill(meter.id, body({ bill_date: billDate || undefined, due_date: dueDate || null, notes }), file);
      onSaved(res);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const existing = setup.data?.existing_bill;

  return (
    <FormModal open={open} onClose={onClose} title={`Electricity bill · ${meter?.name || ''}`} subtitle="Each tenant's share is added to their rent for the month"
      onSubmit={submit} submitLabel={preview ? `Add to rent (${rupees(preview.total)})` : 'Add to rent'} busy={busy} error={error} disabled={!preview || !!existing} width={680}>
      <FormGrid min={200}>
        <TextIn label="Bill for month" type="month" value={month} onChange={(v) => v && setMonth(v)} />
        <MoneyIn label="Total bill amount (₹)" required value={amount} onChange={setAmount} autoFocus />
      </FormGrid>
      {existing ? (
        <div style={{ padding: '10px 12px', borderRadius: 8, background: T.warningBg, color: T.warning, fontSize: 12 }}>
          {meter?.name} is already billed for {monthLabel(month)} ({rupees(existing.amount)}). <Link to={`/rental/electricity/bills/${existing.id}`} style={{ fontWeight: 700, color: T.goldDark }}>Open that bill</Link> to correct it, or pick another month.
        </div>
      ) : (
        <>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.slate, marginBottom: 5 }}>How to split</div>
            <Segmented value={method} onChange={setMethod} options={SPLITS} />
            <Muted style={{ marginTop: 5 }}>{SPLIT_HELP[method]}</Muted>
          </div>
          {setup.loading && !setup.data ? <Loading /> : rows.length === 0 ? <Muted>This meter has no units linked. Edit the meter and tick its units.</Muted> : (
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {rows.map((r, i) => {
                const share = shareFor(r);
                const needsInput = method === 'meter' || (method === 'manual' && r.agreement_id);
                return (
                  <div key={r.unit_id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(90px,.8fr) minmax(90px,.7fr)', gap: 10, alignItems: 'center', padding: '9px 12px', background: i % 2 ? T.rowAlt : T.white }}>
                    <div><strong style={{ color: T.navy }}>{r.unit_name}</strong><Muted>{r.tenant_name || 'Vacant — you pay'}</Muted></div>
                    <div>{needsInput ? (
                      <input inputMode="decimal" aria-label={`${method === 'meter' ? 'Units used' : 'Amount'} for ${r.unit_name}`} placeholder={method === 'meter' ? 'units' : '₹'}
                        value={inputs[key(r)] ?? ''} onChange={(e) => setInputs((s) => ({ ...s, [key(r)]: e.target.value }))}
                        style={{ width: '100%', padding: '7px 9px', border: `1px solid ${T.border}`, borderRadius: 8, textAlign: 'right', fontFamily: 'inherit' }} />
                    ) : <span style={{ color: T.slateLight, fontSize: 12 }}>{method === 'equal' ? (r.agreement_id ? 'equal share' : '—') : '—'}</span>}</div>
                    <div style={{ textAlign: 'right', fontWeight: 800, color: r.agreement_id ? T.navy : T.warning }}>{share ? rupees(share.amount) : '—'}</div>
                  </div>
                );
              })}
              {preview && (
                <div style={{ padding: '9px 12px', borderTop: `1px solid ${T.border}`, fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span>Added to rent: <strong>{rupees(Number(preview.total) - Number(preview.owner_pays))}</strong></span>
                  {isPositive(preview.owner_pays) && <span style={{ color: T.warning }}>Paid by you: <strong>{rupees(preview.owner_pays)}</strong></span>}
                </div>
              )}
            </div>
          )}
          {previewError && <div style={{ fontSize: 12, color: T.error }}>{previewError}</div>}
          <LinkBtn onClick={() => setMore((v) => !v)}>{more ? '− Hide bill details' : '+ Bill date, due date, photo of bill (optional)'}</LinkBtn>
          {more && (
            <FormGrid min={180}>
              <TextIn label="Bill date" type="date" value={billDate} onChange={setBillDate} />
              <TextIn label="Due date for tenants" type="date" value={dueDate} onChange={setDueDate} />
              <FilePick label="Bill photo / PDF" file={file} onChange={setFile} />
              <TextIn label="Notes" value={notes} onChange={setNotes} />
            </FormGrid>
          )}
        </>
      )}
    </FormModal>
  );
}

function MeterCard({ meter, month, onBill, onEdit }) {
  const billedThisMonth = meter.last_bill && String(meter.last_bill.period).slice(0, 7) === month;
  return (
    <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, opacity: meter.is_active ? 1 : 0.6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
        <div>
          <Link to={`/rental/electricity/meters/${meter.id}`} style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>{meter.name}</Link>
          <Muted>#{meter.meter_number} · {meter.property_name}</Muted>
        </div>
        <LinkBtn onClick={onEdit}>Edit</LinkBtn>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(meter.unit_details || []).length === 0 ? <span style={{ fontSize: 12, color: T.error }}>No units linked — click Edit</span> : meter.unit_details.map((u) => (
          <span key={u.id} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 999, background: u.tenant_name ? T.navyTint : T.warningBg, color: u.tenant_name ? T.navy : T.warning, fontWeight: 600 }}>
            {u.name} · {u.tenant_name || 'Vacant'}
          </span>
        ))}
      </div>
      <Muted>Split: {(SPLITS.find(([v]) => v === meter.default_split) || SPLITS[0])[1]}{meter.last_bill ? ` · Last bill ${monthLabel(String(meter.last_bill.period).slice(0, 7))}: ${rupees(meter.last_bill.amount)}` : ''}</Muted>
      <div style={{ marginTop: 'auto' }}>
        {billedThisMonth
          ? <Link to={`/rental/electricity/bills/${meter.last_bill.id}`}><Btn variant="outline" style={{ width: '100%', justifyContent: 'center' }}><Icon name="check" size={14} /> {monthLabel(month)} billed · {rupees(meter.last_bill.amount)}</Btn></Link>
          : <Btn variant="gold" style={{ width: '100%', justifyContent: 'center' }} disabled={!meter.is_active || !(meter.unit_details || []).length} onClick={onBill}><Icon name="plus" size={14} /> Add {monthLabel(month)} bill</Btn>}
      </div>
    </Card>
  );
}

export function ElectricityPage() {
  const [propertyId, setPropertyId] = useState('');
  const [month, setMonth] = useState(currentMonth());
  const [meterModal, setMeterModal] = useState(null); // { meter? }
  const [billFor, setBillFor] = useState(null);
  const [toast, setToast] = useState('');
  const properties = useLoad(() => pm.properties(), []);
  const meters = useLoad(() => pm.meters({ property: propertyId }), [propertyId]);
  const bills = useLoad(() => pm.bills({ property: propertyId }), [propertyId]);
  const drafts = (bills.data || []).filter((b) => b.status === 'draft');

  const reload = () => Promise.all([meters.reload(), bills.reload()]);

  return (
    <div>
      <PageHeader
        title="Electricity"
        sub="1. Add a meter and tick the units it supplies.  2. Each month click “Add bill” — the bill is split and added to the tenants' rent."
        action={<Btn variant="gold" onClick={() => setMeterModal({})}><Icon name="plus" size={14} /> Add meter</Btn>}
      />
      <Toolbar>
        <MonthBar month={month} onChange={setMonth} />
        <PropertyFilter properties={properties.data} value={propertyId} onChange={setPropertyId} />
      </Toolbar>
      <ErrorBox message={meters.error || bills.error} />

      {meters.loading && !meters.data ? <Loading /> : (meters.data || []).length === 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <Empty>No meters yet. Click <strong>Add meter</strong>, give it a name and tick the units that share it.</Empty>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, marginBottom: 18 }}>
          {meters.data.map((m) => <MeterCard key={m.id} meter={m} month={month} onBill={() => setBillFor(m)} onEdit={() => setMeterModal({ meter: m })} />)}
        </div>
      )}

      {drafts.length > 0 && (
        <Card style={{ marginBottom: 16, borderLeft: `4px solid ${T.warning}` }}>
          <CardTitle title="Older bills not yet split" sub="Created before meters were linked to units" />
          {drafts.map((b) => <KV key={b.id} label={`${monthLabel(b.period.slice(0, 7))} · ${b.property_name}`} value={<Link to={`/rental/electricity/bills/${b.id}`} style={{ color: T.goldDark, fontWeight: 700 }}>{rupees(b.amount)} — split now ›</Link>} />)}
        </Card>
      )}

      <Card>
        <CardTitle title="Bill history" />
        {(bills.data || []).filter((b) => b.status !== 'draft').length === 0 ? <Empty>No bills yet.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Month</Th><Th>Meter / property</Th><Th>Amount</Th><Th>Split</Th><Th>Paid by you</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {bills.data.filter((b) => b.status !== 'draft').map((b, i) => {
                const meter = (meters.data || []).find((m) => m.id === b.meter);
                return (
                  <tr key={b.id}>
                    <Td alt={i % 2}><strong>{monthLabel(b.period.slice(0, 7))}</strong></Td>
                    <Td alt={i % 2}>{meter ? meter.name : '—'}<Muted>{b.property_name}</Muted></Td>
                    <Td alt={i % 2}>{rupees(b.amount)}</Td>
                    <Td alt={i % 2}>{b.allocation_method ? (SPLITS.find(([v]) => v === b.allocation_method) || [null, titleCase(b.allocation_method)])[1] : '—'}</Td>
                    <Td alt={i % 2}>{isPositive(b.unallocated_amount) ? rupees(b.unallocated_amount) : '—'}</Td>
                    <Td alt={i % 2}><StatusPill status={b.status === 'allocated' ? 'paid' : b.status} label={b.status === 'allocated' ? 'Added to rent' : undefined} /></Td>
                    <Td alt={i % 2}><Link to={`/rental/electricity/bills/${b.id}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>Open ›</Link></Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <MeterModal open={!!meterModal} meter={meterModal?.meter} properties={properties.data || []} defaultProperty={propertyId} onClose={() => setMeterModal(null)}
        onSaved={() => { setMeterModal(null); setToast('Meter saved'); reload(); }} />
      <MonthlyBillModal meter={billFor} initialMonth={month} onClose={() => setBillFor(null)}
        onSaved={(res) => { setBillFor(null); setToast(`Bill added to rent: ${res.split.lines.map((l) => `${l.tenant_name} ${rupees(l.amount)}`).join(', ')}`); reload(); }} />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

export function MeterDetailPage() {
  const { id } = useParams();
  const meterId = Number(id);
  const navigate = useNavigate();
  const meter = useLoad(() => pm.meter(meterId), [meterId]);
  const bills = useLoad(() => pm.meterBills(meterId), [meterId]);
  const properties = useLoad(() => pm.properties(), []);
  const [edit, setEdit] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [toast, setToast] = useState('');
  const m = meter.data;

  if (meter.loading && !m) return <Loading />;
  if (!m) return <ErrorBox message={meter.error || 'Meter not found'} onRetry={meter.reload} />;

  return (
    <div>
      <PageHeader title={`${m.name}`} sub={`Meter #${m.meter_number} · ${m.property_name}`}
        action={<>
          <Btn variant="outline" onClick={() => navigate('/rental/electricity')}><Icon name="arrowLeft" size={14} /> Electricity</Btn>
          <Btn variant="outline" onClick={() => setEdit(true)}><Icon name="edit" size={14} /> Edit</Btn>
          <Btn variant="gold" onClick={() => setBillOpen(true)} disabled={!m.unit_details.length}><Icon name="plus" size={14} /> Add bill</Btn>
        </>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardTitle title="Shared by units" sub="Tenants this month" />
          {m.unit_details.length === 0 ? <Muted>No units linked. Click Edit to tick them.</Muted> : m.unit_details.map((u) => (
            <KV key={u.id} label={u.name} value={u.tenant_name ? <Link to={`/rental/agreements/${u.agreement_id}`} style={{ color: T.navy }}>{u.tenant_name}</Link> : <span style={{ color: T.warning }}>Vacant</span>} />
          ))}
        </Card>
        <Card>
          <CardTitle title="Split" />
          <KV label="Usual split" value={(SPLITS.find(([v]) => v === m.default_split) || SPLITS[0])[1]} />
          <Muted style={{ marginTop: 6 }}>{SPLIT_HELP[m.default_split]}</Muted>
          {m.notes && <Muted style={{ marginTop: 6 }}>{m.notes}</Muted>}
        </Card>
      </div>
      <Card>
        <CardTitle title="Monthly bills" />
        {(bills.data || []).length === 0 ? <Empty>No bills yet.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Month</Th><Th>Amount</Th><Th>Tenants charged</Th><Th>Paid by you</Th><Th /></tr></thead>
            <tbody>
              {bills.data.map((b, i) => (
                <tr key={b.id}>
                  <Td alt={i % 2}><strong>{monthLabel(b.period.slice(0, 7))}</strong>{b.status === 'cancelled' && <Muted>Cancelled</Muted>}</Td>
                  <Td alt={i % 2}>{rupees(b.amount)}</Td>
                  <Td alt={i % 2}>{b.allocations.map((a) => `${a.tenant_name} ${rupees(a.charge?.net_amount ?? a.amount)}`).join(', ') || '—'}</Td>
                  <Td alt={i % 2}>{isPositive(b.unallocated_amount) ? rupees(b.unallocated_amount) : '—'}</Td>
                  <Td alt={i % 2}><Link to={`/rental/electricity/bills/${b.id}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>Open ›</Link></Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>
      <MeterModal open={edit} meter={m} properties={properties.data || []} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); meter.reload(); }} />
      <MonthlyBillModal meter={billOpen ? m : null} onClose={() => setBillOpen(false)}
        onSaved={() => { setBillOpen(false); setToast('Bill added to rent'); meter.reload(); bills.reload(); }} />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

export function BillDetailPage() {
  const { id } = useParams();
  const billId = Number(id);
  const navigate = useNavigate();
  const bill = useLoad(() => pm.bill(billId), [billId]);
  const b = bill.data;
  const isDraft = b?.status === 'draft';
  const candidates = useLoad(() => (isDraft ? pm.billCandidates(billId) : Promise.resolve([])), [billId, isDraft]);
  const [selected, setSelected] = useState([]);
  const [method, setMethod] = useState('equal');
  const [useReadings, setUseReadings] = useState(false);
  const [inputs, setInputs] = useState({});
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Any change to the setup invalidates the previous calculation.
  useEffect(() => setPreview(null), [selected, method, useReadings, inputs]);
  const cands = candidates.data || [];
  const manualTotal = useMemo(() => selected.reduce((s, cid) => s + Number(parseAmount(inputs[cid] || '0') || 0), 0), [selected, inputs]);

  if (bill.loading && !b) return <Loading />;
  if (!b) return <ErrorBox message={bill.error || 'Bill not found'} onRetry={bill.reload} />;

  const toggle = (cid) => setSelected((s) => (s.includes(cid) ? s.filter((x) => x !== cid) : [...s, cid]));
  const body = (extra) => {
    const lines = {};
    selected.forEach((cid) => {
      const value = inputs[cid];
      if (value) lines[String(cid)] = method === 'manual' ? { amount: parseAmount(value) || value } : { units: value };
    });
    return { method, agreement_ids: selected, lines, use_readings: method === 'meter' && useReadings, ...extra };
  };
  const calculate = async () => {
    setBusy(true); setError('');
    try { setPreview(await pm.allocateBill(b.id, body({ preview: true }))); }
    catch (err) {
      const ids = err?.body?.agreement_ids;
      const names = Array.isArray(ids) ? cands.filter((c) => ids.includes(c.agreement_id)).map((c) => c.tenant_name).join(', ') : '';
      setError(`${getErrorMessage(err)}${names ? ` (${names})` : ''}`);
    } finally { setBusy(false); }
  };
  const confirmAllocation = async () => {
    const needsConfirm = preview.warnings.filter((w) => w.requires_confirmation);
    const summary = preview.lines.map((l) => `${l.tenant_name}: ${rupees(l.amount)}`).join('\n');
    if (!window.confirm(`${needsConfirm.map((w) => w.message).join('\n\n')}${needsConfirm.length ? '\n\n' : ''}Charge tenants?\n\n${summary}`)) return;
    setBusy(true); setError('');
    try {
      await pm.allocateBill(b.id, body({ confirm: needsConfirm.length > 0 }));
      setToast("Electricity charges were added to each tenant's balance.");
      await bill.reload();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const correct = (alloc) => {
    const current = alloc.charge?.net_amount ?? alloc.amount;
    const amount = window.prompt(`Correct ${alloc.tenant_name}'s share (currently ${rupees(current)}). New amount:`);
    if (!amount || !parseAmount(amount)) return;
    const reason = window.prompt('Reason for the correction (e.g. meter misread):');
    if (!reason) return;
    runAction({ action: () => pm.correctAllocation(alloc.id, parseAmount(amount), reason), onDone: bill.reload, onError: setError });
  };
  const cancel = () => runAction({ confirmText: 'Cancel this bill? It is kept as cancelled and not charged to anyone.', action: () => pm.cancelBill(b.id), onDone: bill.reload, onError: setError });

  return (
    <div>
      <PageHeader title={`${monthLabel(b.period.slice(0, 7))} electricity · ${rupees(b.amount)}`} sub={b.property_name}
        action={<Btn variant="outline" onClick={() => navigate('/rental/electricity')}><Icon name="arrowLeft" size={14} /> Electricity</Btn>} />
      <ErrorBox message={error} />
      <Card style={{ marginBottom: 16 }}>
        <CardTitle title="Bill" action={<StatusPill status={b.status} />} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', columnGap: 24 }}>
          <KV label="Amount" value={rupees(b.amount)} strong />
          <KV label="Bill date" value={prettyDate(b.bill_date)} />
          {b.due_date && <KV label="Due date" value={prettyDate(b.due_date)} />}
          {b.total_units && <KV label="Total units" value={b.total_units} />}
          {b.allocation_method && <KV label="Split" value={titleCase(b.allocation_method)} />}
          {isPositive(b.unallocated_amount) && <KV label="Paid by owner (not allocated)" value={rupees(b.unallocated_amount)} tone={T.warning} />}
        </div>
        {b.attachment_open_url && <div style={{ marginTop: 8 }}><LinkBtn onClick={() => openFile(b.attachment_open_url)}>View bill attachment</LinkBtn></div>}
        {b.notes && <Muted style={{ marginTop: 6 }}>{b.notes}</Muted>}
      </Card>

      {isDraft ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16 }}>
          <Card>
            <CardTitle title="1. Who shares this bill?" />
            {candidates.loading && !candidates.data ? <Loading /> : cands.length === 0 ? <Empty>No agreements in this property for this month.</Empty> : cands.map((c) => (
              <Check key={c.agreement_id} checked={selected.includes(c.agreement_id)} onChange={() => toggle(c.agreement_id)} label={c.tenant_name}
                hint={`${c.unit_name}${c.meters.length ? ` · meter units ${c.reading_units}` : ''}${c.shared_meter_needs_units ? ' · shared meter (enter units)' : ''}`} />
            ))}
            {cands.length > 1 && <LinkBtn onClick={() => setSelected(selected.length === cands.length ? [] : cands.map((c) => c.agreement_id))}>{selected.length === cands.length ? 'Clear all' : 'Select all'}</LinkBtn>}
          </Card>
          <Card>
            <CardTitle title="2. How to split?" />
            <Segmented value={method} onChange={setMethod} options={[['equal', 'Equal split'], ['meter', 'By units'], ['manual', 'Manual']]} />
            {method === 'meter' && <Check label="Use saved meter readings" hint="Units come from this month's readings. Typed units override them." checked={useReadings} onChange={setUseReadings} />}
            {(method === 'meter' || method === 'manual') && selected.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <Muted style={{ marginBottom: 6 }}>{method === 'manual' ? 'Amount per tenant (₹)' : `Units per tenant${useReadings ? ' (optional override)' : ''}`}</Muted>
                {selected.map((cid) => {
                  const c = cands.find((x) => x.agreement_id === cid);
                  return (
                    <div key={cid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13 }}>{c?.tenant_name}</span>
                      <input inputMode="decimal" aria-label={`Value for ${c?.tenant_name}`} value={inputs[cid] || ''} placeholder={method === 'meter' && useReadings ? c?.reading_units : '0'}
                        onChange={(e) => setInputs((s) => ({ ...s, [cid]: e.target.value }))}
                        style={{ width: 130, padding: '7px 9px', border: `1px solid ${T.border}`, borderRadius: 8, textAlign: 'right', fontFamily: 'inherit' }} />
                    </div>
                  );
                })}
                {method === 'manual' && <Muted>Allocated {rupees(manualTotal)} of {rupees(b.amount)}</Muted>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <Btn variant="primary" disabled={!selected.length || busy} onClick={calculate}>3. Calculate</Btn>
              <Btn variant="ghost" onClick={cancel}>Cancel bill</Btn>
            </div>
          </Card>
          {preview && (
            <Card style={{ borderColor: T.gold, gridColumn: '1 / -1' }}>
              <CardTitle title="Review" />
              {preview.lines.map((l) => <KV key={l.agreement_id} label={`${l.tenant_name} · ${l.unit_name}${l.units ? ` · ${l.units} units` : ''}`} value={rupees(l.amount)} />)}
              <KV label="Total charged" value={rupees(preview.total)} strong />
              {isPositive(preview.difference) && <KV label="Difference (owner absorbs)" value={rupees(preview.difference)} tone={T.warning} />}
              {preview.warnings.map((w, i) => <div key={i} style={{ fontSize: 12, marginTop: 6, color: w.requires_confirmation ? T.warning : T.slateLight }}>{w.requires_confirmation ? '⚠ ' : 'ℹ '}{w.message}</div>)}
              <div style={{ marginTop: 12 }}><Btn variant="gold" disabled={busy} onClick={confirmAllocation}><Icon name="check" size={14} /> Confirm & charge tenants</Btn></div>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardTitle title="Tenant charges" />
          {b.allocations.length === 0 ? <Empty>{b.status === 'cancelled' ? 'This bill was cancelled.' : 'No allocations.'}</Empty> : (
            <TableWrapper>
              <thead><tr><Th>Tenant</Th><Th>Units</Th><Th>Charged</Th><Th>Paid</Th><Th>Outstanding</Th><Th /></tr></thead>
              <tbody>
                {b.allocations.map((a, i) => (
                  <tr key={a.id}>
                    <Td alt={i % 2}><strong>{a.tenant_name}</strong><Muted>{a.unit_name}</Muted></Td>
                    <Td alt={i % 2}>{a.units || '—'}</Td>
                    <Td alt={i % 2}>{rupees(a.charge?.net_amount ?? a.amount)}{a.charge && a.charge.net_amount !== a.amount && <Muted>originally {rupees(a.amount)}</Muted>}</Td>
                    <Td alt={i % 2}>{rupees(a.charge?.paid)}</Td>
                    <Td alt={i % 2}>{a.charge && <StatusPill status={isPositive(a.charge.outstanding) ? (isPositive(a.charge.paid) ? 'partially_paid' : 'unpaid') : 'paid'} label={rupees(a.charge.outstanding)} />}</Td>
                    <Td alt={i % 2}><LinkBtn onClick={() => correct(a)}>Correct</LinkBtn></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </Card>
      )}
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
