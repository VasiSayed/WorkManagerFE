import React from 'react';
import { T, PRIORITY_COLORS } from '../theme';
import { Icon } from './Icons';

const useIsMobile = () => {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [mobile, setMobile] = React.useState(get);
  React.useEffect(() => {
    const onResize = () => setMobile(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
};

/* ── BADGE ── */
export const Badge = ({ label, color = 'navy', size = 'sm' }) => {
  const C = {
    navy:    { bg: T.navyTint,  text: T.navy,       br: '#C7D5ED' },
    gold:    { bg: T.goldLight, text: T.goldDark,   br: '#EDD590' },
    success: { bg: T.successBg, text: T.success,    br: '#B7DFD0' },
    warning: { bg: T.warningBg, text: T.warning,    br: '#F6D860' },
    error:   { bg: T.errorBg,   text: T.error,      br: '#FECACA' },
    info:    { bg: T.infoBg,    text: T.info,       br: '#BFDBFE' },
    slate:   { bg: '#F1F5F9',   text: T.slateLight, br: T.border  },
  };
  const c = C[color] || C.slate;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      borderRadius: 20, fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600, background: c.bg, color: c.text,
      border: `1px solid ${c.br}`, letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
};

export const StatusBadge = ({ status }) => {
  const m = {
    completed:   ['Completed',   'success'],
    received:    ['Received',    'success'],
    active:      ['Active',      'success'],
    sent:        ['Sent',        'success'],
    in_progress: ['In Progress', 'info'],
    scheduled:   ['Scheduled',   'info'],
    partial:     ['Partial',     'warning'],
    approved:    ['Approved',    'warning'],
    todo:        ['To Do',       'navy'],
    pending:     ['Pending',     'gold'],
    failed:      ['Failed',      'error'],
    cancelled:   ['Cancelled',   'error'],
    draft:       ['Draft',       'slate'],
    resigned:    ['Resigned',    'error'],
    probation:   ['Probation',   'warning'],
  };
  const [l, c] = m[status] || [status, 'slate'];
  return <Badge label={l} color={c} />;
};

export const PriorityBadge = ({ priority }) => {
  const m = {
    urgent: ['Urgent', 'error'],
    high:   ['High',   'warning'],
    normal: ['Normal', 'navy'],
    low:    ['Low',    'slate'],
  };
  const [l, c] = m[priority] || [priority, 'slate'];
  return <Badge label={l} color={c} />;
};

export const TypeBadge = ({ type }) => {
  const lm = { job: 'Job', freelancing: 'Freelance', manual: 'Manual' };
  const cm = { job: 'navy', freelancing: 'info', manual: 'slate' };
  return <Badge label={lm[type] || type} color={cm[type] || 'slate'} />;
};

/* ── CARD ── */
export const Card = ({ children, style = {} }) => {
  const mobile = useIsMobile();
  return <div style={{
    background: T.white, border: `1px solid ${T.border}`,
    borderRadius: 12, padding: mobile ? '16px' : '20px 24px', ...style,
  }}>{children}</div>;
};

/* ── STAT CARD ── */
const renderIcon = (icon, fallback = 'file', size = 22) => React.isValidElement(icon) ? icon : <Icon name={icon || fallback} size={size} />;

export const StatCard = ({ icon, label, value, sub, color = T.navy }) => (
  <div style={{
    background: T.white, border: `1px solid ${T.border}`, borderRadius: 12,
    padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8,
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: color, borderRadius: '12px 0 0 12px' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: 11, color: T.slateLight, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ lineHeight: 1, color }}>{renderIcon(icon, 'chart', 22)}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, color: T.navy, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: T.slateLight }}>{sub}</div>}
  </div>
);

/* ── BUTTON ── */
export const Btn = ({ children, variant = 'primary', onClick, style = {}, type = 'button', disabled = false }) => {
  const S = {
    primary: { background: T.navy,    color: T.white, border: `1px solid ${T.navy}` },
    gold:    { background: T.gold,    color: T.white, border: `1px solid ${T.gold}` },
    outline: { background: T.white,   color: T.navy,  border: `1px solid ${T.border}` },
    ghost:   { background: 'transparent', color: T.slateLight, border: 'none' },
    danger:  { background: T.error,   color: T.white, border: `1px solid ${T.error}` },
  };
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        ...S[variant], padding: '8px 16px', borderRadius: 8, fontSize: 13,
        fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        transition: 'opacity .15s', opacity: disabled ? 0.5 : 1, ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '.82'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >{children}</button>
  );
};

