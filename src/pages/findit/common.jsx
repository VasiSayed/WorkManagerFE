import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, authFetch, getErrorMessage, normalizeList } from '../../api/client';
import { Icon } from '../../components/Icons';
import './findit.css';

/* ── API ── */

const F = '/findit';
export const fi = {
  summary: () => apiRequest(`${F}/assets/summary/`),
  list: (params) => apiRequest(`${F}/assets/`, { params }),
  get: (uuid) => apiRequest(`${F}/assets/${uuid}/`),
  update: (uuid, body) => apiRequest(`${F}/assets/${uuid}/`, { method: 'PATCH', body }),
  setStatus: (uuid, status) => apiRequest(`${F}/assets/${uuid}/status/`, { method: 'POST', body: { status } }),
  reset: (uuid) => apiRequest(`${F}/assets/${uuid}/reset/`, { method: 'POST', body: { confirm: true } }),
  addImages: (uuid, files) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f, f.name));
    return apiRequest(`${F}/assets/${uuid}/images/`, { method: 'POST', body: form, isFormData: true });
  },
  removeImage: (uuid, id) => apiRequest(`${F}/assets/${uuid}/images/${id}/`, { method: 'DELETE' }),
  history: (uuid) => apiRequest(`${F}/assets/${uuid}/history/`),
  resolve: (q) => apiRequest(`${F}/assets/resolve/`, { params: { q } }),
  bulk: (count) => apiRequest(`${F}/assets/bulk/`, { method: 'POST', body: { count } }),
  locations: (q) => apiRequest(`${F}/assets/locations/`, { params: { q } }),
  containers: (q, exclude) => apiRequest(`${F}/assets/containers/`, { params: { q, exclude } }),
  purposes: (params) => apiRequest(`${F}/purposes/`, { params }).then(normalizeList),
  savePurpose: (body, id) => apiRequest(id ? `${F}/purposes/${id}/` : `${F}/purposes/`, { method: id ? 'PATCH' : 'POST', body }),
  deletePurpose: (id) => apiRequest(`${F}/purposes/${id}/`, { method: 'DELETE' }),
  household: () => apiRequest(`${F}/household/`),
  renameHousehold: (name) => apiRequest(`${F}/household/`, { method: 'PATCH', body: { name } }),
  addMember: (email) => apiRequest(`${F}/household/members/`, { method: 'POST', body: { email } }),
  removeMember: (id) => apiRequest(`${F}/household/members/${id}/`, { method: 'DELETE' }),
  /** Label PDF as a Blob (needs the token, so it can't be a plain link). */
  async labelsPdf(ids, copies = 1) {
    const res = await authFetch(`${F}/labels/pdf/`, { method: 'POST', body: { ids, copies } });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Could not make the PDF (HTTP ${res.status})`);
    }
    return res.blob();
  },
};

/** Opens the label PDF: a new tab on desktop, the phone's PDF viewer/download on mobile. */
export async function openLabelsPdf(ids, copies = 1) {
  const blob = await fi.labelsPdf(ids, copies);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.download = `findit-labels-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await fn()); }
    catch (err) { setError(err.status === 404 ? 'not_found' : getErrorMessage(err)); }
    finally { setLoading(false); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  return { data, setData, loading, error, reload: load };
}

/* ── Photos: shrink on the phone before upload (saves data and server space; turns iPhone HEIC into JPEG) ── */

export async function compressImage(file, maxSide = 1600, quality = 0.85) {
  if (!file.type.startsWith('image/')) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // the server re-encodes anyway
  }
}

/* ── Small UI pieces ── */

export const STATUS_LABEL = { empty: 'Empty', draft: 'Draft', ready: 'Ready', archived: 'Archived' };

export function StatusPill({ status }) {
  return <span className={`fi-pill fi-pill-${status}`}>{status === 'ready' && <Icon name="check" size={12} />}{STATUS_LABEL[status] || status}</span>;
}

export function ErrorMsg({ message }) {
  return message ? <div className="fi-error" role="alert">{message}</div> : null;
}

export function Loading({ label = 'Loading…' }) {
  return <div className="fi-empty">{label}</div>;
}

export function BoxCard({ box }) {
  return (
    <Link to={`/findit/box/${box.uuid}`} className="fi-box">
      {box.thumb_url
        ? <img className="fi-thumb" src={box.thumb_url} alt="" loading="lazy" />
        : <span className="fi-thumb"><Icon name="box" size={30} /></span>}
      <span style={{ minWidth: 0 }}>
        <span className="fi-row" style={{ justifyContent: 'space-between', gap: 6 }}>
          <span className="fi-ref">{box.reference}</span>
          <StatusPill status={box.status} />
        </span>
        <span className="fi-box-name" style={{ display: 'block', marginTop: 2 }}>{box.name || <span className="fi-muted">Not registered yet</span>}</span>
        <span className="fi-box-meta">
          {box.purpose_name && <span><Icon name="tag" size={12} />{box.purpose_name}</span>}
          {box.location && <span><Icon name="pin" size={12} />{box.location}</span>}
          {box.stored_inside && <span><Icon name="box" size={12} />in {box.stored_inside.reference}{box.stored_inside.name ? ` ${box.stored_inside.name}` : ''}</span>}
          {box.image_count > 1 && <span><Icon name="image" size={12} />{box.image_count}</span>}
        </span>
        {box.short_description && <span className="fi-box-desc" style={{ display: '-webkit-box' }}>{box.short_description}</span>}
      </span>
    </Link>
  );
}

/** Bottom sheet on phones, centred dialog on wider screens. */
export function Sheet({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fi-sheet-back fi" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fi-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="fi-sheet-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Viewer({ images, index, onClose, onIndex, onDelete }) {
  if (index === null || index === undefined || !images[index]) return null;
  const img = images[index];
  return (
    <div className="fi-viewer fi" role="dialog" aria-modal="true" aria-label="Photo">
      <div className="fi-viewer-top">
        <span style={{ fontSize: 14 }}>{index + 1} / {images.length}</span>
        <span className="fi-row">
          {onDelete && <button type="button" className="fi-btn fi-btn-sm" onClick={() => onDelete(img)}><Icon name="trash" size={15} /> Delete</button>}
          <button type="button" className="fi-btn fi-btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </span>
      </div>
      <div className="fi-viewer-img" onClick={onClose}><img src={img.url} alt={img.original_name || 'Photo'} /></div>
      {images.length > 1 && (
        <div className="fi-viewer-nav">
          <button type="button" className="fi-btn" onClick={() => onIndex((index - 1 + images.length) % images.length)}><Icon name="arrowLeft" size={16} /> Prev</button>
          <button type="button" className="fi-btn" onClick={() => onIndex((index + 1) % images.length)}>Next <Icon name="arrowRight" size={16} /></button>
        </div>
      )}
    </div>
  );
}

export const prettyDateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
