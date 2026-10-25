import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { Btn, Card, FilterChips, PageHeader, TableWrapper, Td, Th, Toast } from '../../components/UI';
import { Icon } from '../../components/Icons';
import { T } from '../../theme';
import {
  CardTitle, Check, choiceOptions, currentMonth, Empty, ErrorBox, FilePick, FormGrid, FormModal, isPositive, KV, LinkBtn,
  Loading, localDate, MoneyIn, Muted, openFile, parseAmount, Pick, pm, prettyDate, PropertyFilter, rupees, runAction,
  Segmented, StatusPill, TextArea, TextIn, titleCase, toFormData, Toolbar, useLoad, useOptions, monthLabel,
} from './shared';

function MeterModal({ open, meter, properties, defaultProperty, onClose, onSaved }) {
  const options = useOptions();
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    if (!open) return;
    setError('');
    setF(meter
      ? { property: String(meter.property), name: meter.name, meter_number: meter.meter_number, meter_type: meter.meter_type, notes: meter.notes, is_active: meter.is_active }
      : { property: defaultProperty || (properties.length === 1 ? String(properties[0].id) : ''), name: '', meter_number: '', meter_type: 'individual', notes: '', is_active: true });
  }, [open, meter, defaultProperty, properties]);
  const submit = async () => {
    setBusy(true); setError('');
    try { onSaved(await pm.saveMeter({ ...f, property: Number(f.property) }, meter?.id)); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const types = choiceOptions(options.meter_types);
  return (
    <FormModal open={open} onClose={onClose} title={meter ? `Edit ${meter.name}` : 'New meter'} onSubmit={submit} busy={busy} error={error} disabled={!f.property || !f.name?.trim() || !f.meter_number?.trim()}>
      <FormGrid>
        <Pick label="Property" required value={f.property} onChange={set('property')} placeholder="Choose…" options={properties.map((p) => [String(p.id), p.name])} />
        <TextIn label="Meter name" required value={f.name} onChange={set('name')} placeholder="e.g. Ground floor shared" />
        <TextIn label="Meter number" required value={f.meter_number} onChange={set('meter_number')} />
        <Pick label="Type" value={f.meter_type} onChange={set('meter_type')} options={types.length ? types : [['individual', 'Individual'], ['shared', 'Shared'], ['common_area', 'Common area'], ['main', 'Main / provider']]} />
      </FormGrid>
      {meter && <Check label="Active" checked={f.is_active} onChange={set('is_active')} />}
      <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
    </FormModal>
  );
}

function BillModal({ open, properties, defaultProperty, onClose, onSaved }) {
  const [f, setF] = useState({});
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const meters = useLoad(() => (open && f.property ? pm.meters({ property: f.property }) : Promise.resolve([])), [open, f.property]);
  useEffect(() => {
    if (!open) return;
    setError(''); setFile(null);
    setF({ property: defaultProperty || (properties.length === 1 ? String(properties[0].id) : ''), meter: '', month: currentMonth(), bill_date: localDate(), due_date: '', amount: '', units: '', notes: '' });
  }, [open, defaultProperty, properties]);
  const valid = f.property && f.month && parseAmount(f.amount) && f.bill_date && (!f.units || parseAmount(f.units));
  const submit = async () => {
    setBusy(true); setError('');
    try {
      onSaved(await pm.createBill(toFormData({
        property: f.property, meter: f.meter || undefined, period: `${f.month}-01`, bill_date: f.bill_date, due_date: f.due_date || undefined,
        amount: parseAmount(f.amount), total_units: f.units ? parseAmount(f.units) : undefined, notes: f.notes,
      }, { attachment: file })));
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <FormModal open={open} onClose={onClose} title="New electricity bill" subtitle="Next you'll choose who shares it and how to split it" onSubmit={submit} submitLabel="Save & split" busy={busy} error={error} disabled={!valid}>
      <FormGrid>
        <Pick label="Property" required value={f.property} onChange={(v) => setF((x) => ({ ...x, property: v, meter: '' }))} placeholder="Choose…" options={properties.map((p) => [String(p.id), p.name])} />
        <TextIn label="Bill for month" required type="month" value={f.month} onChange={set('month')} />
        <MoneyIn label="Bill amount (₹)" required value={f.amount} onChange={set('amount')} />
        <TextIn label="Total units on bill" inputMode="decimal" value={f.units} onChange={set('units')} />
        <TextIn label="Bill date" type="date" value={f.bill_date} onChange={set('bill_date')} />
        <TextIn label="Due date" type="date" value={f.due_date} onChange={set('due_date')} />
        {(meters.data || []).length > 0 && <Pick label="Meter (optional)" value={f.meter} onChange={set('meter')} placeholder="Whole property" options={meters.data.map((m) => [String(m.id), `${m.name} (${m.meter_number})`])} />}
        <FilePick label="Bill photo / PDF" file={file} onChange={setFile} />
      </FormGrid>
      <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
    </FormModal>
  );
}

export function ElectricityPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('bills');
  const [propertyId, setPropertyId] = useState('');
  const [modal, setModal] = useState(null);
  const properties = useLoad(() => pm.properties(), []);
  const bills = useLoad(() => pm.bills({ property: propertyId }), [propertyId]);
  const meters = useLoad(() => pm.meters({ property: propertyId }), [propertyId]);

  return (
    <div>
      <PageHeader
        title="Electricity"
        sub="Record the provider's bill, then split it between tenants — equally, by meter units, or manually."
        action={<>
          <Btn variant="outline" onClick={() => setModal('meter')}><Icon name="plus" size={14} /> Add meter</Btn>
          <Btn variant="gold" onClick={() => setModal('bill')}><Icon name="plus" size={14} /> Add bill</Btn>
        </>}
      />
      <Toolbar><PropertyFilter properties={properties.data} value={propertyId} onChange={setPropertyId} /></Toolbar>
      <FilterChips options={[['bills', `Bills (${bills.data?.length ?? 0})`], ['meters', `Meters (${meters.data?.length ?? 0})`]]} active={tab} onChange={setTab} />
      <ErrorBox message={bills.error || meters.error} />
      <Card>
        {tab === 'bills' && ((bills.loading && !bills.data) ? <Loading /> : (bills.data || []).length === 0 ? <Empty>No bills yet. Add the provider's bill to split it.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Month</Th><Th>Property</Th><Th>Amount</Th><Th>Units</Th><Th>Split</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {bills.data.map((b, i) => (
                <tr key={b.id}>
                  <Td alt={i % 2}><strong>{monthLabel(b.period.slice(0, 7))}</strong><Muted>Billed {prettyDate(b.bill_date)}</Muted></Td>
                  <Td alt={i % 2}>{b.property_name}</Td>
                  <Td alt={i % 2}>{rupees(b.amount)}</Td>
                  <Td alt={i % 2}>{b.total_units || '—'}</Td>
                  <Td alt={i % 2}>{b.allocation_method ? titleCase(b.allocation_method) : '—'}</Td>
                  <Td alt={i % 2}><StatusPill status={b.status} label={b.status === 'draft' ? 'Needs split' : undefined} /></Td>
                  <Td alt={i % 2}><Link to={`/rental/electricity/bills/${b.id}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>{b.status === 'draft' ? 'Split now ›' : 'Open ›'}</Link></Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        ))}
        {tab === 'meters' && ((meters.loading && !meters.data) ? <Loading /> : (meters.data || []).length === 0 ? <Empty>No meters yet. Meters are optional — add them for unit-based splits.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Meter</Th><Th>Number</Th><Th>Type</Th><Th>Linked tenants</Th><Th>Last reading</Th><Th /></tr></thead>
            <tbody>
              {meters.data.map((m, i) => (
                <tr key={m.id}>
                  <Td alt={i % 2}><strong>{m.name}</strong><Muted>{m.property_name}{m.is_active ? '' : ' · inactive'}</Muted></Td>
                  <Td alt={i % 2}>{m.meter_number}</Td>
                  <Td alt={i % 2}>{titleCase(m.meter_type)}</Td>
                  <Td alt={i % 2}>{m.assignments.filter((x) => !x.end_date).map((x) => x.tenant_name).join(', ') || '—'}</Td>
                  <Td alt={i % 2}>{m.last_reading ? `${m.last_reading.value} on ${prettyDate(m.last_reading.date)}` : '—'}</Td>
                  <Td alt={i % 2}><Link to={`/rental/electricity/meters/${m.id}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>Readings ›</Link></Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        ))}
      </Card>
      <MeterModal open={modal === 'meter'} properties={properties.data || []} defaultProperty={propertyId} onClose={() => setModal(null)} onSaved={(m) => { setModal(null); navigate(`/rental/electricity/meters/${m.id}`); }} />
      <BillModal open={modal === 'bill'} properties={properties.data || []} defaultProperty={propertyId} onClose={() => setModal(null)} onSaved={(b) => { setModal(null); navigate(`/rental/electricity/bills/${b.id}`); }} />
    </div>
  );
}

export function MeterDetailPage() {
  const { id } = useParams();
  const meterId = Number(id);
  const navigate = useNavigate();
  const meters = useLoad(() => pm.meters(), []);
  const readings = useLoad(() => pm.readings({ meter: meterId }), [meterId]);
  const properties = useLoad(() => pm.properties(), []);
  const meter = (meters.data || []).find((m) => m.id === meterId);
  const [edit, setEdit] = useState(false);
  const [date, setDate] = useState(localDate());
  const [previous, setPrevious] = useState('');
  const [current, setCurrent] = useState('');
  const [isReset, setIsReset] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (meters.loading && !meters.data) return <Loading />;
  if (!meter) return <ErrorBox message={meters.error || 'Meter not found'} onRetry={meters.reload} />;
  const last = meter.last_reading;
  const prevValue = isReset ? previous || '0' : last ? last.value : previous;
  const units = Number(current) - Number(prevValue || 0);
  const canSave = current && date && units >= 0 && (!isReset || resetReason.trim()) && (last || previous);

  const saveReading = async () => {
    if (!window.confirm(`Save reading ${prevValue} → ${current} = ${units.toFixed(2)} units on ${prettyDate(date)}?`)) return;
    setBusy(true); setError('');
    try {
      await pm.saveReading(toFormData({
        meter: meterId, reading_date: date, current_reading: current,
        previous_reading: !last || isReset ? prevValue : undefined, is_reset: isReset, reset_reason: isReset ? resetReason : undefined,
      }, { image: photo }));
      setCurrent(''); setPrevious(''); setIsReset(false); setResetReason(''); setPhoto(null);
      await Promise.all([meters.reload(), readings.reload()]);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const unlink = (x) => runAction({ confirmText: `Stop counting this meter for ${x.tenant_name} from today?`, action: () => pm.endMeterAssignment(x.id, localDate()), onDone: meters.reload, onError: setError });

  return (
    <div>
      <PageHeader title={`${meter.name} (${meter.meter_number})`} sub={`${meter.property_name} · ${titleCase(meter.meter_type)}`}
        action={<><Btn variant="outline" onClick={() => navigate('/rental/electricity')}><Icon name="arrowLeft" size={14} /> Electricity</Btn><Btn variant="outline" onClick={() => setEdit(true)}><Icon name="edit" size={14} /> Edit</Btn></>} />
      <ErrorBox message={error} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardTitle title="Add reading" />
          <div style={{ display: 'grid', gap: 10 }}>
            <FormGrid min={160}>
              <TextIn label="Reading date" type="date" value={date} onChange={setDate} />
              {last && !isReset
                ? <TextIn label="Previous reading" value={`${last.value} (${prettyDate(last.date)})`} onChange={() => {}} disabled />
                : <TextIn label={isReset ? 'New meter starting reading' : 'Previous reading (first entry)'} inputMode="decimal" value={previous} onChange={setPrevious} />}
              <TextIn label="Current reading" required inputMode="decimal" value={current} onChange={setCurrent} error={units < 0 && current ? 'Lower than previous — tick "Meter replaced" if it was reset.' : undefined} />
            </FormGrid>
            {current && Number.isFinite(units) && units >= 0 && <Muted>Units consumed: <strong>{units.toFixed(2)}</strong></Muted>}
            <Check label="Meter replaced / reset" checked={isReset} onChange={setIsReset} />
            {isReset && <TextIn label="Reason" value={resetReason} onChange={setResetReason} placeholder="e.g. New meter installed" />}
            <FilePick label="Meter photo (optional)" file={photo} onChange={setPhoto} accept="image/*" />
            <div><Btn variant="gold" disabled={!canSave || busy} onClick={saveReading}>{busy ? 'Saving…' : 'Save reading'}</Btn></div>
          </div>
        </Card>
        <Card>
          <CardTitle title="Linked tenants" sub='Link from an agreement page ("Link meter").' />
          {meter.assignments.length === 0 ? <Muted>No tenants linked.</Muted> : meter.assignments.map((x) => (
            <KV key={x.id} label={`${x.tenant_name} · ${x.unit_name}${x.share_percent ? ` · ${x.share_percent}%` : ''}`} value={<span>{prettyDate(x.start_date)} → {prettyDate(x.end_date)} {!x.end_date && <LinkBtn danger onClick={() => unlink(x)}>Unlink</LinkBtn>}</span>} />
          ))}
        </Card>
      </div>
      <Card>
        <CardTitle title="Reading history" />
        {(readings.data || []).length === 0 ? <Empty>No readings yet.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Date</Th><Th>Previous</Th><Th>Current</Th><Th>Units</Th><Th>Note</Th></tr></thead>
            <tbody>
              {readings.data.map((r, i) => (
                <tr key={r.id}>
                  <Td alt={i % 2}>{prettyDate(r.reading_date)}</Td>
                  <Td alt={i % 2}>{r.previous_reading}</Td>
                  <Td alt={i % 2}>{r.current_reading}</Td>
                  <Td alt={i % 2}><strong>{r.units_consumed}</strong></Td>
                  <Td alt={i % 2}>{r.is_reset ? `Reset: ${r.reset_reason}` : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>
      <MeterModal open={edit} meter={meter} properties={properties.data || []} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); meters.reload(); }} />
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