/* ── PAGE HEADER ── */
export const PageHeader = ({ title, sub, action }) => {
  const mobile = useIsMobile();
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: mobile ? 'stretch' : 'flex-start', marginBottom: mobile ? 16 : 24, gap: 12, flexDirection: mobile ? 'column' : 'row' }}>
    <div>
      <h1 style={{ fontSize: mobile ? 19 : 22, fontWeight: 800, color: T.navy, marginBottom: 4 }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: T.slateLight }}>{sub}</p>}
    </div>
    {action && <div style={{display:'flex', flexWrap:'wrap', gap:8}}>{action}</div>}
  </div>;
};

/* ── SECTION TITLE ── */
export const SectionTitle = ({ children, style = {} }) => (
  <h3 style={{ fontSize: 11, fontWeight: 700, color: T.slateLight, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, ...style }}>{children}</h3>
);

/* ── TABLE WRAPPER ── */
export const TableWrapper = ({ children }) => (
  <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 10 }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>{children}</table>
  </div>
);

export const Th = ({ children, w }) => (
  <th style={{ background: T.navy, color: T.white, padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap', width: w }}>{children}</th>
);

export const Td = ({ children, alt }) => (
  <td style={{ padding: '11px 14px', borderBottom: `1px solid ${T.border}`, background: alt ? T.rowAlt : T.white, fontSize: 13, verticalAlign: 'middle' }}>{children}</td>
);

/* ── FILTER CHIPS ── */
export const FilterChips = ({ options, active, onChange }) => (
  <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
    {options.map(([value, label]) => (
      <button key={value} onClick={() => onChange(value)} style={{
        padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', border: `1px solid ${active === value ? T.gold : T.border}`,
        background: active === value ? T.goldLight : T.white,
        color: active === value ? T.goldDark : T.slateLight, transition: 'all .12s',
      }}>{label}</button>
    ))}
  </div>
);

/* ── INPUT ── */
export const Input = ({ label, type = 'text', value, onChange, onBlur, placeholder, required, style = {}, ...rest }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>{label}{required && <span style={{ color: T.error }}> *</span>}</label>}
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} {...rest}
      style={{
        padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8,
        fontSize: 13, outline: 'none', width: '100%', fontFamily: 'inherit', ...style,
      }}
      onFocus={e => e.target.style.borderColor = T.gold}
      onBlur={e => { e.target.style.borderColor = T.border; onBlur?.(e); }}
    />
  </div>
);

export const Textarea = ({ label, value, onChange, onBlur, placeholder, rows = 3, required }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>{label}{required && <span style={{ color: T.error }}> *</span>}</label>}
    <textarea
      value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{
        padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8,
        fontSize: 13, outline: 'none', width: '100%', resize: 'vertical', fontFamily: 'inherit',
      }}
      onFocus={e => e.target.style.borderColor = T.gold}
      onBlur={e => { e.target.style.borderColor = T.border; onBlur?.(e); }}
    />
  </div>
);

export const Select = ({ label, value, onChange, options, required }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>{label}{required && <span style={{ color: T.error }}> *</span>}</label>}
    <select
      value={value} onChange={onChange}
      style={{
        padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8,
        fontSize: 13, outline: 'none', width: '100%', background: T.white, fontFamily: 'inherit',
        cursor: 'pointer',
      }}
      onFocus={e => e.target.style.borderColor = T.gold}
      onBlur={e => e.target.style.borderColor = T.border}
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);

/* ── EMPTY STATE ── */
export const EmptyState = ({ icon = <Icon name="archive" size={40} />, title, sub, action }) => (
  <div style={{ textAlign: 'center', padding: '48px 24px', color: T.slateLight }}>
    <div style={{ minHeight: 44, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.slateLight }}>{icon}</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: T.slate, marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 13, marginBottom: 16 }}>{sub}</div>
    {action}
  </div>
);

