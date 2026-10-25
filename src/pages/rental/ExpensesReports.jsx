import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { Btn, Card, PageHeader, TableWrapper, Td, Th, Toast } from '../../components/UI';
import { Icon } from '../../components/Icons';
import { T } from '../../theme';
import PaymentModal, { paymentSummary } from './PaymentModal';
import {
  CardTitle, Check, choiceOptions, currentMonth, Empty, ErrorBox, FilePick, FormGrid, FormModal, isPositive, KV, LinkBtn,
  Loading, localDate, MoneyIn, monthLabel, MonthBar, Muted, openFile, parseAmount, Pick, pm, prettyDate, PropertyFilter, rupees,
  runAction, Stat, StatGrid, StatusPill, TextArea, TextIn, titleCase, toFormData, Toolbar, useLoad, useOptions,
} from './shared';

function ExpenseModal({ open, expense, properties, onClose, onSaved }) {
  const options = useOptions();
  const [f, setF] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const agreements = useLoad(() => (open && f.property ? pm.agreements({ status: 'active', property: f.property }) : Promise.resolve([])), [open, f.property]);

  useEffect(() => {
    if (!open) return;
    setError(''); setReceipt(null);
    setF(expense ? {
      property: String(expense.property), agreement: expense.agreement ? String(expense.agreement) : '', title: expense.title, category: expense.category,
      amount: String(Number(expense.amount)), date: expense.expense_date, recoverable: expense.is_recoverable,
      recoverAmount: String(Number(expense.recoverable_amount)), description: expense.description,
    } : {
      property: properties.length === 1 ? String(properties[0].id) : '', agreement: '', title: '', category: 'other', amount: '', date: localDate(),
      recoverable: false, recoverAmount: '', description: '',
    });
  }, [open, expense, properties]);

  const parsed = parseAmount(f.amount);
  const parsedRecover = f.recoverAmount ? parseAmount(f.recoverAmount) : parsed;
  const tooMuch = f.recoverable && parsed && parsedRecover && Number(parsedRecover) > Number(parsed);
  const valid = f.property && f.title?.trim() && parsed && f.date && (!f.recoverable || (f.agreement && parsedRecover && !tooMuch));

  const submit = async () => {
    setBusy(true); setError('');
    try {
      onSaved(await pm.saveExpense(toFormData({
        property: f.property, agreement: f.agreement || '', title: f.title, category: f.category, amount: parsed, expense_date: f.date,
        is_recoverable: !!f.recoverable, recoverable_amount: f.recoverable ? parsedRecover : '0', description: f.description,
      }, { receipt }), expense?.id));
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const categories = choiceOptions(options.expense_categories);
  return (
    <FormModal open={open} onClose={onClose} title={expense ? 'Edit expense' : 'Record property expense'} subtitle="The full amount counts as the owner's expense; only the recoverable part is charged to the tenant." onSubmit={submit} busy={busy} error={error} disabled={!valid}>
      <FormGrid>
        <Pick label="Property" required value={f.property} onChange={(v) => setF((x) => ({ ...x, property: v, agreement: '' }))} placeholder="Choose…" options={properties.map((p) => [String(p.id), p.name])} />
        <Pick label="Tenant / unit" value={f.agreement} onChange={set('agreement')} placeholder="Property-wide expense" options={(agreements.data || []).map((a) => [String(a.id), `${a.tenant_name} · ${a.unit_name}`])} />
        <TextIn label="What was it for?" required value={f.title} onChange={set('title')} placeholder="e.g. Plumbing repair" />
        <Pick label="Category" value={f.category} onChange={set('category')} options={categories.length ? categories : [['other', 'Other']]} />
        <MoneyIn label="Amount paid (₹)" required value={f.amount} onChange={set('amount')} />
        <TextIn label="Date" type="date" value={f.date} onChange={set('date')} />
      </FormGrid>
      <Check label="Recover from tenant" hint={f.agreement ? "Adds the amount to the tenant's outstanding balance." : 'Choose a tenant above first.'} checked={f.recoverable} onChange={set('recoverable')} />
      {f.recoverable && <MoneyIn label="Amount to recover (₹)" value={f.recoverAmount} onChange={set('recoverAmount')} placeholder={parsed ? String(Number(parsed)) : 'Same as amount'} error={tooMuch ? 'Cannot recover more than the expense amount' : undefined} />}
      <FilePick label={expense?.receipt_open_url ? 'Replace receipt' : 'Receipt / invoice'} file={receipt} onChange={setReceipt} />
      {expense?.receipt_open_url && <LinkBtn onClick={() => openFile(expense.receipt_open_url)}>View current receipt</LinkBtn>}
      <TextArea label="Notes" value={f.description} onChange={set('description')} />
    </FormModal>
  );
}

export function RentalExpensesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [allMonths, setAllMonths] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const [modal, setModal] = useState(null); // { expense? }
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const properties = useLoad(() => pm.properties(), []);
  const expenses = useLoad(() => pm.expenses({ property: propertyId, month: allMonths ? '' : month }), [propertyId, month, allMonths]);
  const rows = expenses.data || [];
  const total = rows.reduce((s, e) => s + Number(e.amount), 0);
  const recoverable = rows.reduce((s, e) => s + (e.is_recoverable ? Number(e.recoverable_amount) : 0), 0);
  const pending = rows.reduce((s, e) => s + (e.is_recoverable ? Number(e.recovery.pending) : 0), 0);

  const remove = (e) => runAction({ confirmText: `Delete expense "${e.title}"?`, action: () => pm.deleteExpense(e.id), onDone: expenses.reload, onError: setError });

  return (
    <div>
      <PageHeader title="Property Expenses" sub="Repairs and costs for your properties. Mark an expense recoverable to charge it to a tenant." action={<Btn variant="gold" onClick={() => setModal({})}><Icon name="plus" size={15} /> Record expense</Btn>} />
      <Toolbar>
        {!allMonths && <MonthBar month={month} onChange={setMonth} />}
        <Check label="All months" checked={allMonths} onChange={setAllMonths} />
        <PropertyFilter properties={properties.data} value={propertyId} onChange={setPropertyId} />
      </Toolbar>
      <ErrorBox message={error || expenses.error} />
      <StatGrid>
        <Stat label="Total spent" value={rupees(total)} sub={allMonths ? 'All months' : monthLabel(month)} />
        <Stat label="Recoverable" value={rupees(recoverable)} tone={T.info} />
        <Stat label="Recovery pending" value={rupees(pending)} tone={isPositive(pending) ? T.warning : T.success} />
      </StatGrid>
      <Card>
        {expenses.loading && !expenses.data ? <Loading /> : rows.length === 0 ? <Empty>No expenses recorded.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Date</Th><Th>Expense</Th><Th>Property / tenant</Th><Th>Amount</Th><Th>Recovery</Th><Th /></tr></thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.id}>
                  <Td alt={i % 2}>{prettyDate(e.expense_date)}</Td>
                  <Td alt={i % 2}><strong>{e.title}</strong><Muted>{titleCase(e.category)}</Muted></Td>
                  <Td alt={i % 2}>{e.property_name}{e.tenant_name && <Muted>{e.tenant_name}{e.unit_name ? ` · ${e.unit_name}` : ''}</Muted>}</Td>
                  <Td alt={i % 2}>{rupees(e.amount)}</Td>
                  <Td alt={i % 2}>{e.is_recoverable ? <><StatusPill status={e.recovery.status} /><Muted>{rupees(e.recovery.recovered)} of {rupees(e.recoverable_amount)}</Muted></> : <span style={{ color: T.slateLight }}>Owner expense</span>}</Td>
                  <Td alt={i % 2}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {e.is_recoverable && isPositive(e.recovery.pending) && e.recovery.charge_id && e.agreement && (
                        <LinkBtn onClick={() => setTarget({ agreementId: e.agreement, tenantName: e.tenant_name || 'Tenant', unitName: e.title, amount: e.recovery.pending, chargeIds: [e.recovery.charge_id] })}>Collect {rupees(e.recovery.pending)}</LinkBtn>
                      )}
                      {e.receipt_open_url && <LinkBtn onClick={() => openFile(e.receipt_open_url)}>Receipt</LinkBtn>}
                      <LinkBtn onClick={() => setModal({ expense: e })}>Edit</LinkBtn>
                      <LinkBtn danger onClick={() => remove(e)}>Delete</LinkBtn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>
      <ExpenseModal open={!!modal} expense={modal?.expense} properties={properties.data || []} onClose={() => setModal(null)}
        onSaved={(e) => { setModal(null); if (e.is_recoverable) setToast(`${rupees(e.recoverable_amount)} added to the tenant's outstanding balance.`); expenses.reload(); }} />
      <PaymentModal target={target} onClose={() => setTarget(null)} onSaved={(p) => { setTarget(null); setToast(paymentSummary(p).replace(/\n/g, ' ')); expenses.reload(); }} />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

/* ── Monthly report ── */

function TenantGroup({ title, people, tone }) {
  if (!people?.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: tone, marginBottom: 2 }}>{title} ({people.length})</div>
      {people.map((p) => <KV key={p.agreement_id} label={`${p.tenant_name} · ${p.unit_name}`} value={isPositive(p.balance) ? `${rupees(p.balance)} due` : rupees(p.paid)} />)}
    </div>
  );
}

function Totals({ title, totals }) {
  return (
    <Card>
      <CardTitle title={title} />
      <KV label="Charged" value={rupees(totals.amount)} />
      <KV label="Collected" value={rupees(totals.paid)} tone={T.success} />
      <KV label="Outstanding" value={rupees(totals.outstanding)} strong />
    </Card>
  );
}

export function RentalReportsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [propertyId, setPropertyId] = useState('');
  const properties = useLoad(() => pm.properties(), []);
  const report = useLoad(() => pm.monthlyReport({ month, property: propertyId }), [month, propertyId]);
  const r = report.data;

  return (
    <div>
      <PageHeader title="Rental Reports" sub="Monthly summary of rent, charges, electricity, expenses and payments." action={<Btn variant="outline" onClick={() => window.print()}><Icon name="download" size={14} /> Print</Btn>} />
      <Toolbar>
        <MonthBar month={month} onChange={setMonth} />
        <PropertyFilter properties={properties.data} value={propertyId} onChange={setPropertyId} />
      </Toolbar>
      <ErrorBox message={report.error} onRetry={report.reload} />
      {report.loading && !r ? <Loading /> : r ? (
        <>
          <StatGrid>
            <Stat label="Expected rent" value={rupees(r.rent.amount)} sub={monthLabel(month)} />
            <Stat label="Rent collected" value={rupees(r.rent.paid)} tone={T.success} />
            <Stat label="Rent remaining" value={rupees(r.rent.outstanding)} tone={isPositive(r.rent.outstanding) ? T.error : T.success} />
            <Stat label="Payments received" value={rupees(r.payments_received.total)} tone={T.info} />
            <Stat label="Expenses" value={rupees(r.expenses.total)} tone={T.warning} />
          </StatGrid>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
            <Card>
              <CardTitle title="Rent collection" action={<Link to="/rental/collection"><Btn variant="outline">Collect</Btn></Link>} />
              <KV label="Expected" value={rupees(r.rent.amount)} />
              <KV label="Collected" value={rupees(r.rent.paid)} tone={T.success} />
              <KV label="Remaining" value={rupees(r.rent.outstanding)} strong />
              <TenantGroup title="Overdue" people={r.rent.overdue_tenants} tone={T.error} />
              <TenantGroup title="Unpaid" people={r.rent.unpaid_tenants} tone={T.info} />
              <TenantGroup title="Partially paid" people={r.rent.partially_paid_tenants} tone={T.warning} />
              <TenantGroup title="Paid" people={r.rent.paid_tenants} tone={T.success} />
            </Card>
            <Totals title="Fixed monthly charges" totals={r.fixed_charges} />
            <Card>
              <CardTitle title="Electricity" />
              <KV label="Provider bills" value={rupees(r.electricity.billed)} />
              <KV label="Charged to tenants" value={rupees(r.electricity.amount)} />
              <KV label="Collected" value={rupees(r.electricity.paid)} tone={T.success} />
              <KV label="Outstanding" value={rupees(r.electricity.outstanding)} strong />
              {isPositive(r.electricity.owner_absorbed) && <KV label="Paid by owner" value={rupees(r.electricity.owner_absorbed)} />}
            </Card>
            <Card>
              <CardTitle title="Property expenses" />
              <KV label="Total spent" value={rupees(r.expenses.total)} strong />
              {Object.entries(r.expenses.by_category || {}).map(([k, v]) => <KV key={k} label={`· ${titleCase(k)}`} value={rupees(v)} />)}
              <KV label="Recoverable from tenants" value={rupees(r.expenses.recoverable)} />
              <KV label="Recovered" value={rupees(r.expenses.recovered)} tone={T.success} />
              <KV label="Recovery pending" value={rupees(r.expenses.recovery_pending)} />
              {(r.expenses.items || []).map((e) => <Muted key={e.id}>• {prettyDate(e.date)} {e.title}: {rupees(e.amount)}</Muted>)}
            </Card>
            <Card>
              <CardTitle title="Payments received" />
              <KV label="Total" value={rupees(r.payments_received.total)} strong />
              {Object.entries(r.payments_received.by_method || {}).map(([k, v]) => <KV key={k} label={`· ${titleCase(k)}`} value={rupees(v)} />)}
            </Card>
            <Card>
              <CardTitle title="Outstanding (all months)" />
              <KV label="Rent" value={rupees(r.outstanding_all_periods.rent)} />
              <KV label="Fixed charges" value={rupees(r.outstanding_all_periods.fixed)} />
              <KV label="Electricity" value={rupees(r.outstanding_all_periods.electricity)} />
              <KV label="Expenses" value={rupees(r.outstanding_all_periods.expense)} />
              <KV label="One-time" value={rupees(r.outstanding_all_periods.one_time)} />
              <KV label="Total" value={rupees(r.outstanding_all_periods.total)} strong tone={T.error} />
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
