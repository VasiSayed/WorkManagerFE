import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/client';
import { Icon } from '../../components/Icons';
import {
  compressImage, ErrorMsg, fi, Loading, openLabelsPdf, prettyDateTime, Sheet, StatusPill, useLoad, Viewer,
} from './common';

/* ── Text input with suggestions (locations used before, purposes, containers) ── */

function SuggestInput({ label, value, onChange, fetchSuggestions, placeholder, hint }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      try { const list = await fetchSuggestions(value); if (!cancelled) setItems(list.filter((x) => x !== value)); }
      catch { if (!cancelled) setItems([]); }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value, open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="fi-field">
      <span className="fi-label">{label}</span>
      <div className="fi-suggest">
        <input className="fi-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} autoComplete="off" />
        {open && items.length > 0 && (
          <ul role="listbox">
            {items.slice(0, 8).map((s) => (
              <li key={s}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(s); setOpen(false); }}>{s}</button></li>
            ))}
          </ul>
        )}
      </div>
      {hint && <span className="fi-hint">{hint}</span>}
    </label>
  );
}

function ContainerPicker({ box, value, onChange }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => fi.containers(q, box.uuid).then(setItems).catch(() => setItems([])), 200);
    return () => clearTimeout(t);
  }, [q, open, box.uuid]);
  return (
    <div className="fi-field">
      <span className="fi-label">Stored inside another box (optional)</span>
      {value ? (
        <div className="fi-row" style={{ justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 12 }}>
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}><span className="fi-ref">{value.reference}</span> {value.name}</span>
          <button type="button" className="fi-link" onClick={() => onChange(null)}>Remove</button>
        </div>
      ) : (
        <div className="fi-suggest">
          <input className="fi-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search VHS number or name" autoComplete="off"
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
          {open && items.length > 0 && (
            <ul role="listbox">
              {items.map((a) => (
                <li key={a.id}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(a); setOpen(false); setQ(''); }}>
                  <b style={{ color: '#EA580C' }}>{a.reference}</b> {a.name || 'Empty'}{a.location ? ` · ${a.location}` : ''}
                </button></li>
              ))}
            </ul>
          )}
        </div>
      )}
      <span className="fi-hint">E.g. a small bag kept inside a big plastic box. Its place then follows the big box.</span>
    </div>
  );
}

/* ── Edit form ── */

