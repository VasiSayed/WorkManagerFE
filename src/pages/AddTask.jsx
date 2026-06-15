import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { T, PRIORITY_COLORS, PRIORITY_ICONS } from '../theme';
import { parseNotepadMulti } from '../utils/parser';
import { WizardBar, SelectCard, SourceCard, Card, Btn, Badge, StatusBadge, PriorityBadge, Modal } from '../components/UI';

const EMPTY_ROW = () => ({
  id: Date.now() + Math.random(),
  name: '', date: '', start: '', end: '',
  priority: 'normal', status: 'todo', assigned: '',
});

export default function AddTask() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = parseInt(searchParams.get('step') || '0');

  const [sel, setSel] = useState({ type: null, source: null, project: null });
  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [activeId, setActiveId] = useState(null);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [notepadText, setNotepadText] = useState('');

  const goStep = (n) => setSearchParams({ step: n });

  const srcList = sel.type === 'job'
    ? [{ id: 1, name: 'TechCorp Solutions', sub: 'Senior Dev', icon: '🏢' }]
    : [{ id: 1, name: 'FreelanceHub', sub: 'Aakash Mehta', icon: '💻' }, { id: 2, name: 'ClientCo', sub: 'Sunita Kapoor', icon: '🎨' }];

  const prjList = sel.type === 'job'
    ? [{ id: 1, name: 'Payroll System' }, { id: 2, name: 'Task Manager' }]
    : [{ id: 1, name: 'E-Commerce App' }, { id: 2, name: 'Website Redesign' }];

  const srcName = sel.source ? (srcList.find(s => s.id === sel.source) || {}).name || '—' : '—';
  const prjName = sel.project ? (prjList.find(p => p.id === sel.project) || {}).name || '—' : '—';
  const validRows = rows.filter(r => r.name.trim());

  const upd = (id, field, val) => setRows(rs => rs.map(r => r.id === id ? { ...r, [field]: val } : r));
  const addRow = () => { const r = EMPTY_ROW(); setRows(rs => [...rs, r]); setActiveId(r.id); };
  const delRow = (id) => setRows(rs => rs.length > 1 ? rs.filter(r => r.id !== id) : rs);

  const handleNotepadSave = () => {
    const parsed = parseNotepadMulti(notepadText);
    if (!parsed.length) { setNotepadOpen(false); return; }
    const newRows = parsed.map((t, i) => ({ ...EMPTY_ROW(), ...t, id: Date.now() + i }));
    setRows(rs => (rs.length === 1 && !rs[0].name) ? newRows : [...rs, ...newRows]);
    setNotepadText('');
    setNotepadOpen(false);
  };

  const cellStyle = (isActive) => ({
    padding: '6px 8px', border: `1px solid ${isActive ? T.gold : 'transparent'}`,
    borderRadius: 6, fontSize: 12, outline: 'none', width: '100%',
    background: isActive ? T.white : 'transparent', fontFamily: 'inherit',
    transition: 'border-color .1s',
  });

  const STEPS = ['Type', 'Source', 'Project', 'Tasks', 'Review'];

  return (
    <div>
      {/* Notepad Modal */}
      <Modal open={notepadOpen} onClose={() => setNotepadOpen(false)} title="📝 Notepad — Quick Task Entry" subtitle="Separate multiple tasks with a blank line" width={540}>
        <div style={{ background: T.cream, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: T.slateLight, lineHeight: 1.7 }}>
          <strong style={{ color: T.navy }}>Format:</strong> name, YYYY-MM-DD, HH:MM-HH:MM, priority (urgent/high/normal/low), assigned to<br />
          <span style={{ fontFamily: 'monospace', color: T.navy, fontSize: 11 }}>Fix login bug, 2025-06-14, 10:00-12:00, high, Rahul</span>
        </div>
        <textarea value={notepadText} onChange={e => setNotepadText(e.target.value)} autoFocus
          placeholder={"Fix login bug, 2025-06-14, 10:00-12:00, high, Rahul\n\nWrite unit tests\n2025-06-15\n09:00-11:00\nnormal\n\nCode review PR #48, 2025-06-16, 14:00-15:00, low"}
          style={{ width: '100%', height: 170, padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontFamily: "'Courier New', monospace", resize: 'none', outline: 'none', lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border}
        />
        {(() => {
          const p = notepadText.trim() ? parseNotepadMulti(notepadText) : [];
          return p.length > 0 ? (
            <div style={{ marginTop: 10, padding: '8px 12px', background: T.successBg, borderRadius: 7, border: `1px solid #B7DFD0`, fontSize: 12, color: T.success }}>
              ✅ {p.length} task{p.length > 1 ? 's' : ''} detected: {p.map(x => x.name).join(' · ')}
            </div>
          ) : null;
        })()}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <Btn variant="outline" onClick={() => { setNotepadText(''); setNotepadOpen(false); }}>Cancel</Btn>
          <Btn variant="gold" onClick={handleNotepadSave}>Parse & Add to Table →</Btn>
        </div>
      </Modal>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Btn variant="outline" onClick={() => navigate('/tasks')} style={{ padding: '6px 12px', fontSize: 12 }}>← Back to Tasks</Btn>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>Add Tasks</h1>
        <div style={{ display: 'flex', gap: 8, marginLeft: 6 }}>
          {sel.type && <Badge label={sel.type === 'job' ? '🏢 Job' : sel.type === 'freelancing' ? '💻 Freelance' : '✏️ Manual'} color="navy" />}
          {srcName !== '—' && <Badge label={srcName} color="gold" />}
          {prjName !== '—' && <Badge label={prjName} color="info" />}
        </div>
      </div>

      <Card style={{ maxWidth: 1000 }}>
        <WizardBar steps={STEPS} current={stepParam} onStep={goStep} />

        {/* STEP 0 — TYPE */}
        {stepParam === 0 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>What type of task?</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click a card — it will auto-advance to the next step</p>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['🏢','Job','From your employment','job'],['💻','Freelancing','For a client/source','freelancing'],['✏️','Manual','Free-form, no source','manual']].map(([ic,lb,sub,v]) => (
                <SelectCard key={v} icon={ic} label={lb} sub={sub}
                  selected={sel.type === v}
                  onClick={() => { setSel({ type: v, source: null, project: null }); setTimeout(() => goStep(v === 'manual' ? 3 : 1), 160); }}
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 — SOURCE */}
        {stepParam === 1 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>
              Select {sel.type === 'job' ? 'company / job' : 'client / source'}
            </h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click to select and continue</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              {srcList.map(s => (
                <SourceCard key={s.id} icon={s.icon} title={s.name} sub={s.sub}
                  selected={sel.source === s.id}
                  onClick={() => { setSel({ ...sel, source: s.id, project: null }); setTimeout(() => goStep(2), 160); }}
                />
              ))}
            </div>
            <Btn variant="outline" onClick={() => goStep(0)} style={{ fontSize: 12 }}>← Back</Btn>
          </div>
        )}

        {/* STEP 2 — PROJECT */}
        {stepParam === 2 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select project</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click to select and continue to tasks</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {prjList.map(pr => (
                <div key={pr.id}
                  onClick={() => { setSel({ ...sel, project: pr.id }); setTimeout(() => goStep(3), 160); }}
                  style={{ border: `2px solid ${sel.project === pr.id ? T.gold : T.border}`, borderRadius: 10, padding: '14px 20px', cursor: 'pointer', background: sel.project === pr.id ? T.goldLight : T.white, display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = T.goldLight; }}
                  onMouseLeave={e => { if (sel.project !== pr.id) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.white; } }}
                >
                  <span style={{ fontSize: 20 }}>📁</span>
                  <div style={{ fontWeight: 600, color: T.navy, fontSize: 13 }}>{pr.name}</div>
                  <span style={{ fontSize: 11, color: T.gold, marginLeft: 'auto', fontWeight: 600 }}>→</span>
                </div>
              ))}
            </div>
            <Btn variant="outline" onClick={() => goStep(1)} style={{ fontSize: 12 }}>← Back</Btn>
          </div>
        )}

        {/* STEP 3 — INLINE TASK TABLE */}
        {stepParam === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 2 }}>Add Tasks</h2>
                <p style={{ fontSize: 12, color: T.slateLight }}>{validRows.length} task{validRows.length !== 1 ? 's' : ''} ready · Click any cell to edit inline</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="outline" onClick={() => setNotepadOpen(true)} style={{ fontSize: 12 }}>📝 Notepad Import</Btn>
                <Btn variant="gold" onClick={addRow} style={{ fontSize: 12 }}>＋ Add Row</Btn>
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ background: T.navy }}>
                    {['#', 'Task Name *', 'Date', 'Start', 'End', 'Priority', 'Status', 'Assigned To', ''].map((h, i) => (
                      <th key={i} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.white, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const isActive = activeId === row.id;
                    return (
                      <tr key={row.id} onClick={() => setActiveId(row.id)}
                        style={{ background: isActive ? T.goldLight : !row.name ? T.rowAlt : T.white, cursor: 'pointer', borderBottom: `1px solid ${T.border}`, transition: 'background .1s' }}>
                        <td style={{ padding: '6px 10px', fontSize: 11, color: T.slateLight, fontWeight: 600, textAlign: 'center', verticalAlign: 'middle', minWidth: 32 }}>{i + 1}</td>
                        <td style={{ padding: '4px 8px', verticalAlign: 'middle', minWidth: 220 }}>
                          <input value={row.name} onChange={e => upd(row.id, 'name', e.target.value)} placeholder="Task name…"
                            style={{ ...cellStyle(isActive), fontWeight: row.name ? 500 : 400, color: row.name ? T.navy : T.slateLight }}
                            onFocus={e => { setActiveId(row.id); e.target.style.background = T.white; e.target.style.borderColor = T.gold; }}
                            onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                          />
                        </td>
                        <td style={{ padding: '4px 8px', verticalAlign: 'middle' }}>
                          <input type="date" value={row.date} onChange={e => upd(row.id, 'date', e.target.value)}
                            style={{ ...cellStyle(isActive), minWidth: 130 }}
                            onFocus={e => { setActiveId(row.id); e.target.style.background = T.white; e.target.style.borderColor = T.gold; }}
                            onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                          />
                        </td>
                        {['start', 'end'].map(field => (
                          <td key={field} style={{ padding: '4px 8px', verticalAlign: 'middle' }}>
                            <input type="time" value={row[field]} onChange={e => upd(row.id, field, e.target.value)}
                              style={cellStyle(isActive)}
                              onFocus={e => { setActiveId(row.id); e.target.style.background = T.white; e.target.style.borderColor = T.gold; }}
                              onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                            />
                          </td>
                        ))}
                        <td style={{ padding: '4px 8px', verticalAlign: 'middle', minWidth: 110 }}>
                          {isActive ? (
                            <select value={row.priority} onChange={e => upd(row.id, 'priority', e.target.value)}
                              style={{ ...cellStyle(true), background: T.white }}>
                              {[['urgent','🔴 Urgent'],['high','🟠 High'],['normal','🔵 Normal'],['low','⚪ Low']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: PRIORITY_COLORS[row.priority] }}>
                              {PRIORITY_ICONS[row.priority]} {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '4px 8px', verticalAlign: 'middle', minWidth: 120 }}>
                          {isActive ? (
                            <select value={row.status} onChange={e => upd(row.id, 'status', e.target.value)}
                              style={{ ...cellStyle(true), background: T.white }}>
                              {[['todo','To Do'],['in_progress','In Progress'],['completed','Completed']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          ) : <StatusBadge status={row.status} />}
                        </td>
                        <td style={{ padding: '4px 8px', verticalAlign: 'middle', minWidth: 120 }}>
                          <input value={row.assigned} onChange={e => upd(row.id, 'assigned', e.target.value)} placeholder="Name…"
                            style={cellStyle(isActive)}
                            onFocus={e => { setActiveId(row.id); e.target.style.background = T.white; e.target.style.borderColor = T.gold; }}
                            onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                          />
                        </td>
                        <td style={{ padding: '4px 6px', verticalAlign: 'middle', textAlign: 'center' }}>
                          <button onClick={e => { e.stopPropagation(); delRow(row.id); }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: T.slateLight, fontSize: 13, padding: '2px 5px', borderRadius: 4, transition: 'all .1s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = T.errorBg; e.currentTarget.style.color = T.error; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.slateLight; }}
                          >✕</button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr onClick={addRow} style={{ cursor: 'pointer', background: T.rowAlt }}
                    onMouseEnter={e => e.currentTarget.style.background = T.goldLight}
                    onMouseLeave={e => e.currentTarget.style.background = T.rowAlt}>
                    <td colSpan={9} style={{ padding: '9px 14px', fontSize: 12, color: T.gold, fontWeight: 600 }}>＋ Click to add another task</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 14, marginBottom: 16, fontSize: 11, color: T.slateLight, flexWrap: 'wrap' }}>
              <span>💡 Click any row to activate editing</span>
              <span>·</span>
              <span>📝 Notepad Import — paste tasks in plain text with commas or newlines</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Btn variant="outline" onClick={() => goStep(sel.type === 'manual' ? 0 : 2)} style={{ fontSize: 12 }}>← Back</Btn>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {validRows.length > 0 && <span style={{ fontSize: 12, color: T.success, fontWeight: 600 }}>✓ {validRows.length} task{validRows.length > 1 ? 's' : ''} ready</span>}
                <Btn variant="gold" onClick={() => validRows.length > 0 && goStep(4)} style={{ fontSize: 12 }}>Review & Save →</Btn>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — REVIEW */}
        {stepParam === 4 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Review & Save</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 16 }}>
              {validRows.length} task{validRows.length > 1 ? 's' : ''} · Source: <strong>{srcName}</strong> · Project: <strong>{prjName}</strong>
            </p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {sel.type && <div style={{ background: T.navyTint, borderRadius: 8, padding: '7px 14px', fontSize: 12 }}><span style={{ color: T.slateLight }}>Type: </span><strong style={{ color: T.navy, textTransform: 'capitalize' }}>{sel.type}</strong></div>}
              {srcName !== '—' && <div style={{ background: T.goldLight, borderRadius: 8, padding: '7px 14px', fontSize: 12 }}><span style={{ color: T.slateLight }}>Source: </span><strong style={{ color: T.goldDark }}>{srcName}</strong></div>}
              {prjName !== '—' && <div style={{ background: T.infoBg, borderRadius: 8, padding: '7px 14px', fontSize: 12 }}><span style={{ color: T.slateLight }}>Project: </span><strong style={{ color: T.info }}>{prjName}</strong></div>}
            </div>

            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: T.navy }}>
                    {['#', 'Task Name', 'Date', 'Time', 'Priority', 'Status', 'Assigned'].map((h, i) => (
                      <th key={i} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.white, letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validRows.map((row, i) => (
                    <tr key={row.id} style={{ background: i % 2 === 1 ? T.rowAlt : T.white, borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: T.slateLight, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: T.navy }}>{row.name}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: T.slate }}>{row.date || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: T.slate }}>{row.start && row.end ? `${row.start}–${row.end}` : '—'}</td>
                      <td style={{ padding: '10px 12px' }}><PriorityBadge priority={row.priority} /></td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge status={row.status} /></td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: T.slate }}>{row.assigned || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: 10, background: T.successBg, border: `1px solid #B7DFD0`, marginBottom: 20, fontSize: 13, color: T.success }}>
              ✅ Ready to save {validRows.length} task{validRows.length > 1 ? 's' : ''}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Btn variant="outline" onClick={() => goStep(3)}>← Edit Tasks</Btn>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="outline" onClick={() => navigate('/tasks')}>Cancel</Btn>
                <Btn variant="gold" onClick={() => navigate('/tasks')}>✓ Save {validRows.length} Task{validRows.length > 1 ? 's' : ''}</Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
