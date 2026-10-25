import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Btn, Card, PageHeader, TableWrapper, Td, Th } from '../../components/UI';
import { Icon } from '../../components/Icons';
import { T } from '../../theme';
import {
  CardTitle, currentMonth, Empty, ErrorBox, isPositive, KV, Loading, monthLabel, MonthBar, prettyDate, PropertyFilter, pm,
  rupees, Stat, StatGrid, StatusPill, Toolbar, useLoad,
} from './shared';

export default function RentalDashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [propertyId, setPropertyId] = useState('');
  const properties = useLoad(() => pm.properties(), []);
  const dash = useLoad(() => pm.dashboard({ month, property: propertyId }), [month, propertyId]);
  const d = dash.data;
  const noProperties = properties.data && properties.data.length === 0;

  return (
    <div>
      <PageHeader
        title="Rental Management"
        sub="Rent, fixed charges, electricity, expenses and deposits for your properties."
        action={<>
          <Link to="/rental/collection"><Btn variant="gold"><Icon name="wallet" size={15} /> Collect rent</Btn></Link>
          <Link to="/rental/agreements/new"><Btn variant="outline"><Icon name="plus" size={15} /> New agreement</Btn></Link>
        </>}
      />
      <Toolbar>
        <MonthBar month={month} onChange={setMonth} />
        <PropertyFilter properties={properties.data} value={propertyId} onChange={setPropertyId} />
      </Toolbar>
      <ErrorBox message={dash.error} onRetry={dash.reload} />

      {noProperties && (
        <Card style={{ marginBottom: 16, borderLeft: `4px solid ${T.gold}` }}>
          <CardTitle title="Get started" sub="Set up in this order:" />
          <ol style={{ paddingLeft: 18, display: 'grid', gap: 6, fontSize: 13, color: T.slate }}>
            <li><Link to="/rental/properties" style={{ color: T.goldDark, fontWeight: 700 }}>Add a property</Link>, then its floors and sections.</li>
            <li>Add rental units on the property page (a unit can span several floors or sections).</li>
            <li><Link to="/rental/tenants" style={{ color: T.goldDark, fontWeight: 700 }}>Add tenants</Link> and create an agreement for each.</li>
            <li>Collect rent each month from <Link to="/rental/collection" style={{ color: T.goldDark, fontWeight: 700 }}>Collect</Link>.</li>
          </ol>
        </Card>
      )}

      {dash.loading && !d ? <Loading /> : d ? (
        <>
          <StatGrid>
            <Stat label="Expected rent" value={rupees(d.expected_rent)} sub={monthLabel(d.month)} to="/rental/collection" />
            <Stat label="Collected" value={rupees(d.rent_collected)} tone={T.success} sub={`Payments received ${rupees(d.payments_received)}`} />
            <Stat label="Remaining" value={rupees(d.rent_remaining)} tone={isPositive(d.rent_remaining) ? T.error : T.success} to="/rental/collection" />
            <Stat label="Total outstanding" value={rupees(d.outstanding.total)} tone={T.warning} sub="All months, all charges" />
            <Stat label="Units" value={`${d.occupied_units} / ${d.units}`} tone={T.info} sub={`${d.vacant_units} vacant · ${d.properties} properties`} to="/rental/properties" />
          </StatGrid>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 16 }}>
            <Card>
              <CardTitle title="Tenants this month" />
              <KV label="Paid" value={d.tenant_status_counts.paid} tone={T.success} />
              <KV label="Partially paid" value={d.tenant_status_counts.partially_paid} tone={T.warning} />
              <KV label="Unpaid" value={d.tenant_status_counts.unpaid} tone={T.info} />
              <KV label="Overdue" value={d.tenant_status_counts.overdue} tone={T.error} />
            </Card>
            <Card>
              <CardTitle title="Charges & expenses" sub={monthLabel(d.month)} />
              <KV label="Monthly fixed charges" value={rupees(d.monthly_fixed_charges)} />
              <KV label="Fixed charges outstanding" value={rupees(d.fixed_charges_outstanding)} />
              <KV label="Electricity charged" value={rupees(d.electricity_billed)} />
              {d.electricity_bills_pending_allocation > 0 && (
                <KV label="Bills waiting to be split" value={<Link to="/rental/electricity" style={{ color: T.error }}>{d.electricity_bills_pending_allocation} — split now ›</Link>} />
              )}
              <KV label="Property expenses" value={rupees(d.property_expenses)} />
              <KV label="Recoverable outstanding" value={rupees(d.recoverable_expenses_outstanding)} />
            </Card>
            <Card>
              <CardTitle title="Outstanding by type" sub="All months" />
              {Object.entries(d.outstanding).filter(([k]) => k !== 'total').map(([k, v]) => <KV key={k} label={k.replace(/_/g, ' ')} value={rupees(v)} />)}
              <KV label="Total" value={rupees(d.outstanding.total)} strong tone={T.error} />
            </Card>
          </div>

          <Card>
            <CardTitle title="Agreements needing attention" sub="Expired or expiring soon" action={<Link to="/rental/agreements"><Btn variant="outline">All agreements</Btn></Link>} />
            {d.attention.length === 0 ? <Empty>Nothing expiring soon.</Empty> : (
              <TableWrapper>
                <thead><tr><Th>Tenant</Th><Th>Unit</Th><Th>Expiry</Th><Th>Days left</Th><Th>State</Th><Th /></tr></thead>
                <tbody>
                  {d.attention.map((a, i) => (
                    <tr key={a.agreement_id}>
                      <Td alt={i % 2}><strong>{a.tenant_name}</strong></Td>
                      <Td alt={i % 2}>{a.unit_name} · {a.property_name}</Td>
                      <Td alt={i % 2}>{prettyDate(a.end_date)}</Td>
                      <Td alt={i % 2}>{a.days_left < 0 ? `${-a.days_left} days ago` : `${a.days_left} days`}</Td>
                      <Td alt={i % 2}><StatusPill status={a.state} /></Td>
                      <Td alt={i % 2}><Link to={`/rental/agreements/${a.agreement_id}`} style={{ color: T.goldDark, fontWeight: 700 }}>Open ›</Link></Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrapper>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
