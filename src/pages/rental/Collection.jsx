import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Btn, Card, FilterChips, PageHeader, TableWrapper, Td, Th, Toast } from '../../components/UI';
import { T } from '../../theme';
import PaymentModal, { paymentSummary } from './PaymentModal';
import {
  currentMonth, Empty, ErrorBox, isPositive, Loading, monthLabel, MonthBar, prettyDate, PropertyFilter, pm, rupees, Stat,
  StatGrid, StatusPill, titleCase, Toolbar, useLoad,
} from './shared';

const FILTERS = [['all', 'All'], ['due', 'Not fully paid'], ['overdue', 'Overdue'], ['unpaid', 'Unpaid'], ['partially_paid', 'Partially paid'], ['paid', 'Paid']];

export default function Collection() {
  const [month, setMonth] = useState(currentMonth());
  const [propertyId, setPropertyId] = useState('');
  const [filter, setFilter] = useState('due');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState('');
  const properties = useLoad(() => pm.properties(), []);
  const data = useLoad(() => pm.collection({ month, property: propertyId }), [month, propertyId]);
  const c = data.data;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (c?.rows || []).filter((r) => {
      if (filter === 'due' && r.status === 'paid') return false;
      if (!['all', 'due'].includes(filter) && r.status !== filter) return false;
      return !q || `${r.tenant_name} ${r.unit_name} ${r.property_name} ${r.tenant_mobile}`.toLowerCase().includes(q);
    });
  }, [c, filter, search]);

  const collect = (r) => setTarget({
    agreementId: r.agreement_id,
    tenantName: r.tenant_name,
    unitName: `${r.unit_name} · ${r.property_name}`,
    amount: isPositive(r.balance) ? r.balance : undefined,
    chargeIds: isPositive(r.balance) ? r.open_charge_ids : [],
  });

  return (
    <div>
      <PageHeader title="Rent Collection" sub="Everything due this month per tenant — rent plus fixed charges. Click Collect to record a payment." />
      <Toolbar>
        <MonthBar month={month} onChange={setMonth} />
        <PropertyFilter properties={properties.data} value={propertyId} onChange={setPropertyId} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tenant, unit, mobile…" style={{ padding: '9px 11px', border: `1px solid ${T.border}`, borderRadius: 8, minWidth: 220, fontFamily: 'inherit' }} />
      </Toolbar>
      <ErrorBox message={data.error} onRetry={data.reload} />

      {c && (
        <StatGrid>
          <Stat label="Expected" value={rupees(c.summary.expected)} sub={`Rent ${rupees(c.summary.rent_expected)} · ${monthLabel(c.month)}`} />
          <Stat label="Collected" value={rupees(c.summary.collected)} tone={T.success} />
          <Stat label="Remaining" value={rupees(c.summary.remaining)} tone={isPositive(c.summary.remaining) ? T.error : T.success} />
          <Stat label="Tenants" value={`${c.summary.paid} paid`} tone={T.info} sub={`${c.summary.partially_paid} partial · ${c.summary.unpaid} unpaid · ${c.summary.overdue} overdue`} />
        </StatGrid>
      )}

      <Card>
        <FilterChips options={FILTERS} active={filter} onChange={setFilter} />
        {data.loading && !c ? <Loading /> : rows.length === 0 ? (
          <Empty>{c?.rows.length ? 'No tenants match this filter.' : 'No active agreements for this month. Create agreements under Tenants.'}</Empty>
        ) : (
          <TableWrapper>
            <thead><tr><Th>Tenant</Th><Th>Unit</Th><Th>Due this month</Th><Th>Paid</Th><Th>Balance</Th><Th>Older dues</Th><Th>Status</Th><Th>Due date</Th><Th /></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const older = Number(r.total_outstanding) - Number(r.balance);
                return (
                  <Fragment key={r.agreement_id}>
                    <tr>
                      <Td alt={i % 2}>
                        <Link to={`/rental/tenants/${r.tenant_id}`} style={{ color: T.navy, fontWeight: 700 }}>{r.tenant_name}</Link>
                        <div style={{ fontSize: 11, color: T.slateLight }}>{r.tenant_mobile}</div>
                      </Td>
                      <Td alt={i % 2}>{r.unit_name}<div style={{ fontSize: 11, color: T.slateLight }}>{r.property_name}</div></Td>
                      <Td alt={i % 2}>
                        <button type="button" onClick={() => setExpanded(expanded === r.agreement_id ? null : r.agreement_id)} style={{ border: 0, background: 'none', cursor: 'pointer', color: T.navy, fontWeight: 700, fontFamily: 'inherit', fontSize: 13, padding: 0 }}>
                          {rupees(r.amount_due)} <span style={{ color: T.slateLight, fontSize: 11 }}>{expanded === r.agreement_id ? '▴' : '▾'}</span>
                        </button>
                      </Td>
                      <Td alt={i % 2}>{rupees(r.paid)}</Td>
                      <Td alt={i % 2}><strong style={{ color: isPositive(r.balance) ? T.error : T.success }}>{rupees(r.balance)}</strong></Td>
                      <Td alt={i % 2}>{older > 0.004 ? <span style={{ color: T.warning, fontWeight: 700 }}>{rupees(older)}</span> : '—'}{isPositive(r.advance_credit) && <div style={{ fontSize: 11, color: T.info }}>Credit {rupees(r.advance_credit)}</div>}</Td>
                      <Td alt={i % 2}><StatusPill status={r.status} /></Td>
                      <Td alt={i % 2}>{prettyDate(r.due_date)}</Td>
                      <Td alt={i % 2}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {isPositive(r.total_outstanding) || isPositive(r.balance)
                            ? <Btn variant="gold" style={{ padding: '6px 10px', whiteSpace: 'nowrap' }} onClick={() => collect(r)}>Collect {isPositive(r.balance) ? rupees(r.balance) : ''}</Btn>
                            : <Btn variant="outline" style={{ padding: '6px 10px' }} onClick={() => collect(r)}>Record</Btn>}
                        </div>
                      </Td>
                    </tr>
                    {expanded === r.agreement_id && (
                      <tr>
                        <td colSpan={9} style={{ background: T.goldLight, padding: '10px 18px', borderBottom: `1px solid ${T.border}` }}>
                          {r.lines.length === 0 ? <span style={{ fontSize: 12, color: T.slateLight }}>No charges this month.</span> : (
                            <table style={{ width: '100%', fontSize: 12 }}>
                              <tbody>
                                {r.lines.map((l) => (
                                  <tr key={l.id}>
                                    <td style={{ padding: '3px 0' }}>{l.description} <span style={{ color: T.slateLight }}>({titleCase(l.type)})</span></td>
                                    <td style={{ textAlign: 'right' }}>{rupees(l.amount)}</td>
                                    <td style={{ textAlign: 'right', color: T.success }}>paid {rupees(l.paid)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{rupees(l.balance)} due</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <div style={{ marginTop: 6 }}><Link to={`/rental/agreements/${r.agreement_id}`} style={{ color: T.goldDark, fontWeight: 700, fontSize: 12 }}>Open agreement ›</Link></div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </TableWrapper>
        )}
      </Card>

      <PaymentModal
        target={target}
        onClose={() => setTarget(null)}
        onSaved={(p) => { setTarget(null); setToast(`${p.duplicate ? 'Already recorded' : 'Payment recorded'}. ${paymentSummary(p).replace(/\n/g, ' ')}`); data.reload(); }}
      />
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
