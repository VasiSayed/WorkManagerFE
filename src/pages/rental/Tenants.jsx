import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { Btn, Card, FilterChips, PageHeader, TableWrapper, Td, Th, Toast } from '../../components/UI';
import { Icon } from '../../components/Icons';
import { T } from '../../theme';
import PaymentModal, { paymentSummary } from './PaymentModal';
import {
  CardTitle, Empty, ErrorBox, FilePick, FormGrid, FormModal, isPositive, KV, LinkBtn, Loading, Muted, openFile, Pick, pm,
  prettyDate, PropertyFilter, rupees, runAction, Stat, StatGrid, StatusPill, TextArea, TextIn, titleCase, toFormData, Toolbar,
  useForm, useLoad,
} from './shared';

const emptyTenant = {
  full_name: '', mobile: '', alternate_mobile: '', email: '', address: '', id_type: '', id_number: '',
  emergency_contact_name: '', emergency_contact_phone: '', status: 'active', notes: '',
};

export function TenantModal({ open, tenant, onClose, onSaved }) {
  const [form, set, setForm] = useForm(emptyTenant);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(emptyTenant);
    if (!tenant) return;
    // Lists and summaries mask the ID number; only the single-tenant endpoint returns it in full.
    pm.tenant(tenant.id)
      .then((full) => setForm(Object.fromEntries(Object.keys(emptyTenant).map((k) => [k, full[k] ?? '']))))
      .catch((err) => setError(getErrorMessage(err)));
  }, [open, tenant, setForm]);

  const submit = async () => {
    setBusy(true); setError('');
    try { onSaved(await pm.saveTenant(form, tenant?.id)); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <FormModal open={open} onClose={onClose} title={tenant ? `Edit ${tenant.full_name}` : 'New tenant'} onSubmit={submit} busy={busy} error={error} disabled={!form.full_name.trim() || !form.mobile.trim()}>
      <FormGrid>
        <TextIn label="Full name" required value={form.full_name} onChange={set('full_name')} autoFocus />
        <TextIn label="Mobile" required type="tel" value={form.mobile} onChange={set('mobile')} />
        <TextIn label="Alternate mobile" type="tel" value={form.alternate_mobile} onChange={set('alternate_mobile')} />
        <TextIn label="Email" type="email" value={form.email} onChange={set('email')} />
        <TextIn label="ID type" value={form.id_type} onChange={set('id_type')} placeholder="Aadhaar, PAN, Passport" />
        <TextIn label="ID number" value={form.id_number} onChange={set('id_number')} />
        <TextIn label="Emergency contact" value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
        <TextIn label="Emergency phone" type="tel" value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} />
        <Pick label="Status" value={form.status} onChange={set('status')} options={[['active', 'Active'], ['prospective', 'Prospective'], ['former', 'Former']]} />
      </FormGrid>
      <TextArea label="Address" value={form.address} onChange={set('address')} />
      <TextArea label="Notes" value={form.notes} onChange={set('notes')} />
    </FormModal>
  );
}

