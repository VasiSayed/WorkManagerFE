import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { Btn, Card, PageHeader, TableWrapper, Td, Th } from '../../components/UI';
import { Icon } from '../../components/Icons';
import { T } from '../../theme';
import {
  CardTitle, Check, currentMonth, Empty, ErrorBox, FormGrid, FormModal, LinkBtn, Loading, localDate, MoneyIn,
  Muted, parseAmount, Pick, pm, prettyDate, PropertyFilter, rupees, runAction, Segmented, StatusPill, TextIn, Toolbar, useLoad,
  useOptions,
} from './shared';

const FREQUENCIES = [['1', 'Monthly'], ['3', 'Quarterly'], ['6', 'Half-yearly'], ['12', 'Yearly']];

/** defaults: { scope: 'agreement'|'unit'|'property', agreement?, property?, unit? } */
export function RecurringChargeModal({ open, defaults = {}, onClose, onSaved }) {
  const options = useOptions();
  const [scope, setScope] = useState('agreement');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [agreementId, setAgreementId] = useState('');
  const [name, setName] = useState('Water charge');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('1');
  const [start, setStart] = useState(`${currentMonth()}-01`);
  const [end, setEnd] = useState('');
  const [included, setIncluded] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const properties = useLoad(() => (open ? pm.properties() : Promise.resolve([])), [open]);
  const agreements = useLoad(() => (open ? pm.agreements({ status: 'active' }) : Promise.resolve([])), [open]);
  const units = useLoad(() => (open && scope === 'unit' && propertyId ? pm.units({ property: propertyId }) : Promise.resolve([])), [open, scope, propertyId]);

  useEffect(() => {
    if (!open) return;
    setScope(defaults.scope || 'agreement');
    setPropertyId(defaults.property ? String(defaults.property) : '');
    setUnitId(defaults.unit ? String(defaults.unit) : '');
    setAgreementId(defaults.agreement ? String(defaults.agreement) : '');
    setName('Water charge'); setAmount(''); setFrequency('1'); setStart(`${currentMonth()}-01`); setEnd(''); setIncluded(true); setError('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = scope === 'agreement' ? agreementId : scope === 'unit' ? unitId : propertyId;
  const valid = target && name.trim() && parseAmount(amount) && start;

  const submit = async () => {
    setBusy(true); setError('');
    try {
      onSaved(await pm.saveRecurringCharge({
        name, amount: parseAmount(amount), frequency: Number(frequency), start_date: start, end_date: end || null, included_in_monthly_due: included,
        property: scope === 'property' ? Number(propertyId) : null,
        unit: scope === 'unit' ? Number(unitId) : null,
        agreement: scope === 'agreement' ? Number(agreementId) : null,
      }));
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const freq = (options.recurring_frequencies || []).map((o) => [String(o.value), o.label]);

  return (
    <FormModal open={open} onClose={onClose} title="Fixed charge" subtitle="Water, maintenance, parking… added to the tenant's dues automatically" onSubmit={submit} busy={busy} error={error} disabled={!valid}>
      <div><div style={{ fontSize: 12, fontWeight: 700, color: T.slate, marginBottom: 5 }}>Applies to</div>
        <Segmented value={scope} onChange={setScope} options={[['agreement', 'One tenant'], ['unit', 'A unit'], ['property', 'Whole property']]} />
      </div>
      <FormGrid>
        {scope === 'agreement'
          ? <Pick label="Tenant agreement" required value={agreementId} onChange={setAgreementId} placeholder="Choose…" options={(agreements.data || []).map((a) => [String(a.id), `${a.tenant_name} · ${a.unit_name}`])} />
          : <Pick label="Property" required value={propertyId} onChange={(v) => { setPropertyId(v); setUnitId(''); }} placeholder="Choose…" options={(properties.data || []).map((p) => [String(p.id), p.name])} />}
        {scope === 'unit' && <Pick label="Unit" required value={unitId} onChange={setUnitId} placeholder="Choose…" options={(units.data || []).map((u) => [String(u.id), u.name])} />}
        <TextIn label="Name" required value={name} onChange={setName} placeholder="e.g. Water, Maintenance" />
        <MoneyIn label="Amount (₹)" required value={amount} onChange={setAmount} />
        <Pick label="Frequency" value={frequency} onChange={setFrequency} options={freq.length ? freq : FREQUENCIES} />
        <TextIn label="Starts from" type="date" value={start} onChange={setStart} />
        <TextIn label="Ends (optional)" type="date" value={end} onChange={setEnd} />
      </FormGrid>
      {scope !== 'agreement' && <Muted>Charged to every active tenant in the selected {scope}.</Muted>}
      <Check label="Include in monthly amount due" hint="Shown together with rent on the Collect page." checked={included} onChange={setIncluded} />
    </FormModal>
  );
}

function ReminderSettingsCard() {
  const settings = useLoad(() => pm.reminderSettings(), []);
  const [days, setDays] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => { if (settings.data) setDays(String(settings.data.days_before)); }, [settings.data]);
  const saveSettings = async (data) => {
    setMsg('');
    try { settings.setData(await pm.saveReminderSettings(data)); setMsg('Saved'); }
    catch (err) { setMsg(getErrorMessage(err)); }
  };
  return (
    <Card style={{ marginBottom: 16 }}>
      <CardTitle title="Renewal reminders" sub="Agreements nearing expiry appear on the Rental dashboard." />
      {settings.loading && !settings.data ? <Loading /> : settings.data && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Check label="Reminders enabled" checked={settings.data.enabled} onChange={(enabled) => saveSettings({ enabled })} />
          <div style={{ width: 180 }}><TextIn label="Days before expiry" type="number" min="1" value={days} onChange={setDays} /></div>
          <Btn variant="outline" onClick={() => saveSettings({ days_before: Number(days) })} disabled={!Number(days)}>Save</Btn>
          {msg && <Muted>{msg}</Muted>}
        </div>
      )}
    </Card>
  );
}

export function ChargesPage() {
  const [propertyId, setPropertyId] = useState('');
  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  const properties = useLoad(() => pm.properties(), []);
  const charges = useLoad(() => pm.recurringCharges({ property: propertyId }), [propertyId]);

  const discontinue = (r) => {
    const end = window.prompt(`Stop "${r.name}" after which month? (YYYY-MM)`, currentMonth());
    if (!end) return;
    runAction({ action: () => pm.discontinueRecurringCharge(r.id, end), onDone: charges.reload, onError: setError });
  };
  const toggle = (r) => runAction({ action: () => pm.saveRecurringCharge({ is_enabled: !r.is_enabled }, r.id), onDone: charges.reload, onError: setError });

  const today = localDate();
  return (
    <div>
      <PageHeader title="Fixed Charges & Settings" sub="Recurring charges such as water or maintenance, and reminder settings." action={<Btn variant="gold" onClick={() => setModal(true)}><Icon name="plus" size={15} /> Add fixed charge</Btn>} />
      <ErrorBox message={error || charges.error} />
      <ReminderSettingsCard />
      <Card>
        <CardTitle title="Fixed charges" action={<PropertyFilter properties={properties.data} value={propertyId} onChange={setPropertyId} />} />
        {charges.loading && !charges.data ? <Loading /> : (charges.data || []).length === 0 ? <Empty>No fixed charges yet.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Name</Th><Th>Applies to</Th><Th>Amount</Th><Th>Every</Th><Th>From</Th><Th>Until</Th><Th>State</Th><Th /></tr></thead>
            <tbody>
              {charges.data.map((r, i) => {
                const ended = r.end_date && r.end_date < today;
                return (
                  <tr key={r.id}>
                    <Td alt={i % 2}><strong>{r.name}</strong>{!r.included_in_monthly_due && <Muted>Not in monthly due</Muted>}</Td>
                    <Td alt={i % 2}>{r.agreement ? <Link to={`/rental/agreements/${r.agreement}`} style={{ color: T.navy, fontWeight: 600 }}>{r.scope_label}</Link> : r.scope_label}</Td>
                    <Td alt={i % 2}>{rupees(r.amount)}</Td>
                    <Td alt={i % 2}>{(FREQUENCIES.find(([v]) => v === String(r.frequency)) || [])[1] || `${r.frequency} months`}</Td>
                    <Td alt={i % 2}>{prettyDate(r.start_date)}</Td>
                    <Td alt={i % 2}>{prettyDate(r.end_date)}</Td>
                    <Td alt={i % 2}><StatusPill status={ended ? 'cancelled' : r.is_enabled ? 'active' : 'pending'} label={ended ? 'Ended' : r.is_enabled ? 'Active' : 'Paused'} /></Td>
                    <Td alt={i % 2}>{!ended && <div style={{ display: 'flex', gap: 12 }}><LinkBtn onClick={() => toggle(r)}>{r.is_enabled ? 'Pause' : 'Resume'}</LinkBtn><LinkBtn danger onClick={() => discontinue(r)}>Stop</LinkBtn></div>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrapper>
        )}
      </Card>
      <RecurringChargeModal open={modal} defaults={{ scope: 'agreement' }} onClose={() => setModal(false)} onSaved={() => { setModal(false); charges.reload(); }} />
    </div>
  );
}

