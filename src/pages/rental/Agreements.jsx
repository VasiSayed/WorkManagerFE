import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { Btn, Card, FilterChips, PageHeader, TableWrapper, Td, Th, Toast } from '../../components/UI';
import { Icon } from '../../components/Icons';
import { T } from '../../theme';
import { RecurringChargeModal } from './Charges';
import PaymentModal, { paymentSummary } from './PaymentModal';
import { TenantModal } from './Tenants';
import {
  CardTitle, Check, choiceOptions, currentMonth, Empty, ErrorBox, FilePick, FormGrid, FormModal, isPositive, KV, LinkBtn,
  Loading, localDate, MoneyIn, Muted, openFile, parseAmount, Pick, pm, prettyDate, PropertyFilter, rupees, runAction,
  shiftDate, StatusPill, TextArea, TextIn, titleCase, toFormData, Toolbar, useLoad, useOptions,
} from './shared';

export function AgreementsPage() {
  const [filter, setFilter] = useState('active');
  const [propertyId, setPropertyId] = useState('');
  const properties = useLoad(() => pm.properties(), []);
  const params = filter === 'expired' || filter === 'expiring_soon' ? { expiry: filter } : { status: filter === 'all' ? '' : filter };
  const agreements = useLoad(() => pm.agreements({ ...params, property: propertyId }), [filter, propertyId]);

  return (
    <div>
      <PageHeader title="Agreements" sub="Rent agreements between a tenant and a unit. Renewals keep the old agreement as history." action={<Link to="/rental/agreements/new"><Btn variant="gold"><Icon name="plus" size={15} /> New agreement</Btn></Link>} />
      <Toolbar><PropertyFilter properties={properties.data} value={propertyId} onChange={setPropertyId} /></Toolbar>
      <FilterChips options={[['active', 'Active'], ['expiring_soon', 'Expiring soon'], ['expired', 'Expired'], ['renewed', 'Renewed'], ['ended', 'Ended'], ['terminated', 'Terminated'], ['all', 'All']]} active={filter} onChange={setFilter} />
      <ErrorBox message={agreements.error} onRetry={agreements.reload} />
      <Card>
        {agreements.loading && !agreements.data ? <Loading /> : (agreements.data || []).length === 0 ? <Empty>No agreements here.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Tenant</Th><Th>Unit</Th><Th>Rent</Th><Th>Due day</Th><Th>Start</Th><Th>Expiry</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {agreements.data.map((a, i) => (
                <tr key={a.id}>
                  <Td alt={i % 2}><Link to={`/rental/tenants/${a.tenant}`} style={{ color: T.navy, fontWeight: 700 }}>{a.tenant_name}</Link><Muted>{a.tenant_mobile}</Muted></Td>
                  <Td alt={i % 2}>{a.unit_name}<Muted>{a.property_name}</Muted></Td>
                  <Td alt={i % 2}>{rupees(a.current_rent)}</Td>
                  <Td alt={i % 2}>{a.rent_due_day}</Td>
                  <Td alt={i % 2}>{prettyDate(a.start_date)}</Td>
                  <Td alt={i % 2}>{prettyDate(a.end_date)}</Td>
                  <Td alt={i % 2}><StatusPill status={a.status === 'active' ? a.expiry_state : a.status} /></Td>
                  <Td alt={i % 2}><Link to={`/rental/agreements/${a.id}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>Open ›</Link></Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>
    </div>
  );
}

/** Units a tenant rents together under one agreement. The first ticked unit is the main unit. */
function UnitChecklist({ units, selected, onToggle, propertyChosen, ownAgreementId }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.slate, marginBottom: 4 }}>Rental unit(s) <span style={{ color: T.error }}>*</span></div>
      {!propertyChosen ? <Muted>Choose a property first.</Muted> : units.length === 0 ? <Muted>This property has no rental units yet.</Muted> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 6 }}>
          {units.map((u) => {
            const takenByOther = u.current_agreement && u.current_agreement.id !== ownAgreementId;
            const on = selected.includes(u.id);
            return (
              <div key={u.id} style={{ border: `1px solid ${on ? T.gold : T.border}`, background: on ? T.goldLight : T.white, borderRadius: 8, padding: '2px 10px', opacity: takenByOther && !on ? 0.55 : 1 }}>
                <Check label={`${u.name}${on && selected[0] === u.id && selected.length > 1 ? ' (main)' : ''}`}
                  hint={takenByOther ? `Occupied by ${u.current_agreement.tenant_name}` : 'Vacant'}
                  checked={on} onChange={() => { if (!takenByOther || on) onToggle(u.id); }} />
              </div>
            );
          })}
        </div>
      )}
      <Muted style={{ marginTop: 4 }}>Tick every unit this tenant rents together — one agreement, one rent. Occupied units can't be selected.</Muted>
    </div>
  );
}

export function AgreementFormPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [propertyId, setPropertyId] = useState(search.get('property') || '');
  const [unitIds, setUnitIds] = useState(search.get('unit') ? [Number(search.get('unit'))] : []);
  const [tenantId, setTenantId] = useState(search.get('tenant') || '');
  const [rent, setRent] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [start, setStart] = useState(localDate());
  const [end, setEnd] = useState('');
  const [deposit, setDeposit] = useState('');
  const [billFromCurrent, setBillFromCurrent] = useState(true);
  const [notes, setNotes] = useState('');
  const [newTenant, setNewTenant] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const properties = useLoad(() => pm.properties(), []);
  const units = useLoad(() => (propertyId ? pm.units({ property: propertyId }) : Promise.resolve([])), [propertyId]);
  const tenants = useLoad(() => pm.tenants(), []);

  useEffect(() => {
    if (!propertyId && properties.data?.length === 1) setPropertyId(String(properties.data[0].id));
  }, [properties.data, propertyId]);

  const parsedRent = parseAmount(rent);
  const parsedDeposit = deposit ? parseAmount(deposit) : '0.00';
  const day = Number(dueDay);
  const startsBeforeThisMonth = start && start.slice(0, 7) < currentMonth();
  const valid = propertyId && unitIds.length && tenantId && parsedRent && parsedDeposit && day >= 1 && day <= 31 && start && (!end || end >= start);

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const agreement = await pm.saveAgreement({
        property: Number(propertyId), unit: unitIds[0], additional_units: unitIds.slice(1), tenant: Number(tenantId),
        monthly_rent: parsedRent, rent_due_day: day, start_date: start, end_date: end || null,
        security_deposit_amount: parsedDeposit,
        billing_start_date: startsBeforeThisMonth && !billFromCurrent ? `${start.slice(0, 7)}-01` : undefined,
        notes,
      });
      navigate(`/rental/agreements/${agreement.id}`, { replace: true });
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const toggleUnit = (id) => setUnitIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <div>
      <PageHeader title="New agreement" sub="Link a tenant to a rental unit with rent terms." action={<Btn variant="outline" onClick={() => navigate(-1)}><Icon name="arrowLeft" size={14} /> Back</Btn>} />
      <Card style={{ maxWidth: 860 }}>
        <ErrorBox message={error} />
        <form onSubmit={(e) => { e.preventDefault(); if (valid && !busy) submit(); }} style={{ display: 'grid', gap: 14 }}>
          <FormGrid>
            <Pick label="Property" required value={propertyId} onChange={(v) => { setPropertyId(v); setUnitIds([]); }} placeholder="Choose property" options={(properties.data || []).map((p) => [String(p.id), p.name])} />
            <div style={{ display: 'grid', gap: 4 }}>
              <Pick label="Tenant" required value={tenantId} onChange={setTenantId} placeholder="Choose tenant" options={(tenants.data || []).map((t) => [String(t.id), `${t.full_name} · ${t.mobile}`])} />
              <LinkBtn onClick={() => setNewTenant(true)}>+ New tenant</LinkBtn>
            </div>
          </FormGrid>
          <UnitChecklist units={units.data || []} selected={unitIds} onToggle={toggleUnit} propertyChosen={!!propertyId} />
          <FormGrid>
            <MoneyIn label="Monthly rent (₹)" required value={rent} onChange={setRent} hint={unitIds.length > 1 ? `One rent for all ${unitIds.length} units together` : undefined} />
            <TextIn label="Rent due day (1–31)" type="number" min="1" max="31" value={dueDay} onChange={setDueDay} />
            <TextIn label="Start date" required type="date" value={start} onChange={setStart} />
            <TextIn label="Expiry date" type="date" value={end} onChange={setEnd} error={end && start && end < start ? 'Expiry is before start' : undefined} />
            <MoneyIn label="Security deposit (₹)" value={deposit} onChange={setDeposit} hint="Agreed amount. Record the money received on the next page." />
          </FormGrid>
          {startsBeforeThisMonth && (
            <Check label="Start rent tracking from this month" hint="Untick to also create rent charges for earlier months since the start date (only if those were not already settled)." checked={billFromCurrent} onChange={setBillFromCurrent} />
          )}
          <TextArea label="Notes" value={notes} onChange={setNotes} />
          <Muted>Fixed charges (water, maintenance), deposits, meters and documents can be added on the next page.</Muted>
          <div><Btn type="submit" variant="gold" disabled={!valid || busy}>{busy ? 'Creating…' : 'Create agreement'}</Btn></div>
        </form>
      </Card>
      <TenantModal open={newTenant} onClose={() => setNewTenant(false)} onSaved={async (t) => { setNewTenant(false); await tenants.reload(); setTenantId(String(t.id)); }} />
    </div>
  );
}

/* ── Agreement detail ── */

function ActionModal({ kind, agreement: a, balance, meters, onClose, onDone }) {
  const options = useOptions();
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!kind) return;
    setError('');
    const today = localDate();
    const init = {
      revise: { amount: '', date: `${currentMonth()}-01`, reason: '' },
      renew: { start: a.end_date ? shiftDate(a.end_date, 1) : today, end: '', amount: String(Number(a.current_rent)), dueDay: String(a.rent_due_day) },
      end: { date: today, status: 'ended', notes: '' },
      charge: { description: '', amount: '', date: today },
      deposit: { amount: String(Number(a.security_deposit_amount)), date: today, method: 'cash' },
      settle: { dues: '', deduction: '', reason: '', refund: '', method: 'cash' },
      meter: { meter: '', date: today, share: '' },
      document: { file: null, title: '' },
    }[kind];
    setF(init || {});
  }, [kind, a]);

  if (!kind) return null;
  const methods = choiceOptions(options.payment_methods).filter(([v]) => v !== 'security_deposit');

  const config = {
    revise: {
      title: 'Revise rent',
      valid: parseAmount(f.amount) && f.date,
      run: () => pm.reviseRent(a.id, { new_rent: parseAmount(f.amount), effective_date: f.date, reason: f.reason }),
      body: <>
        <FormGrid>
          <MoneyIn label="New monthly rent (₹)" required value={f.amount} onChange={set('amount')} hint={`Currently ${rupees(a.current_rent)}`} />
          <TextIn label="Effective from" type="date" value={f.date} onChange={set('date')} hint="Applies from the billing month containing this date." />
        </FormGrid>
        <TextIn label="Reason" value={f.reason} onChange={set('reason')} placeholder="e.g. Annual 5% increase" />
        <Muted>Past charges keep their amounts.</Muted>
      </>,
    },
    renew: {
      title: 'Renew agreement',
      valid: f.start && parseAmount(f.amount),
      run: () => pm.renewAgreement(a.id, { start_date: f.start, end_date: f.end || null, monthly_rent: parseAmount(f.amount), rent_due_day: Number(f.dueDay) || undefined }),
      body: <>
        <FormGrid>
          <TextIn label="New start date" type="date" value={f.start} onChange={set('start')} />
          <TextIn label="New expiry date" type="date" value={f.end} onChange={set('end')} />
          <MoneyIn label="Monthly rent (₹)" required value={f.amount} onChange={set('amount')} />
          <TextIn label="Due day" type="number" min="1" max="31" value={f.dueDay} onChange={set('dueDay')} />
        </FormGrid>
        <Muted>A new agreement is created and this one is kept as history. Deposit, fixed charges and meter links carry over.</Muted>
      </>,
    },
    end: {
      title: 'End agreement / move out',
      danger: true,
      valid: f.date,
      run: () => pm.endAgreement(a.id, { move_out_date: f.date, status: f.status, notes: f.notes }),
      body: <>
        <FormGrid>
          <TextIn label="Move-out date" type="date" value={f.date} onChange={set('date')} />
          <Pick label="Type" value={f.status} onChange={set('status')} options={[['ended', 'Ended normally'], ['terminated', 'Terminated']]} />
        </FormGrid>
        <TextArea label="Notes" value={f.notes} onChange={set('notes')} />
        <Muted>All history (payments, charges, deposit) is kept. Rent stops after the move-out month. Settle the deposit afterwards.</Muted>
      </>,
    },
    charge: {
      title: 'One-time charge',
      valid: f.description?.trim() && parseAmount(f.amount) && f.date,
      run: () => pm.addOneTimeCharge({ agreement: a.id, description: f.description, amount: parseAmount(f.amount), due_date: f.date }),
      body: <FormGrid>
        <TextIn label="Description" required value={f.description} onChange={set('description')} placeholder="e.g. Duplicate key" />
        <MoneyIn label="Amount (₹)" required value={f.amount} onChange={set('amount')} />
        <TextIn label="Due date" type="date" value={f.date} onChange={set('date')} />
      </FormGrid>,
    },
    deposit: {
      title: 'Record deposit received',
      valid: parseAmount(f.amount) && f.date,
      run: () => pm.recordDeposit({ agreement: a.id, txn_type: 'received', amount: parseAmount(f.amount), txn_date: f.date, method: f.method }),
      body: <FormGrid>
        <MoneyIn label="Amount (₹)" required value={f.amount} onChange={set('amount')} />
        <TextIn label="Date" type="date" value={f.date} onChange={set('date')} />
        <Pick label="Method" value={f.method} onChange={set('method')} options={methods.length ? methods : [['cash', 'Cash']]} />
      </FormGrid>,
    },
    settle: {
      title: 'Settle security deposit',
      valid: true,
      run: () => pm.settleDeposit({
        agreement: a.id, apply_to_dues: parseAmount(f.dues || '0'), deduction: parseAmount(f.deduction || '0'), deduction_reason: f.reason,
        refund: parseAmount(f.refund || '0'), refund_method: f.method,
      }),
      body: <>
        <Muted>Held: {rupees(balance?.deposit.balance)} · Outstanding dues: {rupees(balance?.balance.total_outstanding)}</Muted>
        <FormGrid min={180}>
          <MoneyIn label="Use for outstanding dues (₹)" value={f.dues} onChange={set('dues')} />
          <MoneyIn label="Deduction for damages (₹)" value={f.deduction} onChange={set('deduction')} />
          <MoneyIn label="Refund to tenant (₹)" value={f.refund} onChange={set('refund')} />
          <Pick label="Refund method" value={f.method} onChange={set('method')} options={methods.length ? methods : [['cash', 'Cash']]} />
        </FormGrid>
        {f.deduction && <TextIn label="Deduction reason" value={f.reason} onChange={set('reason')} />}
      </>,
    },
    meter: {
      title: 'Link electricity meter',
      valid: f.meter && f.date,
      run: () => pm.assignMeter({ meter: Number(f.meter), agreement: a.id, start_date: f.date, share_percent: f.share || null }),
      body: <>
        {meters.length === 0 && <Muted>No meters in this property yet — add one under Electricity.</Muted>}
        <FormGrid>
          <Pick label="Meter" required value={f.meter} onChange={set('meter')} placeholder="Choose meter" options={meters.map((m) => [String(m.id), `${m.name} (${m.meter_number}) · ${titleCase(m.meter_type)}`])} />
          <TextIn label="Linked from" type="date" value={f.date} onChange={set('date')} />
          <TextIn label="Share of units % (shared meters)" inputMode="decimal" value={f.share} onChange={set('share')} placeholder="e.g. 50" />
        </FormGrid>
      </>,
    },
    document: {
      title: 'Upload agreement document',
      valid: !!f.file,
      run: () => pm.uploadAgreementDocument(a.id, toFormData({ title: f.title || f.file.name, doc_type: 'agreement' }, { file: f.file })),
      body: <FormGrid>
        <FilePick label="File" file={f.file} onChange={set('file')} />
        <TextIn label="Title" value={f.title} onChange={set('title')} placeholder="Defaults to the file name" />
      </FormGrid>,
    },
  }[kind];

  const submit = async () => {
    setBusy(true); setError('');
    try { onDone(kind, await config.run()); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <FormModal open onClose={onClose} title={config.title} subtitle={`${a.tenant_name} · ${a.unit_name}`} onSubmit={submit} busy={busy} error={error} disabled={!config.valid} danger={config.danger}>
      {config.body}
    </FormModal>
  );
}

function UnitsModal({ open, agreement: a, onClose, onSaved }) {
  const [ids, setIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const units = useLoad(() => (open ? pm.units({ property: a.property }) : Promise.resolve([])), [open, a.property]);
  useEffect(() => { if (open) { setIds([a.unit, ...(a.additional_units || [])]); setError(''); } }, [open, a]);
  const toggle = (id) => {
    if (id === a.unit) return; // the main unit is fixed; renew the agreement to change it
    setIds((x) => (x.includes(id) ? x.filter((v) => v !== id) : [...x, id]));
  };
  const submit = async () => {
    setBusy(true); setError('');
    try { onSaved(await pm.saveAgreement({ additional_units: ids.filter((id) => id !== a.unit) }, a.id)); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <FormModal open={open} onClose={onClose} title="Units in this agreement" subtitle={`${a.tenant_name} · main unit stays the same`} onSubmit={submit} busy={busy} error={error}>
      <UnitChecklist units={units.data || []} selected={ids} onToggle={toggle} propertyChosen ownAgreementId={a.id} />
      <Muted>Rent does not change automatically — use "Revise rent" if the rent changes with the units.</Muted>
    </FormModal>
  );
}

export function AgreementDetailPage() {
  const { id } = useParams();
  const agreementId = Number(id);
  const navigate = useNavigate();
  const agreement = useLoad(() => pm.agreement(agreementId), [agreementId]);
  const balance = useLoad(() => pm.agreementBalance(agreementId), [agreementId]);
  const docs = useLoad(() => pm.documents({ agreement: agreementId }), [agreementId]);
  const charges = useLoad(() => pm.recurringCharges({ agreement: agreementId }), [agreementId]);
  const a = agreement.data;
  const meters = useLoad(() => (a ? pm.meters({ property: a.property }) : Promise.resolve([])), [a?.property]);
  const [action, setAction] = useState(null);
  const [fixedCharge, setFixedCharge] = useState(false);
  const [unitsModal, setUnitsModal] = useState(false);
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const reloadAll = () => Promise.all([agreement.reload(), balance.reload(), docs.reload(), charges.reload(), meters.reload()]);

  if (agreement.loading && !a) return <Loading />;
  if (!a) return <ErrorBox message={agreement.error || 'Agreement not found'} onRetry={agreement.reload} />;
  const active = a.status === 'active';
  const b = balance.data?.balance;
  // Meters that supply any of this agreement's units; their monthly bill is split into this tenant's rent.
  const unitIds = (a.units || []).map((u) => u.id);
  const linked = (meters.data || []).filter((m) => (m.units || []).some((id) => unitIds.includes(id)));

  const onActionDone = async (kind, result) => {
    setAction(null);
    if (kind === 'renew' && result?.id) { navigate(`/rental/agreements/${result.id}`); return; }
    setToast({ revise: 'Rent revised', end: 'Agreement ended', charge: 'Charge added', deposit: 'Deposit recorded', settle: 'Deposit settled', meter: 'Meter linked', document: 'Document uploaded' }[kind] || 'Saved');
    await reloadAll();
  };
  const adjust = (c) => {
    const amount = window.prompt(`Adjust "${c.description}" (outstanding ${rupees(c.outstanding)}).\nEnter the change, e.g. -500 for a discount or 200 to add:`);
    if (!amount || !Number(amount)) return;
    const reason = window.prompt('Reason for the adjustment:');
    if (!reason) return;
    runAction({ action: () => pm.adjustCharge(c.id, Number(amount).toFixed(2), reason), onDone: reloadAll, onError: setError });
  };
  const voidCharge = (c) => {
    const reason = window.prompt(`Void "${c.description}"? It will no longer be owed. Reason:`);
    if (reason) runAction({ action: () => pm.voidCharge(c.id, reason), onDone: reloadAll, onError: setError });
  };
  const toggleReminders = (v) => runAction({ action: () => pm.saveAgreement({ reminders_enabled: v }, a.id), onDone: agreement.reload, onError: setError });

  const actionBtn = (kind, label, icon, variant = 'outline') => <Btn variant={variant} onClick={() => setAction(kind)}><Icon name={icon} size={14} /> {label}</Btn>;

  return (
    <div>
      <PageHeader
        title={`${a.tenant_name} · ${a.unit_name}`}
        sub={`${a.property_name} · Agreement #${a.id}`}
        action={<>
          <Btn variant="outline" onClick={() => navigate(-1)}><Icon name="arrowLeft" size={14} /> Back</Btn>
          <Link to={`/rental/tenants/${a.tenant}`}><Btn variant="outline"><Icon name="user" size={14} /> Tenant profile</Btn></Link>
          {b && <Btn variant="gold" onClick={() => setTarget({ agreementId: a.id, tenantName: a.tenant_name, unitName: `${a.unit_name} · ${a.property_name}` })}><Icon name="wallet" size={14} /> Collect payment</Btn>}
        </>}
      />
      <ErrorBox message={error} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardTitle title="Terms" action={<StatusPill status={active ? a.expiry_state : a.status} />} />
          <KV label={(a.units || []).length > 1 ? `Units (${a.units.length})` : 'Unit'} value={a.unit_name} />
          <KV label="Current rent" value={rupees(a.current_rent)} strong />
          {a.current_rent !== a.monthly_rent && <KV label="Starting rent" value={rupees(a.monthly_rent)} />}
          <KV label="Due day" value={a.rent_due_day} />
          <KV label="Start" value={prettyDate(a.start_date)} />
          <KV label="Expiry" value={prettyDate(a.end_date)} />
          {a.move_out_date && <KV label="Moved out" value={prettyDate(a.move_out_date)} />}
          <KV label="Billing from" value={prettyDate(a.billing_start_date)} />
          <KV label="Deposit (agreed)" value={rupees(a.security_deposit_amount)} />
          {balance.data && <KV label="Deposit held" value={rupees(balance.data.deposit.balance)} />}
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            {a.renewed_from && <Link to={`/rental/agreements/${a.renewed_from}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>‹ Previous agreement</Link>}
            {a.renewed_to && <Link to={`/rental/agreements/${a.renewed_to}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>Renewed agreement ›</Link>}
          </div>
          {active && <Check label="Renewal reminders" hint="Show on the dashboard before expiry." checked={a.reminders_enabled} onChange={toggleReminders} />}
          {a.notes && <Muted style={{ marginTop: 6 }}>{a.notes}</Muted>}
        </Card>

        <Card>
          <CardTitle title="Outstanding" />
          {!b ? <Loading /> : <>
            <KV label="Total" value={rupees(b.total_outstanding)} strong tone={isPositive(b.total_outstanding) ? T.error : T.success} />
            {isPositive(b.overdue) && <KV label="Overdue" value={rupees(b.overdue)} tone={T.error} />}
            {isPositive(b.advance_credit) && <KV label="Advance credit" value={rupees(b.advance_credit)} tone={T.info} />}
            {(balance.data.open_charges || []).map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: `1px dashed ${T.border}`, fontSize: 13 }}>
                <span>{c.description}<Muted>{titleCase(c.type)} · due {prettyDate(c.due_date)}</Muted></span>
                <span style={{ textAlign: 'right' }}><strong>{rupees(c.outstanding)}</strong><div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><LinkBtn onClick={() => adjust(c)}>Adjust</LinkBtn><LinkBtn danger onClick={() => voidCharge(c)}>Void</LinkBtn></div></span>
              </div>
            ))}
            {isPositive(b.advance_credit) && isPositive(b.total_outstanding) && (
              <div style={{ marginTop: 8 }}><LinkBtn onClick={() => runAction({ confirmText: 'Use advance credit to pay open charges?', action: () => pm.applyCredit(a.id), onDone: reloadAll, onError: setError })}>Apply advance credit to dues</LinkBtn></div>
            )}
          </>}
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardTitle title="Actions" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {active && actionBtn('revise', 'Revise rent', 'trend')}
          {active && actionBtn('renew', 'Renew', 'calendar')}
          {active && <Btn variant="outline" onClick={() => setUnitsModal(true)}><Icon name="building" size={14} /> Edit units</Btn>}
          {actionBtn('charge', 'One-time charge', 'plus')}
          <Btn variant="outline" onClick={() => setFixedCharge(true)}><Icon name="clock" size={14} /> Fixed monthly charge</Btn>
          {actionBtn('deposit', 'Deposit received', 'wallet')}
          {balance.data && isPositive(balance.data.deposit.balance) && actionBtn('settle', 'Settle deposit', 'shield')}
          {actionBtn('document', 'Upload document', 'upload')}
          {active && actionBtn('end', 'Move out / end', 'logout', 'danger')}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
        <Card>
          <CardTitle title="Fixed charges" sub="Property/unit-wide charges also apply" />
          {(charges.data || []).length === 0 ? <Muted>None on this agreement.</Muted> : charges.data.map((r) => (
            <KV key={r.id} label={`${r.name}${r.is_enabled ? '' : ' (paused)'}`} value={`${rupees(r.amount)} · ${prettyDate(r.start_date)}${r.end_date ? ` → ${prettyDate(r.end_date)}` : ''}`} />
          ))}
        </Card>
        <Card>
          <CardTitle title="Electricity meters" sub="Bills are added to this tenant's rent" />
          {linked.length === 0 ? <Muted>No meter supplies these units. Add one under Electricity.</Muted> : linked.map((m) => (
            <KV key={m.id} label={`${m.name} (#${m.meter_number})`} value={<Link to={`/rental/electricity/meters/${m.id}`} style={{ color: T.goldDark, fontWeight: 700 }}>{m.last_bill ? `Last: ${rupees(m.last_bill.amount)}` : 'Open'} ›</Link>} />
          ))}
        </Card>
        <Card>
          <CardTitle title="Documents" />
          {(docs.data || []).length === 0 ? <Muted>No documents.</Muted> : docs.data.map((d) => (
            <KV key={d.id} label={`${d.title} · ${titleCase(d.doc_type)}`} value={<LinkBtn onClick={() => openFile(d.open_url)}>Open</LinkBtn>} />
          ))}
        </Card>
      </div>

      <ActionModal kind={action} agreement={a} balance={balance.data} meters={meters.data || []} onClose={() => setAction(null)} onDone={onActionDone} />
      <UnitsModal open={unitsModal} agreement={a} onClose={() => setUnitsModal(false)} onSaved={() => { setUnitsModal(false); setToast('Units updated'); reloadAll(); }} />
      <RecurringChargeModal open={fixedCharge} defaults={{ scope: 'agreement', agreement: a.id }} onClose={() => setFixedCharge(false)} onSaved={() => { setFixedCharge(false); reloadAll(); }} />
      <PaymentModal target={target} onClose={() => setTarget(null)} onSaved={(p) => { setTarget(null); setToast(paymentSummary(p).replace(/\n/g, ' ')); reloadAll(); }} />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