/* ── MODAL ── */
export const Modal = ({ open, onClose, title, subtitle, children, width = 560 }) => {
  const mobile = useIsMobile();
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: mobile ? 'flex-end' : 'center', justifyContent: 'center', padding: mobile ? 0 : 12 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.white, borderRadius: mobile ? '16px 16px 0 0' : 16, width: mobile ? '100vw' : width, maxWidth: mobile ? '100vw' : '95vw', boxShadow: '0 24px 64px rgba(0,0,0,.2)', overflow: 'hidden', maxHeight: mobile ? '92vh' : '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: T.navy, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer' }}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
};

/* ── WIZARD BAR ── */
export const WizardBar = ({ steps, current, onStep }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, overflowX: 'auto', paddingBottom: 4 }}>
    {steps.map((s, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: i < current ? 'pointer' : 'default' }} onClick={() => i < current && onStep(i)}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, transition: 'all .2s',
            background: i < current ? T.success : i === current ? T.gold : T.border,
            color: i <= current ? T.white : T.slateLight,
            border: i === current ? `2px solid ${T.goldDark}` : '2px solid transparent',
          }}>{i < current ? <Icon name="check" size={15} /> : i + 1}</div>
          <span style={{ fontSize: 11, color: i === current ? T.gold : i < current ? T.success : T.slateLight, marginTop: 4, whiteSpace: 'nowrap', fontWeight: i === current ? 600 : 400 }}>{s}</span>
        </div>
        {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < current ? T.success : T.border, margin: '0 4px', marginBottom: 16 }} />}
      </div>
    ))}
  </div>
);

/* ── SELECTION CARD ── */
export const SelectCard = ({ icon, label, sub, selected, onClick, hint = 'Click to select' }) => (
  <div onClick={onClick} style={{
    border: `2px solid ${selected ? T.gold : T.border}`, borderRadius: 12,
    padding: '22px 16px', textAlign: 'center', cursor: 'pointer',
    background: selected ? T.goldLight : T.white, transition: 'all .15s',
    position: 'relative', flex: 1,
  }}
    onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = T.goldLight; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
    onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.white; e.currentTarget.style.transform = ''; } }}
  >
    {selected && <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: T.gold, color: T.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={12} /></div>}
    <div style={{ marginBottom: 10, color: T.navy }}>{renderIcon(icon, 'folder', 30)}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: selected ? T.goldDark : T.navy }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: T.slateLight, marginTop: 3 }}>{sub}</div>}
    {!selected && <div style={{ fontSize: 10, color: T.gold, marginTop: 8, fontWeight: 600 }}>{hint}</div>}
  </div>
);

