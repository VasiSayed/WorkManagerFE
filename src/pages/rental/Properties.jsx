import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { Btn, Card, FilterChips, PageHeader, TableWrapper, Td, Th } from '../../components/UI';
import { Icon } from '../../components/Icons';
import { T } from '../../theme';
import { RecurringChargeModal } from './Charges';
import {
  CardTitle, Check, choiceOptions, currentMonth, Empty, ErrorBox, FilePick, FormGrid, FormModal, isPositive, KV, LinkBtn,
  Loading, MonthBar, Muted, openFile, Pick, pm, prettyDate, rupees, runAction, StatusPill, Stat, StatGrid, TextArea, TextIn,
  titleCase, toFormData, Toolbar, useForm, useLoad, useOptions,
} from './shared';

const emptyProperty = { name: '', address: '', property_type: 'residential', description: '', number_of_floors: '', status: 'active', notes: '' };

export function PropertyModal({ open, property, onClose, onSaved }) {
  const options = useOptions();
  const [form, set, setForm] = useForm(emptyProperty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(property ? { ...emptyProperty, ...property, number_of_floors: property.number_of_floors ?? '' } : emptyProperty);
  }, [open, property, setForm]);

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const { id, unit_count, occupied_count, floor_count, ...data } = form; // eslint-disable-line no-unused-vars
      const saved = await pm.saveProperty({ ...data, number_of_floors: form.number_of_floors === '' ? null : Number(form.number_of_floors) }, property?.id);
      onSaved(saved);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <FormModal open={open} onClose={onClose} title={property ? 'Edit property' : 'New property'} onSubmit={submit} busy={busy} error={error} disabled={!form.name.trim()}>
      <FormGrid>
        <TextIn label="Property name" required value={form.name} onChange={set('name')} placeholder="e.g. Mahim House" autoFocus />
        <Pick label="Type" value={form.property_type} onChange={set('property_type')} options={choiceOptions(options.property_types).length ? choiceOptions(options.property_types) : [['residential', 'Residential'], ['commercial', 'Commercial'], ['mixed', 'Mixed use'], ['other', 'Other']]} />
        <TextIn label="Number of floors" type="number" min="0" value={form.number_of_floors} onChange={set('number_of_floors')} />
        <Pick label="Status" value={form.status} onChange={set('status')} options={[['active', 'Active'], ['inactive', 'Inactive']]} />
      </FormGrid>
      <TextArea label="Address" value={form.address} onChange={set('address')} />
      <TextArea label="Description" value={form.description} onChange={set('description')} />
      <TextArea label="Notes" value={form.notes} onChange={set('notes')} />
    </FormModal>
  );
}