export function TenantsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [modal, setModal] = useState(false);
  const properties = useLoad(() => pm.properties(), []);
  const tenants = useLoad(() => pm.tenants({ status: status === 'all' ? '' : status, search, property: propertyId }), [status, search, propertyId]);

  return (
    <div>
      <PageHeader title="Tenants" sub="People renting your units. Open a tenant for their agreements, dues, payments and documents." action={<Btn variant="gold" onClick={() => setModal(true)}><Icon name="plus" size={15} /> Add tenant</Btn>} />
      <Toolbar>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or mobile…" style={{ padding: '9px 11px', border: `1px solid ${T.border}`, borderRadius: 8, minWidth: 240, fontFamily: 'inherit' }} />
        <PropertyFilter properties={properties.data} value={propertyId} onChange={setPropertyId} />
      </Toolbar>
      <FilterChips options={[['active', 'Active'], ['prospective', 'Prospective'], ['former', 'Former'], ['all', 'All']]} active={status} onChange={setStatus} />
      <ErrorBox message={tenants.error} onRetry={tenants.reload} />
      <Card>
        {tenants.loading && !tenants.data ? <Loading /> : (tenants.data || []).length === 0 ? <Empty>No tenants found.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Name</Th><Th>Mobile</Th><Th>Current unit</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {tenants.data.map((t, i) => (
                <tr key={t.id}>
                  <Td alt={i % 2}><Link to={`/rental/tenants/${t.id}`} style={{ color: T.navy, fontWeight: 700 }}>{t.full_name}</Link></Td>
                  <Td alt={i % 2}>{t.mobile ? <a href={`tel:${t.mobile}`} style={{ color: T.slate }}>{t.mobile}</a> : '—'}</Td>
                  <Td alt={i % 2}>{t.current_agreement ? `${t.current_agreement.unit_name} · ${t.current_agreement.property_name}` : <span style={{ color: T.slateLight }}>No active agreement</span>}</Td>
                  <Td alt={i % 2}><StatusPill status={t.status === 'former' ? 'cancelled' : t.status === 'prospective' ? 'pending' : 'active'} label={titleCase(t.status)} /></Td>
                  <Td alt={i % 2}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <Link to={`/rental/tenants/${t.id}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>Open ›</Link>
                      {!t.current_agreement && <Link to={`/rental/agreements/new?tenant=${t.id}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>+ Agreement</Link>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        )}
      </Card>
      <TenantModal open={modal} onClose={() => setModal(false)} onSaved={(t) => { setModal(false); navigate(`/rental/tenants/${t.id}`); }} />
    </div>
  );
}

export function TenantDetailPage() {
  const { id } = useParams();
  const tenantId = Number(id);
  const navigate = useNavigate();
  const summary = useLoad(() => pm.tenantSummary(tenantId), [tenantId]);
  const [edit, setEdit] = useState(false);
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('charges');
  const s = summary.data;

  if (summary.loading && !s) return <Loading />;
  if (!s) return <ErrorBox message={summary.error || 'Tenant not found'} onRetry={summary.reload} />;
  const t = s.tenant;
  const b = s.balance;
  const current = s.current_agreements[0];

  const reverse = (p) => {
    const reason = window.prompt(`Reverse payment of ${rupees(p.amount)} on ${prettyDate(p.payment_date)}?\n\nThe charges it paid become outstanding again. Enter a reason:`);
    if (!reason) return;
    runAction({ action: () => pm.reversePayment(p.id, reason), onDone: summary.reload, onError: setError });
  };
  const applyCredit = (agreementId) => runAction({
    confirmText: 'Use the advance credit to pay open charges (oldest first)?',
    action: () => pm.applyCredit(agreementId),
    onDone: (r) => { setToast(`Applied ${rupees(r.allocated)} to ${r.count} charge(s).`); return summary.reload(); },
    onError: setError,
  });
  const uploadId = (file) => file && runAction({
    action: () => pm.uploadDocument(toFormData({ tenant: tenantId, agreement: current?.id, title: file.name, doc_type: 'identity' }, { file })),
    onDone: summary.reload,
    onError: setError,
  });

  return (
    <div>
      <PageHeader
        title={t.full_name}
        sub={[t.mobile, t.email, t.current_agreement ? `${t.current_agreement.unit_name} · ${t.current_agreement.property_name}` : 'No active agreement'].filter(Boolean).join(' · ')}
        action={<>
          <Btn variant="outline" onClick={() => navigate('/rental/tenants')}><Icon name="arrowLeft" size={14} /> Tenants</Btn>
          <Btn variant="outline" onClick={() => setEdit(true)}><Icon name="edit" size={14} /> Edit</Btn>
          {current && <Btn variant="gold" onClick={() => setTarget({ agreementId: current.id, tenantName: t.full_name, unitName: `${current.unit_name} · ${current.property_name}` })}><Icon name="wallet" size={14} /> Collect payment</Btn>}
          {!current && <Link to={`/rental/agreements/new?tenant=${tenantId}`}><Btn variant="gold"><Icon name="plus" size={14} /> New agreement</Btn></Link>}
        </>}
      />
      <ErrorBox message={error} />

      <StatGrid>
        <Stat label="Total outstanding" value={rupees(b.total_outstanding)} tone={isPositive(b.total_outstanding) ? T.error : T.success} sub={isPositive(b.overdue) ? `${rupees(b.overdue)} overdue` : 'Nothing overdue'} />
        <Stat label="Total paid" value={rupees(b.total_paid)} tone={T.success} sub={`of ${rupees(b.total_charges)} charged`} />
        <Stat label="Advance credit" value={rupees(b.advance_credit)} tone={T.info} />
        <Stat label="Deposit held" value={rupees(s.deposit.balance)} tone={T.gold} sub={`Received ${rupees(s.deposit.received)}`} />
      </StatGrid>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, marginBottom: 16 }}>
        <Card>
          <CardTitle title="Agreements" />
          {s.current_agreements.length === 0 && <Muted>No current agreement.</Muted>}
          {[...s.current_agreements, ...s.previous_agreements].map((a) => (
            <div key={a.id} style={{ padding: '8px 0', borderBottom: `1px dashed ${T.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <Link to={`/rental/agreements/${a.id}`} style={{ color: T.navy, fontWeight: 700 }}>{a.unit_name} · {a.property_name}</Link>
                <StatusPill status={a.status === 'active' ? a.expiry_state : a.status} />
              </div>
              <Muted>{rupees(a.current_rent)}/month · {prettyDate(a.start_date)} → {prettyDate(a.end_date)}</Muted>
              {a.status === 'active' && isPositive(b.advance_credit) && isPositive(b.total_outstanding) && <LinkBtn onClick={() => applyCredit(a.id)}>Apply advance credit to dues</LinkBtn>}
            </div>
          ))}
        </Card>
        <Card>
          <CardTitle title="Outstanding by type" />
          <KV label="Rent" value={rupees(b.rent)} />
          <KV label="Fixed charges" value={rupees(b.fixed)} />
          <KV label="Electricity" value={rupees(b.electricity)} />
          <KV label="Recoverable expenses" value={rupees(b.expense)} />
          <KV label="One-time" value={rupees(b.one_time)} />
          <KV label="Net balance (after credit)" value={rupees(b.net_balance)} strong />
        </Card>
        <Card>
          <CardTitle title="Contact & identity" />
          <KV label="Mobile" value={t.mobile || '—'} />
          {t.alternate_mobile && <KV label="Alternate" value={t.alternate_mobile} />}
          <KV label="Email" value={t.email || '—'} />
          <KV label="ID" value={t.id_type ? `${t.id_type} ${t.id_number || ''}` : '—'} />
          <KV label="Emergency" value={t.emergency_contact_name ? `${t.emergency_contact_name} ${t.emergency_contact_phone || ''}` : '—'} />
          {t.address && <Muted style={{ marginTop: 8 }}>{t.address}</Muted>}
          {t.notes && <Muted style={{ marginTop: 8 }}>{t.notes}</Muted>}
        </Card>
      </div>

      <FilterChips
        options={[['charges', `Charges (${s.charges.length})`], ['payments', `Payments (${s.payments.length})`], ['deposit', 'Deposit'], ['revisions', 'Rent history'], ['expenses', 'Expenses'], ['documents', `Documents (${s.documents.length})`]]}
        active={tab}
        onChange={setTab}
      />
      <Card>
        {tab === 'charges' && (s.charges.length === 0 ? <Empty>No charges yet.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Due</Th><Th>Description</Th><Th>Type</Th><Th>Amount</Th><Th>Paid</Th><Th>Outstanding</Th><Th>Status</Th></tr></thead>
            <tbody>
              {s.charges.map((c, i) => (
                <tr key={c.id}>
                  <Td alt={i % 2}>{prettyDate(c.due_date)}</Td>
                  <Td alt={i % 2}>{c.description}{c.adjustments?.length > 0 && <Muted>{c.adjustments.map((a) => `${Number(a.amount) > 0 ? '+' : ''}${rupees(a.amount)} (${a.reason})`).join(', ')}</Muted>}{c.is_void && <Muted>Void: {c.void_reason}</Muted>}</Td>
                  <Td alt={i % 2}>{titleCase(c.charge_type)}</Td>
                  <Td alt={i % 2}>{rupees(c.net_amount)}</Td>
                  <Td alt={i % 2}>{rupees(c.paid)}</Td>
                  <Td alt={i % 2}><strong style={{ color: isPositive(c.outstanding) ? T.error : T.success }}>{rupees(c.outstanding)}</strong></Td>
                  <Td alt={i % 2}><StatusPill status={c.is_void ? 'cancelled' : c.status} label={c.is_void ? 'Void' : undefined} /></Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        ))}

        {tab === 'payments' && (s.payments.length === 0 ? <Empty>No payments yet.</Empty> : (
          <TableWrapper>
            <thead><tr><Th>Date</Th><Th>Amount</Th><Th>Method</Th><Th>Applied to</Th><Th>Reference</Th><Th /></tr></thead>
            <tbody>
              {s.payments.map((p, i) => (
                <tr key={p.id} style={{ opacity: p.is_reversed ? 0.55 : 1 }}>
                  <Td alt={i % 2}>{prettyDate(p.payment_date)}</Td>
                  <Td alt={i % 2}><strong>{rupees(p.amount)}</strong>{p.is_reversed && <Muted>Reversed: {p.reversal_reason}</Muted>}</Td>
                  <Td alt={i % 2}>{titleCase(p.method)}</Td>
                  <Td alt={i % 2}>{p.allocations.map((a) => `${a.charge_description} ${rupees(a.amount)}`).join(', ') || '—'}{isPositive(p.unapplied_amount) && <Muted>Credit {rupees(p.unapplied_amount)}</Muted>}</Td>
                  <Td alt={i % 2}>{p.reference || '—'}</Td>
                  <Td alt={i % 2}>{!p.is_reversed && <LinkBtn danger onClick={() => reverse(p)}>Reverse</LinkBtn>}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
        ))}

        {tab === 'deposit' && (
          <>
            <div style={{ maxWidth: 420, marginBottom: 12 }}>
              <KV label="Received" value={rupees(s.deposit.received)} />
              <KV label="Refunded" value={rupees(s.deposit.refunded)} />
              <KV label="Used for dues" value={rupees(s.deposit.applied_to_dues)} />
              <KV label="Deductions" value={rupees(s.deposit.deducted)} />
              <KV label="Held now" value={rupees(s.deposit.balance)} strong />
            </div>
            {s.deposit_transactions.length === 0 ? <Muted>No deposit transactions. Record a deposit from the agreement page.</Muted> : s.deposit_transactions.map((d) => (
              <KV key={d.id} label={`${prettyDate(d.txn_date)} · ${titleCase(d.txn_type)}${d.notes ? ` · ${d.notes}` : ''}`} value={rupees(d.amount)} />
            ))}
          </>
        )}

        {tab === 'revisions' && (s.rent_revisions.length === 0 ? <Empty>No rent revisions.</Empty> : s.rent_revisions.map((r) => (
          <KV key={r.id} label={`From ${prettyDate(r.effective_date)}${r.reason ? ` · ${r.reason}` : ''}`} value={`${rupees(r.previous_rent)} → ${rupees(r.new_rent)}`} />
        )))}

        {tab === 'expenses' && (s.expenses.length === 0 ? <Empty>No expenses linked to this tenant.</Empty> : s.expenses.map((e) => (
          <KV key={e.id} label={`${prettyDate(e.expense_date)} · ${e.title}`} value={e.is_recoverable ? `${rupees(e.recoverable_amount)} recoverable · ${titleCase(e.recovery.status)}` : rupees(e.amount)} />
        )))}

        {tab === 'documents' && (
          <>
            <div style={{ maxWidth: 360, marginBottom: 12 }}><FilePick label="Upload ID proof / document" onChange={uploadId} /></div>
            {s.documents.length === 0 ? <Empty>No documents.</Empty> : s.documents.map((d) => (
              <KV key={d.id} label={`${d.title} · ${titleCase(d.doc_type)}`} value={<LinkBtn onClick={() => openFile(d.open_url)}>Open ({prettyDate(d.created_at)})</LinkBtn>} />
            ))}
          </>
        )}
      </Card>

      <TenantModal open={edit} tenant={t} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); summary.reload(); }} />
      <PaymentModal target={target} onClose={() => setTarget(null)} onSaved={(p) => { setTarget(null); setToast(paymentSummary(p).replace(/\n/g, ' ')); summary.reload(); }} />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
