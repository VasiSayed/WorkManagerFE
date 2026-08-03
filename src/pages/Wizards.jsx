import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { T } from '../theme';
import { parseNotepadMulti } from '../utils/parser';
import { WizardBar, SelectCard, SourceCard, Card, Btn, Badge, StatusBadge, Modal, Input, Textarea, Select, MomNotepadModal } from '../components/UI';
import { mockEmployees } from '../data/mockData';
import { Icon } from '../components/Icons';

/* ══════════════════════════════════════════════════════════
   ADD MEETING WIZARD  /meetings/new?step=0-6
══════════════════════════════════════════════════════════ */
export function AddMeeting() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const step = parseInt(sp.get('step') || '0');
  const go = (n) => setSp({ step: n });

  const [sel, setSel] = useState({ type: null, source: null, project: null });
  const [form, setForm] = useState({ title: '', date: '', start: '', end: '', location: '', link: '', agenda: '', status: 'scheduled' });
  const [members, setMembers] = useState([]);
  const [mom, setMom] = useState({ mom: '', conclusion: '', next_action: '' });
  const [momNotepadOpen, setMomNotepadOpen] = useState(false);

  const STEPS = ['Type', 'Source', 'Project', 'Details', 'Members', 'MOM', 'Review'];
  const srcList = sel.type === 'job'
    ? [{ id: 1, name: 'TechCorp Solutions', sub: 'Senior Dev', icon: 'building' }]
    : sel.type === 'freelancing'
    ? [{ id: 1, name: 'FreelanceHub', sub: 'Aakash Mehta', icon: 'briefcase' }, { id: 2, name: 'ClientCo', sub: 'Sunita Kapoor', icon: 'image' }]
    : [];
  const prjList = sel.type === 'job'
    ? [{ id: 1, name: 'Payroll System' }, { id: 2, name: 'Task Manager' }]
    : [{ id: 1, name: 'E-Commerce App' }, { id: 2, name: 'Website Redesign' }];

  const toggleMember = (id) => setMembers(m => m.includes(id) ? m.filter(x => x !== id) : [...m, id]);

  const inp = { display: 'flex', flexDirection: 'column', gap: 5 };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.slate };
  const iStyle = { padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' };

  return (
    <div>
      <MomNotepadModal
        open={momNotepadOpen}
        onClose={() => setMomNotepadOpen(false)}
        onParsed={parsed => setMom(prev => ({
          mom:         parsed.mom         || prev.mom,
          conclusion:  parsed.conclusion  || prev.conclusion,
          next_action: parsed.next_action || prev.next_action,
        }))}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Btn variant="outline" onClick={() => navigate('/meetings')} style={{ padding: '6px 12px', fontSize: 12 }}>← Back</Btn>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>Add Meeting</h1>
        {sel.type && <Badge label={sel.type === 'job' ? 'Job' : sel.type === 'freelancing' ? 'Freelance' : 'General'} color="navy" />}
      </div>

      <Card style={{ maxWidth: 860 }}>
        <WizardBar steps={STEPS} current={step} onStep={go} />

        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>What type of meeting?</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click a card to select and auto-advance</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[['building','Job Meeting','Related to your employment','job'],['briefcase','Freelancing','Client project meeting','freelancing'],['users','General','Team or internal','general'],['edit','Manual','No specific source','manual']].map(([ic, lb, sub, v]) => (
                <SelectCard key={v} icon={ic} label={lb} sub={sub} selected={sel.type === v}
                  onClick={() => { setSel({ type: v, source: null, project: null }); setTimeout(() => go(['general','manual'].includes(v) ? 3 : 1), 160); }} />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select source</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click to select and continue</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              {srcList.map(s => <SourceCard key={s.id} icon={s.icon} title={s.name} sub={s.sub} selected={sel.source === s.id} onClick={() => { setSel({ ...sel, source: s.id, project: null }); setTimeout(() => go(2), 160); }} />)}
            </div>
            <Btn variant="outline" onClick={() => go(0)}>← Back</Btn>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select project</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click to select and continue</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {prjList.map(pr => (
                <div key={pr.id} onClick={() => { setSel({ ...sel, project: pr.id }); setTimeout(() => go(3), 160); }}
                  style={{ border: `2px solid ${sel.project === pr.id ? T.gold : T.border}`, borderRadius: 10, padding: '14px 20px', cursor: 'pointer', background: sel.project === pr.id ? T.goldLight : T.white, display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = T.goldLight; }}
                  onMouseLeave={e => { if (sel.project !== pr.id) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.white; } }}>
                  <Icon name="folder" size={18} />
                  <div style={{ fontWeight: 600, color: T.navy, fontSize: 13 }}>{pr.name}</div>
                  <span style={{ fontSize: 11, color: T.gold, marginLeft: 'auto', fontWeight: 600 }}>→</span>
                </div>
              ))}
              <div onClick={() => go(3)} style={{ border: `2px dashed ${T.border}`, borderRadius: 10, padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: T.slateLight }}>
                <Icon name="x" size={18} /> No Project
              </div>
            </div>
            <Btn variant="outline" onClick={() => go(1)}>← Back</Btn>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 20 }}>Meeting details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1/-1', ...inp }}>
                <label style={lbl}>Meeting Title <span style={{ color: T.error }}>*</span></label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sprint Planning Q3" style={{ ...iStyle, width: '100%' }} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              {[['Date *','date','date'],['Start Time','time','start'],['End Time','time','end'],['Location','text','location'],['Meeting Link','url','link']].map(([lb, tp, key]) => (
                <div key={key} style={inp}>
                  <label style={lbl}>{lb}</label>
                  <input type={tp} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={key === 'link' ? 'https://meet.google.com/...' : ''} style={{ ...iStyle, width: '100%' }} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} />
                </div>
              ))}
              <div style={{ gridColumn: '1/-1', ...inp }}>
                <label style={lbl}>Agenda</label>
                <textarea value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })} rows={3} placeholder="Meeting agenda or discussion points..." style={{ ...iStyle, width: '100%', resize: 'vertical' }} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              <div style={inp}>
                <label style={lbl}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ ...iStyle, background: T.white, cursor: 'pointer' }}>
                  {[['scheduled','Scheduled'],['completed','Completed'],['cancelled','Cancelled']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <Btn variant="outline" onClick={() => go(['general','manual'].includes(sel.type) ? 0 : 2)}>← Back</Btn>
              <Btn variant="gold" onClick={() => form.title && go(4)}>Next →</Btn>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Add members <span style={{ fontSize: 12, color: T.slateLight, fontWeight: 400 }}>(optional)</span></h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 16 }}>Select attendees and assign roles</p>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {mockEmployees.map((e, i) => {
                const checked = members.includes(e.id);
                return (
                  <div key={e.id} onClick={() => toggleMember(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < mockEmployees.length - 1 ? `1px solid ${T.border}` : 'none', background: checked ? T.goldLight : T.white, cursor: 'pointer', transition: 'all .12s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? T.gold : T.border}`, background: checked ? T.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <Icon name="check" size={12} />}
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.navyTint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T.navy, flexShrink: 0 }}>
                      {e.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: T.slateLight }}>{e.designation} · {e.company}</div>
                    </div>
                    {checked && (
                      <select onClick={e => e.stopPropagation()} style={{ padding: '4px 8px', border: `1px solid ${T.gold}`, borderRadius: 6, fontSize: 11, background: T.goldLight, color: T.goldDark, outline: 'none', cursor: 'pointer' }}>
                        {[['attendee','Attendee'],['host','Host'],['client','Client'],['optional','Optional']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            {members.length > 0 && <div style={{ marginTop: 10, fontSize: 12, color: T.success, fontWeight: 500 }}><Icon name="check" size={13} /> {members.length} member{members.length > 1 ? 's' : ''} selected</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <Btn variant="outline" onClick={() => go(3)}>← Back</Btn>
              <Btn variant="gold" onClick={() => go(5)}>Next →</Btn>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>Minutes of Meeting</h2>
                <p style={{ fontSize: 12, color: T.slateLight, marginTop: 2 }}>Optional — can be filled after the meeting</p>
              </div>
              <Btn variant="gold" onClick={() => setMomNotepadOpen(true)} style={{ fontSize: 12, padding: '6px 14px' }}>
                <Icon name="note" size={14} /> Notepad Import
              </Btn>
            </div>

            {/* hint */}
            <div style={{ padding: '9px 14px', background: T.goldLight, borderRadius: 8, border: `1px solid #EDD590`, margin: '14px 0', fontSize: 12, color: T.goldDark, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="info" size={15} />
              <span>Click <strong>Notepad Import</strong> to paste raw notes — sections like <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,.06)', padding: '1px 5px', borderRadius: 3 }}>MOM:</code>, <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,.06)', padding: '1px 5px', borderRadius: 3 }}>Conclusion:</code>, <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,.06)', padding: '1px 5px', borderRadius: 3 }}>Action:</code> are auto-detected.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* MOM field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>MOM / Discussion Notes</label>
                  {mom.mom && <span style={{ fontSize: 11, color: T.success, fontWeight: 500 }}><Icon name="check" size={12} /> Filled</span>}
                </div>
                <textarea value={mom.mom} onChange={e => setMom({ ...mom, mom: e.target.value })} rows={5}
                  placeholder={'• Discussed sprint goals and velocity metrics\n• Login bug assigned to Rahul, deadline Friday\n• API design review scheduled for Thursday'}
                  style={{ ...iStyle, width: '100%', resize: 'vertical', background: mom.mom ? T.successBg : T.white }}
                  onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} />
              </div>

              {/* Conclusion field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>Conclusion</label>
                  {mom.conclusion && <span style={{ fontSize: 11, color: T.success, fontWeight: 500 }}><Icon name="check" size={12} /> Filled</span>}
                </div>
                <textarea value={mom.conclusion} onChange={e => setMom({ ...mom, conclusion: e.target.value })} rows={3}
                  placeholder="Key decisions made in this meeting..."
                  style={{ ...iStyle, width: '100%', resize: 'vertical', background: mom.conclusion ? T.successBg : T.white }}
                  onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} />
              </div>

              {/* Next Actions field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>Next Actions</label>
                  {mom.next_action && <span style={{ fontSize: 11, color: T.success, fontWeight: 500 }}><Icon name="check" size={12} /> Filled</span>}
                </div>
                <textarea value={mom.next_action} onChange={e => setMom({ ...mom, next_action: e.target.value })} rows={3}
                  placeholder={'• Rahul: fix login bug by Friday\n• Priya: update API documentation\n• Dev: create new mockups'}
                  style={{ ...iStyle, width: '100%', resize: 'vertical', background: mom.next_action ? T.successBg : T.white }}
                  onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <Btn variant="outline" onClick={() => go(4)}>← Back</Btn>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Btn variant="outline" onClick={() => setMomNotepadOpen(true)} style={{ fontSize: 12 }}><Icon name="note" size={14} /> Notepad Import</Btn>
                <Btn variant="gold" onClick={() => go(6)}>Next →</Btn>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 16 }}>Review & Save</h2>
            <div style={{ background: T.cream, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
              {[['Title', form.title || '—'], ['Date', form.date || '—'], ['Time', form.start ? `${form.start}–${form.end}` : '—'], ['Location', form.location || '—'], ['Members', `${members.length} selected`], ['Status', form.status]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span style={{ color: T.slateLight, fontWeight: 500 }}>{k}</span>
                  <span style={{ color: T.navy, fontWeight: 600, textTransform: 'capitalize' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: T.successBg, border: '1px solid #B7DFD0', marginBottom: 20, fontSize: 13, color: T.success }}>
              <Icon name="check" size={15} /> Meeting ready to save
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Btn variant="outline" onClick={() => go(5)}>← Back</Btn>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="outline" onClick={() => navigate('/meetings')}>Cancel</Btn>
                <Btn variant="gold" onClick={() => navigate('/meetings')}><Icon name="check" size={14} /> Save Meeting</Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADD LEAVE WIZARD  /leave/new?step=0-4
══════════════════════════════════════════════════════════ */
export function AddLeave() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const step = parseInt(sp.get('step') || '0');
  const go = (n) => setSp({ step: n });

  const [sel, setSel] = useState({ company: null, type: null });
  const [form, setForm] = useState({ date: '', title: '', reason: '', paid: true, deduction: '' });
  const [sendEmail, setSendEmail] = useState(false);

  const STEPS = ['Company', 'Leave Type', 'Details', 'Email', 'Review'];
  const COMPANIES = [{ id: 1, name: 'TechCorp Solutions', icon: 'building', joining: '2024-02-10', status: 'active' }];
  const LEAVE_TYPES = [
    ['full_day','clock','Full Day','Entire working day'],
    ['half_day','clock','Half Day','Morning or afternoon'],
    ['paid_leave','check','Paid Leave','With salary'],
    ['sick_leave','alert','Sick Leave','Medical absence'],
    ['unpaid_leave','wallet','Unpaid Leave','Without salary'],
    ['week_off','home','Week Off','Regular weekly off'],
    ['holiday','calendar','Holiday','Public / festival'],
  ];

  const inp = { display: 'flex', flexDirection: 'column', gap: 5 };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.slate };
  const iStyle = { padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Btn variant="outline" onClick={() => navigate('/leave')} style={{ padding: '6px 12px', fontSize: 12 }}>← Back</Btn>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>Add Leave / Holiday</h1>
      </div>
      <Card style={{ maxWidth: 760 }}>
        <WizardBar steps={STEPS} current={step} onStep={go} />

        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select company</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click to select and continue</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {COMPANIES.map(c => (
                <div key={c.id} onClick={() => { setSel({ ...sel, company: c.id }); setTimeout(() => go(1), 160); }}
                  style={{ border: `2px solid ${sel.company === c.id ? T.gold : T.border}`, borderRadius: 12, padding: '18px 24px', cursor: 'pointer', background: sel.company === c.id ? T.goldLight : T.white, display: 'flex', alignItems: 'center', gap: 16, minWidth: 260, transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = T.goldLight; }}
                  onMouseLeave={e => { if (sel.company !== c.id) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.white; } }}>
                  <span style={{ fontSize: 30 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: T.navy, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: T.slateLight }}>Joined {c.joining}</div>
                    <div style={{ marginTop: 4 }}><StatusBadge status={c.status} /></div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: T.gold, fontWeight: 600 }}>Select →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select leave type</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click to select and continue</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {LEAVE_TYPES.map(([v, ic, lb, sub]) => (
                <div key={v} onClick={() => { setSel({ ...sel, type: v }); setTimeout(() => go(2), 160); }}
                  style={{ border: `2px solid ${sel.type === v ? T.gold : T.border}`, borderRadius: 10, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', background: sel.type === v ? T.goldLight : T.white, transition: 'all .15s', position: 'relative' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = T.goldLight; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { if (sel.type !== v) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.white; e.currentTarget.style.transform = ''; } }}>
                  {sel.type === v && <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: T.gold, color: T.white, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}><Icon name="check" size={11} /></div>}
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{ic}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: sel.type === v ? T.goldDark : T.navy }}>{lb}</div>
                  <div style={{ fontSize: 10, color: T.slateLight, marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}><Btn variant="outline" onClick={() => go(0)}>← Back</Btn></div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 20 }}>Leave details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={inp}><label style={lbl}>Date <span style={{ color: T.error }}>*</span></label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
              <div style={inp}><label style={lbl}>Title <span style={{ color: T.error }}>*</span></label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Festival Holiday" style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
              <div style={{ ...inp, gridColumn: '1/-1' }}><label style={lbl}>Reason</label><textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={3} placeholder="Reason for leave..." style={{ ...iStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
              <div style={{ ...inp, gridColumn: '1/-1' }}>
                <label style={lbl}>Paid Leave?</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  {[[true,'Yes — Paid'],[ false,'No — Unpaid']].map(([v, l]) => (
                    <div key={String(v)} onClick={() => setForm({ ...form, paid: v })} style={{ flex: 1, padding: '10px 16px', border: `2px solid ${form.paid === v ? T.gold : T.border}`, borderRadius: 8, cursor: 'pointer', background: form.paid === v ? T.goldLight : T.white, textAlign: 'center', fontSize: 13, fontWeight: 500, color: form.paid === v ? T.goldDark : T.slate, transition: 'all .12s' }}>{l}</div>
                  ))}
                </div>
              </div>
              {!form.paid && (
                <div style={inp}><label style={lbl}>Deduction Amount (₹)</label><input type="number" value={form.deduction} onChange={e => setForm({ ...form, deduction: e.target.value })} placeholder="e.g. 833" style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <Btn variant="outline" onClick={() => go(1)}>← Back</Btn>
              <Btn variant="gold" onClick={() => form.date && form.title && go(3)}>Next →</Btn>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Send leave email? <span style={{ fontSize: 12, color: T.slateLight, fontWeight: 400 }}>(optional)</span></h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, marginTop: 16 }}>
              {[[true,'Yes, send email'],[false,'No, skip']].map(([v, l]) => (
                <div key={String(v)} onClick={() => setSendEmail(v)} style={{ flex: 1, padding: '14px 20px', border: `2px solid ${sendEmail === v ? T.gold : T.border}`, borderRadius: 10, cursor: 'pointer', background: sendEmail === v ? T.goldLight : T.white, textAlign: 'center', fontSize: 13, fontWeight: 600, color: sendEmail === v ? T.goldDark : T.slate, transition: 'all .12s' }}>{l}</div>
              ))}
            </div>
            {sendEmail && (
              <div style={{ background: T.cream, borderRadius: 10, padding: 16, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={inp}><label style={lbl}>To</label><input defaultValue="rahul.sharma@techcorp.com" style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
                <div style={inp}><label style={lbl}>Subject</label><input defaultValue={`Leave Request — ${form.date}`} style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
                <div style={inp}><label style={lbl}>Body</label><textarea rows={4} defaultValue={`Dear Sir/Ma'am,\n\nI would like to inform you about my leave on ${form.date}.\n\nReason: ${form.reason || '—'}\n\nThank you.`} style={{ ...iStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <Btn variant="outline" onClick={() => go(2)}>← Back</Btn>
              <Btn variant="gold" onClick={() => go(4)}>Next →</Btn>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 16 }}>Review & Save</h2>
            <div style={{ background: T.cream, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
              {[['Company','TechCorp Solutions'],['Leave Type', sel.type?.replace(/_/g,' ')?.replace(/\b\w/g,c=>c.toUpperCase()) || '—'],['Date',form.date||'—'],['Title',form.title||'—'],['Paid',form.paid?'Yes':'No'],['Deduction',form.deduction?`₹${form.deduction}`:'—'],['Send Email',sendEmail?'Yes':'No']].map(([k,v])=>(
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span style={{ color: T.slateLight, fontWeight: 500 }}>{k}</span>
                  <span style={{ color: T.navy, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: T.successBg, border: '1px solid #B7DFD0', marginBottom: 20, fontSize: 13, color: T.success }}><Icon name="check" size={15} /> Leave record ready to save</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Btn variant="outline" onClick={() => go(3)}>← Back</Btn>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="outline" onClick={() => navigate('/leave')}>Cancel</Btn>
                <Btn variant="gold" onClick={() => navigate('/leave')}><Icon name="check" size={14} /> Save Leave</Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ADD SALARY WIZARD  /salary/new?step=0-5
══════════════════════════════════════════════════════════ */
export function AddSalary() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const step = parseInt(sp.get('step') || '0');
  const go = (n) => setSp({ step: n });

  const [sel, setSel] = useState({ type: null, source: null, project: null });
  const [form, setForm] = useState({ month: '', expected: '', received: '', date: '', notes: '' });
  const pending = form.expected && form.received ? Math.max(0, Number(form.expected) - Number(form.received)) : 0;
  const pct = form.expected > 0 ? Math.min(100, Math.round((Number(form.received) / Number(form.expected)) * 100)) : 0;

  const STEPS = ['Type', 'Source', 'Project', 'Calculation', 'Payment', 'Review'];
  const iStyle = { padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' };
  const inp = { display: 'flex', flexDirection: 'column', gap: 5 };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.slate };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Btn variant="outline" onClick={() => navigate('/salary')} style={{ padding: '6px 12px', fontSize: 12 }}>← Back</Btn>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>Add Salary Record</h1>
        {sel.type && <Badge label={sel.type === 'job' ? 'Job Salary' : sel.type === 'freelancing' ? 'Freelance' : 'Manual'} color="navy" />}
      </div>
      <Card style={{ maxWidth: 760 }}>
        <WizardBar steps={STEPS} current={step} onStep={go} />

        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Payment type</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click to select and auto-advance</p>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['building','Job Salary','Monthly employment salary','job'],['briefcase','Freelance Payment','Project/client payment','freelancing'],['edit','Manual','One-off payment','manual']].map(([ic,lb,sub,v]) => (
                <SelectCard key={v} icon={ic} label={lb} sub={sub} selected={sel.type === v}
                  onClick={() => { setSel({ type: v, source: null, project: null }); setTimeout(() => go(v === 'manual' ? 3 : 1), 160); }} />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select {sel.type === 'job' ? 'company' : 'client / source'}</h2>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              {(sel.type === 'job' ? [{ id:1, name:'TechCorp Solutions', sub:'Senior Dev', icon:'building' }] : [{ id:1, name:'FreelanceHub', sub:'Aakash Mehta', icon:'briefcase' },{ id:2, name:'ClientCo', sub:'Sunita Kapoor', icon:'image' }]).map(s => (
                <SourceCard key={s.id} icon={s.icon} title={s.name} sub={s.sub} selected={sel.source === s.id}
                  onClick={() => { setSel({ ...sel, source: s.id }); setTimeout(() => go(sel.type === 'job' ? 3 : 2), 160); }} />
              ))}
            </div>
            <Btn variant="outline" onClick={() => go(0)}>← Back</Btn>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select project</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              {[{ id:1, name:'E-Commerce App' },{ id:2, name:'Website Redesign' }].map(pr => (
                <div key={pr.id} onClick={() => { setSel({ ...sel, project: pr.id }); setTimeout(() => go(3), 160); }}
                  style={{ border: `2px solid ${sel.project === pr.id ? T.gold : T.border}`, borderRadius: 10, padding: '14px 20px', cursor: 'pointer', background: sel.project === pr.id ? T.goldLight : T.white, display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = T.goldLight; }}
                  onMouseLeave={e => { if (sel.project !== pr.id) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.white; } }}>
                  <Icon name="folder" size={18} />
                  <div style={{ fontWeight: 600, color: T.navy, fontSize: 13 }}>{pr.name}</div>
                  <span style={{ fontSize: 11, color: T.gold, marginLeft: 'auto', fontWeight: 600 }}>→</span>
                </div>
              ))}
            </div>
            <Btn variant="outline" onClick={() => go(1)}>← Back</Btn>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 20 }}>Salary / Payment details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={inp}><label style={lbl}>Salary Month <span style={{ color: T.error }}>*</span></label><input type="month" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
              <div style={inp}><label style={lbl}>Expected Amount (₹) <span style={{ color: T.error }}>*</span></label><input type="number" value={form.expected} onChange={e => setForm({ ...form, expected: e.target.value })} placeholder="e.g. 25000" style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
            </div>
            {sel.type === 'job' && form.expected && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: T.navyTint, borderRadius: 8, border: `1px solid #C7D5ED` }}>
                <div style={{ fontSize: 12, color: T.slateLight, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="clipboard" size={13} /> Auto-calculated based on salary cycle (1st – 30th Jun 2025)</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>Full month · 30 days · ₹{Number(form.expected).toLocaleString()} expected</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <Btn variant="outline" onClick={() => go(sel.type === 'manual' ? 0 : sel.type === 'job' ? 1 : 2)}>← Back</Btn>
              <Btn variant="gold" onClick={() => form.expected && go(4)}>Next →</Btn>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 20 }}>Payment received</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={inp}><label style={lbl}>Received Amount (₹)</label><input type="number" value={form.received} onChange={e => setForm({ ...form, received: e.target.value })} placeholder="e.g. 25000" style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
              <div style={inp}><label style={lbl}>Received On</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
              <div style={{ gridColumn: '1/-1', ...inp }}><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any notes about this payment..." style={{ ...iStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} /></div>
            </div>

            {/* Live calculation widget */}
            {form.expected && (
              <div style={{ marginTop: 20, borderRadius: 10, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                <div style={{ background: T.navy, padding: '10px 16px', fontSize: 12, fontWeight: 600, color: T.white, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="info" size={14} /> Live Payment Calculator</div>
                <div style={{ padding: '16px', background: T.cream }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                    {[['Expected', `₹${Number(form.expected).toLocaleString()}`, T.navy], ['Received', `₹${Number(form.received || 0).toLocaleString()}`, T.success], ['Pending', `₹${pending.toLocaleString()}`, pending > 0 ? T.warning : T.success]].map(([l,v,c]) => (
                      <div key={l} style={{ background: T.white, borderRadius: 8, padding: '12px', textAlign: 'center', border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 11, color: T.slateLight, marginBottom: 4, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{l}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 8, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? T.success : pct > 50 ? T.warning : T.error, borderRadius: 4, transition: 'width .3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: T.slateLight }}>
                    <span>{pct}% received</span>
                    <span style={{ color: pending > 0 ? T.warning : T.success, fontWeight: 600 }}>{pending > 0 ? `₹${pending.toLocaleString()} still pending` : 'Fully received'}</span>
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <Btn variant="outline" onClick={() => go(3)}>← Back</Btn>
              <Btn variant="gold" onClick={() => go(5)}>Review →</Btn>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 16 }}>Review & Save</h2>
            <div style={{ background: T.cream, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
              {[['Type', sel.type || '—'], ['Source', 'TechCorp Solutions'], ['Month', form.month || '—'], ['Expected', form.expected ? `₹${Number(form.expected).toLocaleString()}` : '—'], ['Received', form.received ? `₹${Number(form.received).toLocaleString()}` : '₹0'], ['Pending', `₹${pending.toLocaleString()}`], ['Received On', form.date || '—']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span style={{ color: T.slateLight, fontWeight: 500 }}>{k}</span>
                  <span style={{ color: k === 'Pending' && pending > 0 ? T.warning : T.navy, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: T.successBg, border: '1px solid #B7DFD0', marginBottom: 20, fontSize: 13, color: T.success }}><Icon name="check" size={15} /> Salary record ready to save</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Btn variant="outline" onClick={() => go(4)}>← Back</Btn>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="outline" onClick={() => navigate('/salary')}>Cancel</Btn>
                <Btn variant="gold" onClick={() => navigate('/salary')}><Icon name="check" size={14} /> Save Record</Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SEND EMAIL WIZARD  /emails/new?step=0-4
══════════════════════════════════════════════════════════ */
export function SendEmail() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const step = parseInt(sp.get('step') || '0');
  const go = (n) => setSp({ step: n });

  const [sel, setSel] = useState({ type: null, template: null });
  const [recipients, setRecipients] = useState([]);
  const [form, setForm] = useState({ subject: '', body: '' });

  const STEPS = ['Email Type', 'Recipients', 'Template', 'Compose', 'Send'];
  const EMAIL_TYPES = [
    ['leave','leave','Leave Request','Inform about absence'],
    ['work_update','clipboard','Work Update','Project progress update'],
    ['mom','calendar','MOM','Meeting minutes'],
    ['salary','wallet','Salary Follow-up','Payment reminder'],
    ['custom','edit','Custom','Write from scratch'],
  ];
  const TEMPLATES = {
    leave: { subject: 'Leave Request — {{date}}', body: 'Dear {{name}},\n\nI would like to inform you about my leave on {{date}}.\n\nReason: {{reason}}\n\nThank you for your understanding.' },
    work_update: { subject: 'Project Update — {{project}}', body: 'Hi {{name}},\n\nHere is the latest update on {{project}}:\n\n{{update}}\n\nBest regards' },
    mom: { subject: 'MOM — {{meeting_title}}', body: 'Dear Team,\n\nPlease find below the minutes of our meeting:\n\n{{mom}}\n\nConclusion: {{conclusion}}' },
    salary: { subject: 'Salary Follow-up — {{month}} Pending', body: 'Hi,\n\nThis is a follow-up regarding the pending salary of ₹{{amount}} for {{month}}.\n\nKindly process the payment at the earliest.' },
  };

  const toggleRecipient = (id) => setRecipients(r => r.includes(id) ? r.filter(x => x !== id) : [...r, id]);
  const iStyle = { padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Btn variant="outline" onClick={() => navigate('/emails')} style={{ padding: '6px 12px', fontSize: 12 }}>← Back</Btn>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>Send Email</h1>
      </div>
      <Card style={{ maxWidth: 860 }}>
        <WizardBar steps={STEPS} current={step} onStep={go} />

        {step === 0 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select email type</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 20 }}>Click to select and auto-advance</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {EMAIL_TYPES.map(([v, ic, lb, sub]) => (
                <SelectCard key={v} icon={ic} label={lb} sub={sub} selected={sel.type === v}
                  onClick={() => {
                    setSel({ type: v, template: null });
                    if (TEMPLATES[v]) setForm({ subject: TEMPLATES[v].subject, body: TEMPLATES[v].body });
                    setTimeout(() => go(1), 160);
                  }} />
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select recipients</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 16 }}>Choose who receives this email</p>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              {mockEmployees.map((e, i) => {
                const checked = recipients.includes(e.id);
                return (
                  <div key={e.id} onClick={() => toggleRecipient(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < mockEmployees.length - 1 ? `1px solid ${T.border}` : 'none', background: checked ? T.goldLight : T.white, cursor: 'pointer', transition: 'all .12s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${checked ? T.gold : T.border}`, background: checked ? T.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <Icon name="check" size={12} />}
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.navyTint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.navy, flexShrink: 0 }}>
                      {e.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: T.slateLight }}>{e.email}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {recipients.length > 0 && <div style={{ fontSize: 12, color: T.success, marginBottom: 14, fontWeight: 500 }}><Icon name="check" size={13} /> {recipients.length} recipient{recipients.length > 1 ? 's' : ''} selected</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Btn variant="outline" onClick={() => go(0)}>← Back</Btn>
              <Btn variant="gold" onClick={() => recipients.length > 0 && go(2)}>Next →</Btn>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 4 }}>Select template</h2>
            <p style={{ fontSize: 12, color: T.slateLight, marginBottom: 16 }}>Preview and select a template</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[['default', 'Default Template', TEMPLATES[sel.type]], ['custom', 'Write Custom', null]].filter(([, , t]) => t !== undefined).map(([v, lb, tpl]) => (
                <div key={v} onClick={() => { setSel({ ...sel, template: v }); if (tpl) setForm({ subject: tpl.subject, body: tpl.body }); else setForm({ subject: '', body: '' }); setTimeout(() => go(3), 160); }}
                  style={{ border: `2px solid ${sel.template === v ? T.gold : T.border}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', background: sel.template === v ? T.goldLight : T.white, transition: 'all .12s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = T.goldLight; }}
                  onMouseLeave={e => { if (sel.template !== v) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.white; } }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.navy, marginBottom: 4 }}>{lb}</div>
                  {tpl && <div style={{ fontSize: 11, color: T.slateLight, fontFamily: 'monospace' }}>Subject: {tpl.subject}</div>}
                </div>
              ))}
            </div>
            <Btn variant="outline" onClick={() => go(1)}>← Back</Btn>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 20 }}>Compose email</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>Subject</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} style={iStyle} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>Body</label>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11, color: T.slateLight }}>
                    {['{{name}}','{{date}}','{{project}}','{{amount}}'].map(p => (
                      <button key={p} onClick={() => setForm({ ...form, body: form.body + p })} style={{ padding: '2px 8px', border: `1px solid ${T.border}`, borderRadius: 4, cursor: 'pointer', background: T.cream, fontSize: 11, color: T.navy, fontFamily: 'monospace' }}>{p}</button>
                    ))}
                  </div>
                </div>
                <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={8} style={{ ...iStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} onFocus={e => e.target.style.borderColor = T.gold} onBlur={e => e.target.style.borderColor = T.border} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <Btn variant="outline" onClick={() => go(2)}>← Back</Btn>
              <Btn variant="gold" onClick={() => go(4)}>Preview →</Btn>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 16 }}>Preview & Send</h2>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ background: T.navy, padding: '12px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.white }}>{form.subject || '(No subject)'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>
                  To: {mockEmployees.filter(e => recipients.includes(e.id)).map(e => e.email).join(', ') || '—'}
                </div>
              </div>
              <div style={{ padding: '16px 20px', background: T.cream, fontSize: 13, color: T.slate, lineHeight: 1.8, fontFamily: 'inherit', whiteSpace: 'pre-wrap', minHeight: 120 }}>
                {form.body || '(No body)'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: T.successBg, borderRadius: 8, border: `1px solid #B7DFD0`, marginBottom: 20, fontSize: 12, color: T.success }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.success }} />
              Email template variables ready
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Btn variant="outline" onClick={() => go(3)}>← Edit</Btn>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="outline" onClick={() => navigate('/emails')}>Save Draft</Btn>
                <Btn variant="gold" onClick={() => navigate('/emails')}><Icon name="mail" size={14} /> Send Now</Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
