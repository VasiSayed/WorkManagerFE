import { useEffect, useState } from 'react';
import { apiRequest, getErrorMessage, getStoredUser } from '../api/client';
import { Icon } from '../components/Icons';
import { refreshAppUser, useAppUser } from '../modules';
import { T } from '../theme';

/** Admin: tick which modules each person can use. Works the same on phone and desktop (one card per person). */
export default function AccessPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const me = useAppUser() || getStoredUser() || {};

  const load = async () => {
    setError('');
    try { setData(await apiRequest('/auth/users/')); }
    catch (err) { setError(getErrorMessage(err)); }
  };
  useEffect(() => { if (me.is_admin !== false) void load(); }, [me.is_admin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (me.is_admin === false) {
    return (
      <div style={{ maxWidth: 440, margin: '48px auto', textAlign: 'center', background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: '28px 20px' }}>
        <Icon name="lock" size={30} style={{ color: T.slateLight }} />
        <h1 style={{ fontSize: 18, color: T.navy, margin: '10px 0 6px' }}>Only admins can manage access</h1>
        <p style={{ fontSize: 13, color: T.slateLight }}>Ask the admin if you need another module.</p>
      </div>
    );
  }

  const toggle = async (user, key) => {
    const modules = user.modules.includes(key) ? user.modules.filter((m) => m !== key) : [...user.modules, key];
    setSaving(`${user.id}:${key}`); setError('');
    try {
      const updated = await apiRequest(`/auth/users/${user.id}/modules/`, { method: 'PUT', body: { modules } });
      setData((d) => ({ ...d, users: d.users.map((u) => (u.id === user.id ? updated : u)) }));
      if (user.id === me.id) await refreshAppUser();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSaving(null); }
  };

  const users = (data?.users || []).filter((u) => !search || `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: T.navy }}>Users & Access</h1>
      <p style={{ fontSize: 13, color: T.slateLight, margin: '4px 0 16px', lineHeight: 1.5 }}>
        Tap a module to switch it on or off for that person. They only see the modules that are on. New sign-ups start with none.
      </p>
      {error && <div style={{ padding: '10px 12px', borderRadius: 10, background: T.errorBg, color: T.error, fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" aria-label="Search users"
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${T.border}`, fontSize: 15, marginBottom: 14, fontFamily: 'inherit' }} />
      {!data ? <div style={{ padding: 24, textAlign: 'center', color: T.slateLight }}>Loading…</div> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {users.map((u) => (
            <div key={u.id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: T.navy, fontSize: 15, overflowWrap: 'anywhere' }}>{u.full_name || u.email}</div>
                  <div style={{ fontSize: 12, color: T.slateLight, overflowWrap: 'anywhere' }}>{u.email}</div>
                </div>
                {u.is_admin && <span style={{ fontSize: 11, fontWeight: 800, color: T.goldDark, background: T.goldLight, padding: '4px 10px', borderRadius: 999 }}>Admin · all modules</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {data.modules.map((m) => {
                  const on = u.modules.includes(m.key);
                  const busy = saving === `${u.id}:${m.key}`;
                  return (
                    <button key={m.key} type="button" disabled={u.is_admin || busy} onClick={() => toggle(u, m.key)} aria-pressed={on}
                      style={{ minHeight: 40, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: u.is_admin ? 'default' : 'pointer',
                        border: `1.5px solid ${on ? T.success : T.border}`, background: on ? T.successBg : T.white, color: on ? T.success : T.slateLight,
                        opacity: busy ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {on && <Icon name="check" size={14} />}{m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {users.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: T.slateLight }}>No one matches.</div>}
        </div>
      )}
    </div>
  );
}