/* ── SOURCE CARD ── */
export const SourceCard = ({ icon, title, sub, selected, onClick }) => (
  <div onClick={onClick} style={{
    border: `2px solid ${selected ? T.gold : T.border}`, borderRadius: 12,
    padding: '16px 20px', cursor: 'pointer', background: selected ? T.goldLight : T.white,
    display: 'flex', alignItems: 'center', gap: 14, minWidth: 180, flex: 1, transition: 'all .15s',
  }}
    onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = T.goldLight; } }}
    onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.white; } }}
  >
    <span style={{ color: T.navy }}>{renderIcon(icon, 'briefcase', 26)}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 700, color: T.navy, fontSize: 13 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: T.slateLight }}>{sub}</div>}
    </div>
    {selected ? <Icon name="check" size={18} style={{ color: T.gold }} /> : <span style={{ fontSize: 11, color: T.gold, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>Select <Icon name="arrowRight" size={13} /></span>}
  </div>
);

/* ── MOM NOTEPAD MODAL ── */
import { parseMomNotepad } from '../utils/parser';

export const MomNotepadModal = ({ open, onClose, onParsed, initialText = '' }) => {
  const [text, setText] = React.useState('');
  React.useEffect(() => { if (open) setText(initialText || ''); }, [open, initialText]);

  const preview = React.useMemo(() => {
    if (!text.trim()) return null;
    const p = parseMomNotepad(text);
    return (p.mom || p.conclusion || p.next_action) ? p : null;
  }, [text]);

  const handleSave = () => {
    if (!text.trim()) { onClose(); return; }
    const parsed = parseMomNotepad(text);
    onParsed(parsed);
    setText('');
    onClose();
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: T.white, borderRadius: 16, width: 580, maxWidth: '95vw', boxShadow: '0 24px 64px rgba(0,0,0,.22)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: T.navy, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.white, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="note" size={17} /> MOM Notepad — Quick Entry</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>Type naturally — MOM, Conclusion, Actions auto-detected</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', marginTop: 2 }}><Icon name="x" size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
          {/* Format guide */}
          <div style={{ background: T.cream, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: T.slateLight, lineHeight: 1.75 }}>
            <strong style={{ color: T.navy }}>Section headers auto-detected:</strong><br />
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.navy }}>MOM:</span><span style={{ fontSize: 11 }}> &nbsp;Discussed sprint velocity, reviewed open PRs</span><br />
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.navy }}>Conclusion:</span><span style={{ fontSize: 11 }}> &nbsp;Proceed with Phase 2 next sprint</span><br />
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.navy }}>Action:</span><span style={{ fontSize: 11 }}> &nbsp;Rahul to fix login bug, Priya to update docs</span><br />
            <span style={{ fontSize: 11, color: T.slateLight }}>Or just write in plain paragraphs — blank line separates MOM / Conclusion / Actions</span>
          </div>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
            placeholder={`MOM: Discussed sprint goals, reviewed velocity metrics and blockers\n- Login bug assigned to Rahul, deadline Friday\n- API design review scheduled for Thursday\n\nConclusion: Phase 2 approved, team capacity confirmed\n\nAction: Rahul fix login bug by Fri, Priya update docs, Dev create new mockups`}
            style={{
              width: '100%', height: 220, padding: '10px 12px',
              border: `1px solid ${T.border}`, borderRadius: 8,
              fontSize: 13, fontFamily: "'Courier New', monospace",
              resize: 'none', outline: 'none', lineHeight: 1.65,
              background: '#FAFAFA',
            }}
            onFocus={e => e.target.style.borderColor = T.gold}
            onBlur={e => e.target.style.borderColor = T.border}
          />

          {/* Live preview */}
          {preview && (
            <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: `1px solid #B7DFD0` }}>
              <div style={{ background: T.success, padding: '7px 12px', fontSize: 11, fontWeight: 600, color: T.white }}>
                <Icon name="check" size={14} /> Preview — will be filled into the fields below
              </div>
              {[['MOM / Notes', preview.mom], ['Conclusion', preview.conclusion], ['Next Actions', preview.next_action]].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ padding: '8px 14px', borderBottom: `1px solid ${T.border}`, background: T.successBg }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.success, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 12, color: T.slate, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 20px 18px', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <Btn variant="outline" onClick={() => { setText(''); onClose(); }}>Cancel</Btn>
          <Btn variant="gold" onClick={handleSave} disabled={!text.trim()}>Parse & Fill Fields →</Btn>
        </div>
      </div>
    </div>
  );
};


export const Toast = ({ message, type = 'success', onClose }) => {
  const colors = { success: T.success, error: T.error, warning: T.warning, info: T.info };
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: T.white, border: `1px solid ${T.border}`, borderRadius: 10,
      padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,.12)',
      display: 'flex', alignItems: 'center', gap: 10, minWidth: 280,
      borderLeft: `4px solid ${colors[type] || T.success}`,
      animation: 'slideIn .2s ease',
    }}>
      <span style={{ display: 'inline-flex', color: colors[type] || T.info }}><Icon name={type === 'success' ? 'check' : type === 'error' || type === 'warning' ? 'alert' : 'info'} size={17} /></span>
      <span style={{ fontSize: 13, color: T.slate, flex: 1 }}>{message}</span>
      <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.slateLight, display: 'inline-flex' }}><Icon name="x" size={15} /></button>
    </div>
  );
};

/* ── BREADCRUMB ── */
export const Breadcrumb = ({ items }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.slateLight, marginBottom: 16 }}>
    {items.map((item, i) => (
      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {i > 0 && <span>›</span>}
        <span style={{ color: i === items.length - 1 ? T.navy : T.slateLight, fontWeight: i === items.length - 1 ? 500 : 400 }}>{item}</span>
      </span>
    ))}
  </div>
);