function EditForm({ box, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    name: box.name || '', purpose_name: box.purpose_name || '', location: box.location || '', description: box.description || '',
    stored_inside: box.stored_inside || null, latitude: box.latitude, longitude: box.longitude,
  }));
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const useGps = () => {
    if (!navigator.geolocation) { setError('This browser cannot share your location.'); return; }
    setGpsBusy(true); setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setF((x) => ({ ...x, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })); setGpsBusy(false); },
      () => { setError('Location not available. Allow location access and try again.'); setGpsBusy(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const save = async (andReady) => {
    setBusy(true); setError('');
    try {
      const body = {
        name: f.name, purpose_name: f.purpose_name, location: f.location, description: f.description,
        stored_inside: f.stored_inside ? f.stored_inside.id : null,
        latitude: f.latitude === null || f.latitude === '' || f.latitude === undefined ? null : f.latitude,
        longitude: f.longitude === null || f.longitude === '' || f.longitude === undefined ? null : f.longitude,
      };
      let updated = await fi.update(box.uuid, body);
      if (andReady && updated.status !== 'ready') updated = await fi.setStatus(box.uuid, 'ready');
      onSaved(updated);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <form className="fi-stack" onSubmit={(e) => { e.preventDefault(); save(false); }}>
      <ErrorMsg message={error} />
      <label className="fi-field">
        <span className="fi-label">Name</span>
        <input className="fi-input" value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="e.g. Marriage Saree Box" autoFocus={!box.name} />
      </label>
      <SuggestInput label="Purpose" value={f.purpose_name} onChange={set('purpose_name')} placeholder="e.g. Marriage Items"
        fetchSuggestions={async (q) => (await fi.purposes({ q, active: 'true' })).map((p) => p.name)} hint="Pick one or type a new one." />
      <SuggestInput label="Where is it kept?" value={f.location} onChange={set('location')} placeholder="Bedroom → Wardrobe → Top shelf"
        fetchSuggestions={(q) => fi.locations(q)} hint="Type freely. Places you used before are suggested." />
      <ContainerPicker box={box} value={f.stored_inside} onChange={set('stored_inside')} />
      <label className="fi-field">
        <span className="fi-label">What's inside?</span>
        <textarea className="fi-textarea" value={f.description} onChange={(e) => set('description')(e.target.value)}
          placeholder="Write freely: 3 sarees, red bridal one in a cloth bag, jewellery box at the bottom…" />
      </label>
      <div className="fi-field">
        <span className="fi-label">GPS (only for things kept outside home)</span>
        {f.latitude !== null && f.latitude !== undefined && f.latitude !== '' ? (
          <div className="fi-row" style={{ justifyContent: 'space-between', padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 12 }}>
            <span style={{ fontSize: 14 }}><Icon name="pin" size={14} /> {Number(f.latitude).toFixed(5)}, {Number(f.longitude).toFixed(5)}</span>
            <button type="button" className="fi-link" onClick={() => setF((x) => ({ ...x, latitude: null, longitude: null }))}>Remove</button>
          </div>
        ) : (
          <button type="button" className="fi-btn" onClick={useGps} disabled={gpsBusy}><Icon name="pin" size={16} /> {gpsBusy ? 'Getting location…' : 'Use my current location'}</button>
        )}
      </div>
      <div className="fi-bottom-bar">
        <button type="button" className="fi-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="fi-btn fi-btn-dark" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        {box.status !== 'ready' && box.status !== 'archived' && (
          <button type="button" className="fi-btn fi-btn-ok" disabled={busy || !f.name.trim()} onClick={() => save(true)} title={f.name.trim() ? '' : 'Add a name first'}>Save & Ready</button>
        )}
      </div>
    </form>
  );
}

/* ── History ── */

