import { Link, useNavigate } from 'react-router-dom';
import { getStoredUser } from '../api/client';
import { Icon } from '../components/Icons';
import { lastModule, MODULES, rememberModule } from '../modules';
import { T } from '../theme';

/** Start screen: pick a module; the sidebar then shows only that module's pages. */
export default function ModuleHome() {
  const navigate = useNavigate();
  const user = getStoredUser() || {};
  const last = lastModule();
  const open = (m, path = m.items[0].path) => { rememberModule(m.key); navigate(path); };
  const firstName = (user.full_name || '').split(' ')[0];

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.navy }}>{firstName ? `Hi ${firstName}, ` : ''}what are you working on?</h1>
          <p style={{ fontSize: 13, color: T.slateLight, marginTop: 4 }}>Choose a module. You can switch any time from the left bar.</p>
        </div>
        {last && (
          <button type="button" onClick={() => open(last)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.white, color: T.navy, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <Icon name={last.icon} size={16} style={{ color: last.color }} /> Continue in {last.label} <Icon name="arrowRight" size={14} />
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
        {MODULES.map((m) => (
          <div key={m.key} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
            <button type="button" onClick={() => open(m)} style={{ display: 'flex', gap: 12, alignItems: 'center', border: 0, background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ width: 46, height: 46, borderRadius: 13, background: `${m.color}1A`, color: m.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={m.icon} size={23} /></span>
              <span>
                <span style={{ display: 'block', fontSize: 17, fontWeight: 800, color: T.navy }}>{m.label}</span>
                <span style={{ display: 'block', fontSize: 12, color: T.slateLight, marginTop: 2, lineHeight: 1.4 }}>{m.description}</span>
              </span>
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {m.items.slice(0, 5).map((item) => (
                <Link key={item.path} to={item.path} onClick={() => rememberModule(m.key)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 999, background: T.rowAlt, border: `1px solid ${T.border}`, color: T.slate, fontWeight: 600 }}>{item.label}</Link>
              ))}
              {m.items.length > 5 && <span style={{ fontSize: 11, padding: '4px 4px', color: T.slateLight }}>+{m.items.length - 5} more</span>}
            </div>
            <button type="button" onClick={() => open(m)} style={{ marginTop: 'auto', padding: '9px 12px', borderRadius: 10, border: 0, background: T.navy, color: T.white, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Open {m.label} <Icon name="arrowRight" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