export function PropertiesPage() {
  const navigate = useNavigate();
  const properties = useLoad(() => pm.properties(), []);
  const [modal, setModal] = useState(false);

  return (
    <div>
      <PageHeader title="Properties" sub="Buildings you rent out. Open one to manage floors, sections and rental units." action={<Btn variant="gold" onClick={() => setModal(true)}><Icon name="plus" size={15} /> Add property</Btn>} />
      <ErrorBox message={properties.error} onRetry={properties.reload} />
      {properties.loading && !properties.data ? <Loading /> : (properties.data || []).length === 0 ? (
        <Card><Empty>No properties yet. Add your first property to get started.</Empty></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {properties.data.map((p) => (
            <Link key={p.id} to={`/rental/properties/${p.id}`}>
              <Card style={{ height: '100%', borderTop: `3px solid ${p.status === 'active' ? T.gold : T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.navy }}>{p.name}</div>
                  <StatusPill status={p.status === 'active' ? 'active' : 'cancelled'} label={titleCase(p.property_type)} />
                </div>
                {p.address && <Muted style={{ marginTop: 4 }}>{p.address}</Muted>}
                <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: T.slate }}>
                  <span><strong style={{ color: T.navy }}>{p.unit_count}</strong> units</span>
                  <span><strong style={{ color: T.success }}>{p.occupied_count}</strong> occupied</span>
                  <span><strong style={{ color: T.navy }}>{p.floor_count}</strong> floors</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <PropertyModal open={modal} onClose={() => setModal(false)} onSaved={(p) => { setModal(false); navigate(`/rental/properties/${p.id}`); }} />
    </div>
  );
}

/* ── Unit form: a unit can occupy whole floors and/or sections on several floors ── */

function UnitModal({ open, propertyId, floors, unit, onClose, onSaved }) {
  const [form, set, setForm] = useForm({ name: '', description: '', status: 'available', notes: '' });
  const [spaces, setSpaces] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(unit ? { name: unit.name, description: unit.description, status: unit.status, notes: unit.notes } : { name: '', description: '', status: 'available', notes: '' });
    setSpaces(unit ? unit.spaces.map((s) => ({ floor: s.floor, section: s.section })) : []);
  }, [open, unit, setForm]);

  const has = (floor, section) => spaces.some((s) => s.floor === floor && s.section === section);
  const toggle = (floor, section) => setSpaces((current) => {
    if (has(floor, section)) return current.filter((s) => !(s.floor === floor && s.section === section));
    // Choosing the entire floor replaces its sections, and vice versa.
    const others = current.filter((s) => s.floor !== floor || (section === null ? false : s.section !== null));
    return [...others, { floor, section }];
  });

  const submit = async () => {
    setBusy(true); setError('');
    try { onSaved(await pm.saveUnit({ property: propertyId, ...form, spaces }, unit?.id)); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <FormModal open={open} onClose={onClose} title={unit ? `Edit ${unit.name}` : 'New rental unit'} onSubmit={submit} busy={busy} error={error} disabled={!form.name.trim()}>
      <FormGrid>
        <TextIn label="Unit name / number" required value={form.name} onChange={set('name')} placeholder="e.g. G-1, Shop 2, Flat 101" autoFocus />
        <Pick label="Status" value={form.status} onChange={set('status')} options={[['available', 'Available'], ['maintenance', 'Under maintenance'], ['inactive', 'Inactive']]} />
      </FormGrid>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.slate, marginBottom: 4 }}>Space occupied</div>
        {floors.length === 0 ? <Muted>This property has no floors yet — add them on the Floors tab (optional).</Muted> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
            {floors.map((f) => (
              <div key={f.id} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontWeight: 700, color: T.navy, fontSize: 13 }}>{f.name}</div>
                <Check label="Entire floor" checked={has(f.id, null)} onChange={() => toggle(f.id, null)} />
                {f.sections.map((s) => <div key={s.id} style={{ paddingLeft: 14 }}><Check label={s.name} checked={has(f.id, s.id)} onChange={() => toggle(f.id, s.id)} /></div>)}
              </div>
            ))}
          </div>
        )}
      </div>
      <TextArea label="Description" value={form.description} onChange={set('description')} />
      <TextArea label="Notes" value={form.notes} onChange={set('notes')} />
    </FormModal>
  );
}

function NameModal({ open, title, placeholder, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setName(''); setError(''); } }, [open]);
  return (
    <FormModal open={open} onClose={onClose} title={title} width={420} busy={busy} error={error} disabled={!name.trim()} submitLabel="Add"
      onSubmit={async () => { setBusy(true); try { await onSubmit(name.trim()); } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); } }}>
      <TextIn label="Name" required value={name} onChange={setName} placeholder={placeholder} autoFocus />
    </FormModal>
  );
}

export function PropertyDetailPage() {
  const { id } = useParams();
  const propertyId = Number(id);
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState('tenants');
  const [modal, setModal] = useState(null); // {type, ...}
  const [error, setError] = useState('');
  const overview = useLoad(() => pm.propertyOverview(propertyId, month), [propertyId, month]);
  const docs = useLoad(() => pm.documents({ property: propertyId }), [propertyId]);
  const charges = useLoad(() => pm.recurringCharges({ property: propertyId }), [propertyId]);
  const data = overview.data;

  const done = async () => { setModal(null); await Promise.all([overview.reload(), docs.reload(), charges.reload()]); };
  const act = (confirmText, action) => runAction({ confirmText, action, onDone: done, onError: setError });

  if (overview.loading && !data) return <Loading />;
  if (!data) return <ErrorBox message={overview.error || 'Property not found'} onRetry={overview.reload} />;
  const p = data.property;
  const s = data.collection.summary;

  const uploadDoc = async (file) => {
    if (!file) return;
    const isImage = (file.type || '').startsWith('image/');
    await act(null, () => pm.uploadDocument(toFormData({ property: propertyId, title: file.name, doc_type: isImage ? 'property_image' : 'property_document' }, { file })));
  };

  return (
    <div>
      <PageHeader
        title={p.name}
        sub={[titleCase(p.property_type), p.address].filter(Boolean).join(' · ')}
        action={<>
          <Btn variant="outline" onClick={() => navigate('/rental/properties')}><Icon name="arrowLeft" size={14} /> Properties</Btn>
          <Btn variant="outline" onClick={() => setModal({ type: 'property' })}><Icon name="edit" size={14} /> Edit</Btn>
          <Link to={`/rental/agreements/new?property=${propertyId}`}><Btn variant="gold"><Icon name="plus" size={14} /> New agreement</Btn></Link>
        </>}
      />
      <ErrorBox message={error || overview.error} />
      <Toolbar><MonthBar month={month} onChange={setMonth} /></Toolbar>
      <StatGrid>
        <Stat label="Expected" value={rupees(s.expected)} sub="Rent + fixed charges" />
        <Stat label="Collected" value={rupees(s.collected)} tone={T.success} />
        <Stat label="Remaining" value={rupees(s.remaining)} tone={isPositive(s.remaining) ? T.error : T.success} />
        <Stat label="Outstanding (all months)" value={rupees(data.balances.total_outstanding)} tone={T.warning} />
        <Stat label="Occupied" value={`${p.occupied_count} / ${p.unit_count}`} tone={T.info} />
      </StatGrid>

      <FilterChips options={[['tenants', 'Tenants'], ['units', `Units (${data.units.length})`], ['floors', `Floors (${data.floors.length})`], ['charges', 'Fixed charges'], ['documents', 'Documents']]} active={tab} onChange={setTab} />

      {tab === 'tenants' && (
        <Card>
          {data.collection.rows.length === 0 ? <Empty>No active tenants this month.</Empty> : (
            <TableWrapper>
              <thead><tr><Th>Tenant</Th><Th>Unit</Th><Th>Due</Th><Th>Paid</Th><Th>Balance</Th><Th>Status</Th></tr></thead>
              <tbody>
                {data.collection.rows.map((r, i) => (
                  <tr key={r.agreement_id}>
                    <Td alt={i % 2}><Link to={`/rental/tenants/${r.tenant_id}`} style={{ color: T.navy, fontWeight: 700 }}>{r.tenant_name}</Link></Td>
                    <Td alt={i % 2}>{r.unit_name}</Td>
                    <Td alt={i % 2}>{rupees(r.amount_due)}</Td>
                    <Td alt={i % 2}>{rupees(r.paid)}</Td>
                    <Td alt={i % 2}><strong style={{ color: isPositive(r.balance) ? T.error : T.success }}>{rupees(r.balance)}</strong></Td>
                    <Td alt={i % 2}><StatusPill status={r.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          )}
          <div style={{ marginTop: 12 }}><Link to="/rental/collection"><Btn variant="outline">Go to Collect</Btn></Link></div>
        </Card>
      )}

      {tab === 'units' && (
        <Card>
          <CardTitle title="Rental units" sub="Each unit is rented under its own agreement." action={<Btn variant="gold" onClick={() => setModal({ type: 'unit' })}><Icon name="plus" size={14} /> Add unit</Btn>} />
          {data.units.length === 0 ? <Empty>No rental units yet. Add floors first (optional), then units.</Empty> : (
            <TableWrapper>
              <thead><tr><Th>Unit</Th><Th>Space</Th><Th>Status</Th><Th>Tenant</Th><Th /></tr></thead>
              <tbody>
                {data.units.map((u, i) => (
                  <tr key={u.id}>
                    <Td alt={i % 2}><strong>{u.name}</strong>{u.description && <Muted>{u.description}</Muted>}</Td>
                    <Td alt={i % 2}>{u.spaces.map((sp) => (sp.section_name ? `${sp.floor_name}: ${sp.section_name}` : `${sp.floor_name} (entire)`)).join(' + ') || '—'}</Td>
                    <Td alt={i % 2}>{u.current_agreement ? <StatusPill status="occupied" label="Occupied" /> : <StatusPill status={u.status === 'available' ? 'vacant' : u.status} label={u.status === 'available' ? 'Vacant' : titleCase(u.status)} />}</Td>
                    <Td alt={i % 2}>{u.current_agreement
                      ? <Link to={`/rental/tenants/${u.current_agreement.tenant_id}`} style={{ color: T.navy, fontWeight: 700 }}>{u.current_agreement.tenant_name}</Link>
                      : <Link to={`/rental/agreements/new?property=${propertyId}&unit=${u.id}`} style={{ color: T.goldDark, fontWeight: 700 }}>+ Add tenant agreement</Link>}</Td>
                    <Td alt={i % 2}><LinkBtn onClick={() => setModal({ type: 'unit', unit: u })}>Edit</LinkBtn></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrapper>
          )}
        </Card>
      )}

      {tab === 'floors' && (
        <Card>
          <CardTitle title="Floors & sections" sub="Split a floor into sections (e.g. Front shop, East half) when it is rented in parts." action={<Btn variant="gold" onClick={() => setModal({ type: 'floor' })}><Icon name="plus" size={14} /> Add floor</Btn>} />
          {data.floors.length === 0 ? <Empty>No floors yet.</Empty> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
              {data.floors.map((f) => (
                <div key={f.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: T.navy }}>{f.name}</strong>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <LinkBtn onClick={() => setModal({ type: 'section', floor: f })}>+ Section</LinkBtn>
                      <LinkBtn danger onClick={() => act(`Delete ${f.name} and its sections? Floors used by rental units cannot be deleted.`, () => pm.deleteFloor(f.id))}>Delete</LinkBtn>
                    </div>
                  </div>
                  {f.sections.length === 0 ? <Muted style={{ marginTop: 6 }}>No sections — units use the entire floor.</Muted> : f.sections.map((sec) => (
                    <div key={sec.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${T.border}`, fontSize: 13 }}>
                      <span>• {sec.name}</span>
                      <LinkBtn danger onClick={() => act(`Delete section ${sec.name}?`, () => pm.deleteSection(sec.id))}>Remove</LinkBtn>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'charges' && (
        <Card>
          <CardTitle title="Fixed charges for this property" sub="Charged to every active tenant in the property (or in one unit)." action={<Btn variant="gold" onClick={() => setModal({ type: 'charge' })}><Icon name="plus" size={14} /> Add fixed charge</Btn>} />
          {(charges.data || []).length === 0 ? <Empty>No property-wide fixed charges.</Empty> : charges.data.map((r) => (
            <KV key={r.id} label={`${r.name} · ${r.scope_label}${r.is_enabled ? '' : ' (disabled)'}`} value={`${rupees(r.amount)} from ${prettyDate(r.start_date)}${r.end_date ? ` to ${prettyDate(r.end_date)}` : ''}`} />
          ))}
        </Card>
      )}

      {tab === 'documents' && (
        <Card>
          <CardTitle title="Property documents & photos" />
          <div style={{ maxWidth: 360, marginBottom: 12 }}><FilePick label="Upload a document or photo" onChange={uploadDoc} /></div>
          {(docs.data || []).length === 0 ? <Empty>No documents yet.</Empty> : docs.data.map((d) => (
            <KV key={d.id} label={`${d.title} · ${titleCase(d.doc_type)}`} value={<LinkBtn onClick={() => openFile(d.open_url)}>Open ({prettyDate(d.created_at)})</LinkBtn>} />
          ))}
        </Card>
      )}

      <PropertyModal open={modal?.type === 'property'} property={p} onClose={() => setModal(null)} onSaved={done} />
      <UnitModal open={modal?.type === 'unit'} unit={modal?.unit} propertyId={propertyId} floors={data.floors} onClose={() => setModal(null)} onSaved={done} />
      <NameModal open={modal?.type === 'floor'} title="Add floor" placeholder="e.g. Ground floor, First floor" onClose={() => setModal(null)}
        onSubmit={async (name) => { await pm.saveFloor({ property: propertyId, name, level: data.floors.length }); await done(); }} />
      <NameModal open={modal?.type === 'section'} title={`Add section to ${modal?.floor?.name || ''}`} placeholder="e.g. Front shop, East half" onClose={() => setModal(null)}
        onSubmit={async (name) => { await pm.saveSection({ floor: modal.floor.id, name }); await done(); }} />
      <RecurringChargeModal open={modal?.type === 'charge'} defaults={{ scope: 'property', property: propertyId }} onClose={() => setModal(null)} onSaved={done} />
    </div>
  );
}