function HistoryList({ uuid }) {
  const { data, loading, error } = useLoad(() => fi.history(uuid), [uuid]);
  const groups = useMemo(() => {
    const map = new Map();
    (data || []).forEach((row) => {
      if (!map.has(row.change_id)) map.set(row.change_id, []);
      map.get(row.change_id).push(row);
    });
    return [...map.values()];
  }, [data]);
  if (loading) return <Loading />;
  if (error) return <ErrorMsg message={error} />;
  const title = (rows) => {
    const actions = new Set(rows.map((r) => r.action));
    if (actions.has('reset')) return 'Box reset for reuse';
    if (actions.has('created')) return 'Label created';
    if (actions.has('archived')) return 'Archived';
    if (actions.has('restored')) return 'Restored';
    if (actions.has('image_added')) return `Photo added`;
    if (actions.has('image_removed')) return 'Photo removed';
    if (rows.length === 1 && rows[0].action === 'status') return 'Status changed';
    return `${rows.filter((r) => r.action === 'updated').length || rows.length} change${rows.length > 1 ? 's' : ''}`;
  };
  return (
    <div className="fi-hist">
      {groups.map((rows) => (
        <div key={rows[0].change_id} className="fi-hist-item">
          <div className="fi-row" style={{ justifyContent: 'space-between' }}>
            <strong style={{ color: '#1B2A4A' }}>{title(rows)}</strong>
            <span className="fi-muted">{prettyDateTime(rows[0].created_at)}</span>
          </div>
          {rows[0].user_name && <div className="fi-muted">by {rows[0].user_name}</div>}
          {rows.filter((r) => r.field).map((r) => (
            <div key={r.id} className="fi-hist-change">
              <span className="fi-label">{r.field_label}</span>
              {r.old_value && <span className="fi-old">{r.old_value}</span>}
              {r.new_value ? <span className="fi-new">{r.new_value}</span> : r.action !== 'image_removed' && <span className="fi-muted">(cleared)</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */

export default function BoxPage({ tab = 'details' }) {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const { data: box, setData, loading, error, reload } = useLoad(() => fi.get(uuid), [uuid]);
  const [editing, setEditing] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [uploading, setUploading] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sheet, setSheet] = useState(null); // 'more' | 'reset' | 'qr'
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  // A freshly scanned empty box opens straight into the form.
  useEffect(() => { if (box && box.status === 'empty' && tab === 'details') setEditing(true); }, [box?.uuid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !box) return <div className="fi"><Loading /></div>;
  if (error === 'not_found') {
    return (
      <div className="fi fi-card fi-empty" style={{ maxWidth: 480, margin: '24px auto' }}>
        <Icon name="alert" size={30} />
        <h1 className="fi-title" style={{ fontSize: 18, margin: '8px 0' }}>Box not found</h1>
        <p>This label isn't in your household, or the link is damaged. Try typing the VHS number instead.</p>
        <Link to="/findit/scan" className="fi-btn fi-btn-dark" style={{ marginTop: 12 }}>Type a VHS number</Link>
      </div>
    );
  }
  if (!box) return <div className="fi"><ErrorMsg message={error} /></div>;

  const run = async (fn, ok) => {
    setBusy(true); setErr(''); setMsg('');
    try { const updated = await fn(); if (updated) setData(updated); if (ok) setMsg(ok); }
    catch (e) { setErr(getErrorMessage(e)); }
    finally { setBusy(false); setSheet(null); }
  };

  const upload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setErr(''); setMsg('');
    try {
      let updated = null;
      for (let i = 0; i < files.length; i += 1) {
        setUploading(`Uploading photo ${i + 1} of ${files.length}…`);
        updated = await fi.addImages(box.uuid, [await compressImage(files[i])]);
      }
      setData(updated);
      setMsg(`${files.length} photo${files.length > 1 ? 's' : ''} added`);
    } catch (e) { setErr(getErrorMessage(e)); await reload(); }
    finally { setUploading(''); if (fileRef.current) fileRef.current.value = ''; if (cameraRef.current) cameraRef.current.value = ''; }
  };

  const deleteImage = (img) => {
    if (!window.confirm('Delete this photo?')) return;
    setViewer(null);
    run(() => fi.removeImage(box.uuid, img.id), 'Photo deleted');
  };

  const archived = box.status === 'archived';
  const path = box.storage_path || [];

  return (
    <div className="fi fi-stack">
      <div className="fi-head" style={{ marginBottom: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div className="fi-row"><span className="fi-ref" style={{ fontSize: 18 }}>{box.reference}</span><StatusPill status={box.status} /></div>
          <h1 className="fi-title" style={{ marginTop: 4 }}>{box.name || (editing ? 'What is in this box?' : 'Not registered yet')}</h1>
          {box.purpose_name && <p className="fi-sub"><Icon name="tag" size={13} /> {box.purpose_name}</p>}
        </div>
        <button type="button" className="fi-btn fi-btn-sm" onClick={() => navigate(-1)} aria-label="Back"><Icon name="arrowLeft" size={16} /> Back</button>
      </div>

      {archived && (
        <div className="fi-card fi-row" style={{ justifyContent: 'space-between', background: '#F1F5F9' }}>
          <span style={{ fontSize: 14 }}>This box is archived. Its details and history are kept.</span>
          <button type="button" className="fi-btn fi-btn-sm" disabled={busy} onClick={() => run(() => fi.setStatus(box.uuid, 'draft'), 'Restored')}>Restore</button>
        </div>
      )}
      <ErrorMsg message={err} />
      {msg && <div className="fi-ok-msg">{msg}</div>}
      {uploading && <div className="fi-ok-msg">{uploading}</div>}

      <div className="fi-row" role="tablist" style={{ gap: 6 }}>
        <Link to={`/findit/box/${box.uuid}`} className="fi-chip" aria-pressed={tab === 'details'} role="tab">Details</Link>
        <Link to={`/findit/box/${box.uuid}/history`} className="fi-chip" aria-pressed={tab === 'history'} role="tab"><Icon name="history" size={13} /> History</Link>
      </div>

      {tab === 'history' ? <HistoryList uuid={box.uuid} /> : (
        <div className="fi-detail">
          <div className="fi-stack">
            {/* Photos first: easiest way to recognise a box */}
            <div className="fi-card">
              <div className="fi-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <h2 className="fi-h2" style={{ margin: 0 }}>Photos {box.images.length > 0 && <span className="fi-muted">({box.images.length})</span>}</h2>
                {!archived && (
                  <span className="fi-row">
                    <button type="button" className="fi-btn fi-btn-sm" onClick={() => cameraRef.current?.click()} disabled={!!uploading}><Icon name="camera" size={15} /> Camera</button>
                    <button type="button" className="fi-btn fi-btn-sm" onClick={() => fileRef.current?.click()} disabled={!!uploading}><Icon name="image" size={15} /> Gallery</button>
                  </span>
                )}
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files)} />
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
              {box.images.length === 0 ? (
                <div className="fi-muted">No photos yet. A photo of the box and its contents helps everyone recognise it.</div>
              ) : (
                <div className="fi-gallery">
                  {box.images.map((img, i) => (
                    <button key={img.id} type="button" onClick={() => setViewer(i)} aria-label={`Open photo ${i + 1}`}>
                      <img src={img.thumb_url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {editing ? (
              <div className="fi-card"><EditForm box={box} onSaved={(b) => { setData(b); setEditing(false); setMsg('Saved'); }} onCancel={() => setEditing(false)} /></div>
            ) : (
              <div className="fi-card">
                <dl style={{ margin: 0 }}>
                  <div className="fi-kv"><dt>Where is it?</dt><dd>
                    {path.length > 0 ? (
                      <span className="fi-path">
                        {path.map((p) => <Link key={p.uuid} to={`/findit/box/${p.uuid}`}>Inside {p.reference}{p.name ? ` ${p.name}` : ''}</Link>)}
                        {(path[path.length - 1].location || box.location) && <span className="fi-crumb">{path[path.length - 1].location || box.location}</span>}
                      </span>
                    ) : (box.location || <span className="fi-muted">Not set</span>)}
                  </dd></div>
                  {box.maps_url && (
                    <div className="fi-kv"><dt>GPS location</dt><dd>
                      <a className="fi-btn fi-btn-sm" href={box.maps_url} target="_blank" rel="noreferrer"><Icon name="pin" size={14} /> Open in Google Maps</a>
                    </dd></div>
                  )}
                  <div className="fi-kv"><dt>What's inside</dt><dd>{box.description ? <div className="fi-desc">{box.description}</div> : <span className="fi-muted">Nothing written yet</span>}</dd></div>
                  {box.contents?.length > 0 && (
                    <div className="fi-kv"><dt>Boxes kept inside this one</dt><dd className="fi-path">
                      {box.contents.map((c) => <Link key={c.uuid} to={`/findit/box/${c.uuid}`}>{c.reference}{c.name ? ` ${c.name}` : ''}</Link>)}
                    </dd></div>
                  )}
                </dl>
              </div>
            )}
          </div>

          {!editing && (
            <div className="fi-stack">
              <div className="fi-actions">
                {!archived && <button type="button" className="fi-btn fi-btn-dark" onClick={() => setEditing(true)}><Icon name="edit" size={16} /> Edit</button>}
                {!archived && box.status !== 'ready' && box.status !== 'empty' && (
                  <button type="button" className="fi-btn fi-btn-ok" disabled={busy} onClick={() => run(() => fi.setStatus(box.uuid, 'ready'), 'Marked Ready')}><Icon name="check" size={16} /> Mark Ready</button>
                )}
                {box.status === 'ready' && (
                  <button type="button" className="fi-btn" disabled={busy} onClick={() => run(() => fi.setStatus(box.uuid, 'draft'), 'Moved back to Draft')}>Mark Draft</button>
                )}
                <button type="button" className="fi-btn" onClick={() => setSheet('qr')}><Icon name="qr" size={16} /> Label</button>
                <button type="button" className="fi-btn" onClick={() => setSheet('more')}><Icon name="more" size={16} /> More</button>
              </div>
              <div className="fi-card fi-muted" style={{ fontSize: 12, display: 'grid', gap: 4 }}>
                <span>Updated {prettyDateTime(box.updated_at)}{box.updated_by_name ? ` by ${box.updated_by_name}` : ''}</span>
                <span>Created {prettyDateTime(box.created_at)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <Viewer images={box.images} index={viewer} onClose={() => setViewer(null)} onIndex={setViewer} onDelete={archived ? null : deleteImage} />

      <Sheet open={sheet === 'qr'} title={`Label ${box.reference}`} onClose={() => setSheet(null)}>
        <p className="fi-muted" style={{ marginBottom: 12 }}>The label never changes, even after edits or a reset. Print it again if it gets damaged.</p>
        <div className="fi-stack">
          <button type="button" className="fi-btn fi-btn-primary" onClick={() => openLabelsPdf([box.id], 1).catch((e) => setErr(e.message))}><Icon name="printer" size={16} /> Print this label</button>
          <button type="button" className="fi-btn" onClick={() => openLabelsPdf([box.id], 2).catch((e) => setErr(e.message))}>Print 2 copies</button>
          <button type="button" className="fi-btn" onClick={() => setSheet(null)}>Close</button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'more'} title="More actions" onClose={() => setSheet(null)}>
        <div className="fi-stack">
          <Link to={`/findit/box/${box.uuid}/history`} className="fi-btn" onClick={() => setSheet(null)}><Icon name="history" size={16} /> View history</Link>
          {!archived && <button type="button" className="fi-btn" disabled={busy} onClick={() => run(() => fi.setStatus(box.uuid, 'archived'), 'Archived')}><Icon name="archive" size={16} /> Archive (no longer used)</button>}
          {archived && <button type="button" className="fi-btn" disabled={busy} onClick={() => run(() => fi.setStatus(box.uuid, 'draft'), 'Restored')}>Restore</button>}
          {box.status !== 'empty' && <button type="button" className="fi-btn fi-btn-danger" onClick={() => setSheet('reset')}><Icon name="refresh" size={16} /> Reset to reuse this box…</button>}
          <button type="button" className="fi-btn" onClick={() => setSheet(null)}>Close</button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'reset'} title={`Reset ${box.reference}?`} onClose={() => setSheet(null)}>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>
          Clears the name, purpose, place, GPS and description{box.images.length > 0 && <>, and <b>deletes its {box.images.length} photo{box.images.length === 1 ? '' : 's'}</b></>}, so you can reuse the box.
          The label, {box.reference} and the full history stay.
        </p>
        {box.contents?.length > 0 && <div className="fi-error" style={{ marginBottom: 12 }}>{box.contents.length} box(es) are stored inside it; they keep pointing to {box.reference}.</div>}
        <div className="fi-stack">
          <button type="button" className="fi-btn fi-btn-primary" style={{ background: '#B91C1C', borderColor: '#B91C1C' }} disabled={busy}
            onClick={() => run(async () => { const b = await fi.reset(box.uuid); setEditing(true); return b; }, `${box.reference} is empty again`)}>Yes, reset</button>
          <button type="button" className="fi-btn" onClick={() => setSheet(null)}>Cancel</button>
        </div>
      </Sheet>
    </div>
  );
}
