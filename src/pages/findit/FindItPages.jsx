import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getErrorMessage, normalizeList } from '../../api/client';
import { Icon } from '../../components/Icons';
import { BoxCard, ErrorMsg, fi, Loading, openLabelsPdf, StatusPill, STATUS_LABEL, useLoad } from './common';

/* ── Home ── */

export function FindItHome() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { data, error } = useLoad(() => fi.summary(), []);
  const go = (e) => { e.preventDefault(); navigate(`/findit/boxes${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); };

  return (
    <div className="fi fi-stack">
      <div>
        <h1 className="fi-title">FindIt</h1>
        <p className="fi-sub">{data?.household ? `${data.household} · ` : ''}What's in which box, and where it is.</p>
      </div>
      <form onSubmit={go} className="fi-search" role="search">
        <span className="fi-search-icon"><Icon name="search" size={20} /></span>
        <input className="fi-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: saree, winter, VHS12…" aria-label="Search boxes" enterKeyHint="search" />
      </form>
      <ErrorMsg message={error} />

      <div className="fi-tiles">
        <Link to="/findit/scan" className="fi-tile fi-tile-main">
          <span className="fi-tile-icon"><Icon name="scan" size={22} /></span>
          <span><strong style={{ display: 'block', fontSize: 17 }}>Scan a label</strong><span>Point the camera at a box's QR</span></span>
        </Link>
        <Link to="/findit/boxes" className="fi-tile"><span className="fi-tile-icon"><Icon name="search" size={20} /></span><strong>All boxes</strong><span>Search & filter</span></Link>
        <Link to="/findit/create" className="fi-tile"><span className="fi-tile-icon"><Icon name="plus" size={20} /></span><strong>New labels</strong><span>Create empty boxes</span></Link>
        <Link to="/findit/print" className="fi-tile"><span className="fi-tile-icon"><Icon name="printer" size={20} /></span><strong>Print labels</strong><span>A4 QR sheets</span></Link>
        <Link to="/findit/purposes" className="fi-tile"><span className="fi-tile-icon"><Icon name="tag" size={20} /></span><strong>Purposes</strong><span>Winter, Documents…</span></Link>
      </div>

      {data && (
        <div className="fi-counts">
          {['empty', 'draft', 'ready', 'archived'].map((s) => (
            <Link key={s} to={`/findit/boxes?status=${s}`} className="fi-count"><b>{data.by_status[s]}</b><small>{STATUS_LABEL[s]}</small></Link>
          ))}
        </div>
      )}

      {data && data.total === 0 && (
        <div className="fi-card">
          <h2 className="fi-h2">Get started</h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6, fontSize: 14 }}>
            <li><Link to="/findit/create" className="fi-link">Create labels</Link> (e.g. 21 = one A4 sheet).</li>
            <li>Print them and stick one on each box or bag.</li>
            <li>Scan a label and write what's inside, with photos.</li>
          </ol>
        </div>
      )}

      {data?.recent?.length > 0 && (
        <div>
          <h2 className="fi-h2">Recently updated</h2>
          <div className="fi-results">{data.recent.map((b) => <BoxCard key={b.id} box={b} />)}</div>
        </div>
      )}
    </div>
  );
}

/* ── Search / list ── */

const STATUS_FILTERS = [['', 'All'], ['ready', 'Ready'], ['draft', 'Draft'], ['empty', 'Empty'], ['archived', 'Archived']];

export function FindItBoxes() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const status = params.get('status') || '';
  const purpose = params.get('purpose') || '';
  const sort = params.get('sort') || 'updated';
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const purposes = useLoad(() => fi.purposes({ active: 'true' }), []);
  const term = params.get('q') || '';

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  // Debounced typing -> URL (keeps Back button and shared links working).
  useEffect(() => {
    const t = setTimeout(() => { if (q.trim() !== term) setParam('q', q.trim()); }, 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = async (pageNo) => {
    setLoading(true); setError('');
    try {
      const res = await fi.list({ q: term, status, purpose, sort, page: pageNo, page_size: 30 });
      const list = normalizeList(res);
      setRows((r) => (pageNo === 1 ? list : [...r, ...list]));
      setCount(res.count ?? list.length);
      setHasMore(Boolean(res.next));
      setPage(pageNo);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(1); }, [term, status, purpose, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fi fi-stack">
      <div className="fi-sticky fi-stack" style={{ gap: 10 }}>
        <div className="fi-search">
          <span className="fi-search-icon"><Icon name="search" size={20} /></span>
          <input className="fi-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, contents, place, VHS number…"
            aria-label="Search boxes" enterKeyHint="search" autoFocus={!term && !status} />
        </div>
        <div className="fi-chips" role="group" aria-label="Status">
          {STATUS_FILTERS.map(([v, l]) => <button key={v} type="button" className="fi-chip" aria-pressed={status === v} onClick={() => setParam('status', v)}>{l}</button>)}
        </div>
        <div className="fi-row" style={{ flexWrap: 'nowrap' }}>
          <select className="fi-select" value={purpose} onChange={(e) => setParam('purpose', e.target.value)} aria-label="Purpose" style={{ minHeight: 42, fontSize: 15 }}>
            <option value="">All purposes</option>
            <option value="none">No purpose</option>
            {(purposes.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="fi-select" value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Sort" style={{ minHeight: 42, fontSize: 15, maxWidth: 150 }}>
            <option value="updated">Recent</option>
            <option value="newest">Newest VHS</option>
            <option value="oldest">Oldest VHS</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>
      <ErrorMsg message={error} />
      <div className="fi-muted">{loading && page === 1 ? 'Searching…' : `${count} box${count === 1 ? '' : 'es'}${term ? ` for “${term}”` : ''}`}</div>
      {!loading && rows.length === 0 && (
        <div className="fi-card fi-empty">
          Nothing found. Try one word, part of a word, or a VHS number.
          {status !== 'archived' && <div style={{ marginTop: 8 }}><button type="button" className="fi-link" onClick={() => setParam('status', 'archived')}>Look in archived boxes</button></div>}
        </div>
      )}
      <div className="fi-results">{rows.map((b) => <BoxCard key={b.id} box={b} />)}</div>
      {hasMore && <button type="button" className="fi-btn fi-btn-block" disabled={loading} onClick={() => load(page + 1)}>{loading ? 'Loading…' : 'Show more'}</button>}
    </div>
  );
}

/* ── Scan ── */

/** Live camera scan where the browser can read QR codes (Chrome on Android); otherwise the phone camera app or a typed number. */
export function FindItScan() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [supported] = useState(() => typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');

  const resolveAndOpen = async (text) => {
    setError('');
    try {
      const hit = await fi.resolve(text);
      navigate(`/findit/box/${hit.uuid}`);
    } catch (err) {
      setError(err.status === 404 ? `No box found for “${text}” in your household.` : getErrorMessage(err));
    }
  };

  useEffect(() => {
    if (!scanning) return undefined;
    let stream; let stopped = false; let timer;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped) return;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length) { stopped = true; setScanning(false); await resolveAndOpen(codes[0].rawValue); return; }
          } catch { /* keep trying */ }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch {
        setError('Could not open the camera. Allow camera access, or use your phone\'s camera app.');
        setScanning(false);
      }
    })();
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [scanning]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fi fi-stack" style={{ maxWidth: 560 }}>
      <div><h1 className="fi-title">Scan a label</h1><p className="fi-sub">The box opens as soon as the QR is read.</p></div>
      <ErrorMsg message={error} />
      {supported ? (
        scanning ? (
          <div className="fi-stack">
            <div className="fi-camera"><video ref={videoRef} playsInline muted /><div className="fi-camera-frame" /></div>
            <button type="button" className="fi-btn fi-btn-block" onClick={() => setScanning(false)}>Stop camera</button>
          </div>
        ) : (
          <button type="button" className="fi-btn fi-btn-primary fi-btn-block" style={{ minHeight: 64, fontSize: 17 }} onClick={() => setScanning(true)}>
            <Icon name="camera" size={22} /> Open camera
          </button>
        )
      ) : (
        <div className="fi-card fi-stack" style={{ gap: 8 }}>
          <strong style={{ color: '#1B2A4A' }}>Use your phone's camera app</strong>
          <span className="fi-muted">Open the Camera, point it at the label and tap the link that appears. You'll come straight to the box.</span>
        </div>
      )}
      <form className="fi-card fi-stack" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) resolveAndOpen(typed.trim()); }}>
        <label className="fi-field">
          <span className="fi-label">Or type the number on the label</span>
          <input className="fi-input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="VHS12" inputMode="text" autoCapitalize="characters" />
        </label>
        <button type="submit" className="fi-btn fi-btn-dark" disabled={!typed.trim()}>Open box</button>
      </form>
    </div>
  );
}

/** /q/<uuid>: what every printed label opens. */
export function QrLanding() {
  const { uuid } = useParams();
  return <Navigate to={`/findit/box/${encodeURIComponent(uuid || '')}`} replace />;
}

/* ── Create labels (bulk) ── */

export function FindItCreate() {
  const [count, setCount] = useState('21');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [printing, setPrinting] = useState(false);
  const n = Number(count);
  const valid = Number.isInteger(n) && n >= 1 && n <= 500;

  const create = async () => {
    setBusy(true); setError('');
    try { setResult(await fi.bulk(n)); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const print = async (copies) => {
    setPrinting(true); setError('');
    try { await openLabelsPdf(result.ids, copies); }
    catch (err) { setError(err.message); }
    finally { setPrinting(false); }
  };

  return (
    <div className="fi fi-stack" style={{ maxWidth: 560 }}>
      <div><h1 className="fi-title">New labels</h1><p className="fi-sub">Creates empty boxes with their own QR and VHS number. Fill them in later by scanning.</p></div>
      <ErrorMsg message={error} />
      {!result ? (
        <div className="fi-card fi-stack">
          <label className="fi-field">
            <span className="fi-label">How many?</span>
            <input className="fi-input" type="number" inputMode="numeric" min="1" max="500" value={count} onChange={(e) => setCount(e.target.value)} style={{ fontSize: 22, fontWeight: 800, textAlign: 'center' }} />
            <span className="fi-hint">One A4 sheet holds 21 labels. Up to 500 at a time.</span>
          </label>
          <div className="fi-chips">
            {[21, 42, 50, 63, 100].map((v) => <button key={v} type="button" className="fi-chip" aria-pressed={String(v) === count} onClick={() => setCount(String(v))}>{v}{v % 21 === 0 ? ` · ${v / 21} sheet${v > 21 ? 's' : ''}` : ''}</button>)}
          </div>
          <button type="button" className="fi-btn fi-btn-primary fi-btn-block" disabled={!valid || busy} onClick={create} style={{ minHeight: 52 }}>
            {busy ? `Creating ${n}…` : `Create ${valid ? n : ''} labels`}
          </button>
        </div>
      ) : (
        <div className="fi-card fi-stack" style={{ textAlign: 'center' }}>
          <div className="fi-ok-msg"><Icon name="check" size={16} /> Created {result.count} empty boxes</div>
          <div className="fi-big-num">{result.first} – {result.last}</div>
          <button type="button" className="fi-btn fi-btn-primary fi-btn-block" disabled={printing} onClick={() => print(1)} style={{ minHeight: 52 }}>
            <Icon name="printer" size={18} /> {printing ? 'Making PDF…' : `Print these ${result.count} labels`}
          </button>
          <button type="button" className="fi-btn fi-btn-block" disabled={printing} onClick={() => print(2)}>Print 2 copies of each (front + side of a box)</button>
          <p className="fi-hint">In the print window choose A4 and “Actual size / 100%”, not “Fit to page”.</p>
          <div className="fi-row" style={{ justifyContent: 'center' }}>
            <button type="button" className="fi-link" onClick={() => setResult(null)}>Create more</button>
            <Link to="/findit/print" className="fi-link">Print centre</Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Print centre ── */

export function FindItPrint() {
  const [status, setStatus] = useState('empty');
  const [purpose, setPurpose] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [copies, setCopies] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const purposes = useLoad(() => fi.purposes(), []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const res = await fi.list({ status: status === 'all' ? 'empty,draft,ready,archived' : status, purpose, q, sort: 'oldest', page_size: 200 });
        if (cancelled) return;
        const list = normalizeList(res);
        setRows(list);
        setSelected(new Set(list.map((r) => r.id)));
      } catch (err) { if (!cancelled) setError(getErrorMessage(err)); }
      finally { if (!cancelled) setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [status, purpose, q]);

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const labels = selected.size * copies;
  const pages = Math.ceil(labels / 21);
  const print = async () => {
    setBusy(true); setError('');
    try { await openLabelsPdf([...selected], copies); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fi fi-stack">
      <div><h1 className="fi-title">Print labels</h1><p className="fi-sub">A4 sheets, 21 labels each (3 × 7). Reprinting gives the same QR — it never changes.</p></div>
      <div className="fi-card fi-stack" style={{ gap: 10 }}>
        <div className="fi-chips" role="group" aria-label="Which boxes">
          {[['empty', 'Empty'], ['draft', 'Draft'], ['ready', 'Ready'], ['all', 'All']].map(([v, l]) => (
            <button key={v} type="button" className="fi-chip" aria-pressed={status === v} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
        <div className="fi-row" style={{ flexWrap: 'nowrap' }}>
          <input className="fi-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or VHS12" aria-label="Search" style={{ minHeight: 42, fontSize: 15 }} />
          <select className="fi-select" value={purpose} onChange={(e) => setPurpose(e.target.value)} aria-label="Purpose" style={{ minHeight: 42, fontSize: 15, maxWidth: 170 }}>
            <option value="">All purposes</option>
            {(purposes.data || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <ErrorMsg message={error} />
      <div className="fi-row" style={{ justifyContent: 'space-between' }}>
        <span className="fi-muted">{loading ? 'Loading…' : `${selected.size} of ${rows.length} selected`}</span>
        <span className="fi-row">
          <button type="button" className="fi-link" onClick={() => setSelected(new Set(rows.map((r) => r.id)))}>All</button>
          <button type="button" className="fi-link" onClick={() => setSelected(new Set())}>None</button>
        </span>
      </div>
      {!loading && rows.length === 0 && <div className="fi-card fi-empty">No boxes here. <Link to="/findit/create" className="fi-link">Create new labels</Link></div>}
      <div className="fi-pick-list">
        {rows.map((r) => (
          <label key={r.id} className="fi-pick">
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
            <span className="fi-ref" style={{ minWidth: 64 }}>{r.reference}</span>
            <span className="fi-grow" style={{ overflowWrap: 'anywhere', fontSize: 14 }}>{r.name || <span className="fi-muted">Empty</span>}</span>
            <StatusPill status={r.status} />
          </label>
        ))}
      </div>
      <div className="fi-bottom-bar" style={{ flexDirection: 'column' }}>
        <div className="fi-row" style={{ justifyContent: 'space-between' }}>
          <span className="fi-label">Copies of each</span>
          <div className="fi-chips">
            {[1, 2, 3].map((c) => <button key={c} type="button" className="fi-chip" aria-pressed={copies === c} onClick={() => setCopies(c)}>{c}</button>)}
          </div>
        </div>
        <button type="button" className="fi-btn fi-btn-primary fi-btn-block" disabled={!selected.size || busy} onClick={print}>
          <Icon name="printer" size={18} /> {busy ? 'Making PDF…' : `Download PDF · ${labels} label${labels === 1 ? '' : 's'} · ${pages} page${pages === 1 ? '' : 's'}`}
        </button>
        <span className="fi-hint" style={{ textAlign: 'center' }}>Print on A4 at “Actual size / 100%”.</span>
      </div>
    </div>
  );
}

/* ── Purposes ── */

export function FindItPurposes() {
  const list = useLoad(() => fi.purposes(), []);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const run = async (fn) => { setError(''); try { await fn(); await list.reload(); } catch (err) { setError(getErrorMessage(err)); } };
  const add = (e) => { e.preventDefault(); if (name.trim()) run(async () => { await fi.savePurpose({ name: name.trim() }); setName(''); }); };

  return (
    <div className="fi fi-stack" style={{ maxWidth: 720 }}>
      <div><h1 className="fi-title">Purposes</h1><p className="fi-sub">Groups like Marriage Items, Winter Clothes, Documents. Optional on every box.</p></div>
      <ErrorMsg message={error} />
      <form className="fi-row" onSubmit={add} style={{ flexWrap: 'nowrap' }}>
        <input className="fi-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New purpose" aria-label="New purpose name" />
        <button type="submit" className="fi-btn fi-btn-primary" disabled={!name.trim()}><Icon name="plus" size={16} /> Add</button>
      </form>
      {list.loading && !list.data ? <Loading /> : (list.data || []).length === 0 ? <div className="fi-card fi-empty">No purposes yet.</div> : (
        <div className="fi-stack" style={{ gap: 8 }}>
          {list.data.map((p) => (
            <div key={p.id} className="fi-card" style={{ padding: 12, opacity: p.is_active ? 1 : 0.6 }}>
              <div className="fi-row" style={{ justifyContent: 'space-between' }}>
                <Link to={`/findit/boxes?purpose=${p.id}`} style={{ textDecoration: 'none', minWidth: 0 }}>
                  <strong style={{ color: '#1B2A4A', fontSize: 15, overflowWrap: 'anywhere' }}>{p.name}</strong>
                  <div className="fi-muted">{p.assets} box{p.assets === 1 ? '' : 'es'}{p.is_active ? '' : ' · hidden'}</div>
                </Link>
                <span className="fi-row">
                  <button type="button" className="fi-btn fi-btn-sm" onClick={() => { const v = window.prompt('Rename purpose', p.name); if (v && v.trim() !== p.name) run(() => fi.savePurpose({ name: v.trim() }, p.id)); }}>Rename</button>
                  <button type="button" className="fi-btn fi-btn-sm" onClick={() => run(() => fi.savePurpose({ is_active: !p.is_active }, p.id))}>{p.is_active ? 'Hide' : 'Show'}</button>
                  <button type="button" className="fi-btn fi-btn-sm fi-btn-danger" onClick={() => window.confirm(`Delete “${p.name}”? ${p.assets} box(es) keep their details but lose this purpose.`) && run(() => fi.deletePurpose(p.id))}>Delete</button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Family (household sharing) ── */

export function FindItFamily() {
  const hh = useLoad(() => fi.household(), []);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const run = async (fn, ok) => { setError(''); setMsg(''); try { hh.setData(await fn()); if (ok) setMsg(ok); } catch (err) { setError(getErrorMessage(err)); } };
  const data = hh.data;

  return (
    <div className="fi fi-stack" style={{ maxWidth: 640 }}>
      <div><h1 className="fi-title">Family</h1><p className="fi-sub">Everyone here sees and edits the same boxes. Each person uses their own login, so history shows who changed what.</p></div>
      <ErrorMsg message={error} />
      {msg && <div className="fi-ok-msg">{msg}</div>}
      {!data ? <Loading /> : (
        <>
          <div className="fi-card fi-row" style={{ justifyContent: 'space-between' }}>
            <div><div className="fi-muted">Household</div><strong style={{ fontSize: 17, color: '#1B2A4A' }}>{data.name}</strong></div>
            {data.is_owner && <button type="button" className="fi-btn fi-btn-sm" onClick={() => { const v = window.prompt('Household name', data.name); if (v && v.trim()) run(() => fi.renameHousehold(v.trim())); }}>Rename</button>}
          </div>
          <div className="fi-stack" style={{ gap: 8 }}>
            {data.members.map((m) => (
              <div key={m.id} className="fi-card fi-row" style={{ justifyContent: 'space-between', padding: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: '#1B2A4A', overflowWrap: 'anywhere' }}>{m.name}</strong>
                  <div className="fi-muted" style={{ overflowWrap: 'anywhere' }}>{m.email} · {m.role === 'owner' ? 'Owner' : 'Member'}</div>
                </div>
                {data.is_owner && m.role !== 'owner' && (
                  <button type="button" className="fi-btn fi-btn-sm fi-btn-danger" onClick={() => window.confirm(`Remove ${m.name}? They will no longer see your boxes.`) && run(async () => { await fi.removeMember(m.id); return fi.household(); })}>Remove</button>
                )}
              </div>
            ))}
          </div>
          {data.is_owner ? (
            <form className="fi-card fi-stack" onSubmit={(e) => { e.preventDefault(); if (email.trim()) run(async () => { const r = await fi.addMember(email.trim()); setEmail(''); return r; }, 'Added. They now see FindIt when they log in.'); }}>
              <label className="fi-field">
                <span className="fi-label">Add a family member</span>
                <input className="fi-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their login email" autoComplete="off" />
                <span className="fi-hint">They need an account first (Register on the login page). Adding them also gives them the FindIt module.</span>
              </label>
              <button type="submit" className="fi-btn fi-btn-dark" disabled={!email.trim()}>Add to household</button>
            </form>
          ) : <p className="fi-muted">Only the household owner can add or remove people.</p>}
        </>
      )}
    </div>
  );
}

