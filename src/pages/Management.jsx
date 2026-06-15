import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { T } from '../theme';
import { mockJobs, mockSources, mockProjects, mockEmployees } from '../data/mockData';
import {
  PageHeader, Card, SectionTitle, Btn, Badge, StatusBadge,
  TableWrapper, Th, Td, Input, Select, Textarea, Breadcrumb, EmptyState, Modal
} from '../components/UI';

/* ═══ JOBS ═══ */
export function Jobs() {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company:'', title:'', designation:'', salary:'', joining:'', status:'active' });

  return (
    <div>
      <PageHeader title="Jobs" sub="Manage your employment records"
        action={<Btn variant="gold" onClick={() => setShowAdd(true)}>＋ Add Job</Btn>} />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Job" subtitle="Step 1 of 5 — Company Info" width={600}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label="Company Name" required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="e.g. TechCorp Solutions" />
          <Input label="Job Title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Developer" />
          <Input label="Designation" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Senior Developer" />
          <Input label="Current Salary (₹/month)" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="e.g. 25000" />
          <Input label="Joining Date" required type="date" value={form.joining} onChange={e => setForm({ ...form, joining: e.target.value })} />
          <Select label="Status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
            options={[['active','Active'],['probation','Probation'],['resigned','Resigned']]} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setShowAdd(false)}>Cancel</Btn>
          <Btn variant="gold" onClick={() => { navigate('/management/jobs/new'); setShowAdd(false); }}>Continue Setup →</Btn>
        </div>
      </Modal>

      {mockJobs.map(j => (
        <Card key={j.id} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 10, background: T.navyTint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏢</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.navy }}>{j.company}</div>
                <div style={{ fontSize: 13, color: T.slateLight, marginBottom: 6 }}>{j.title} · {j.designation}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={j.status} />
                  <span style={{ fontSize: 12, color: T.slateLight }}>Joined {j.joining}</span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: T.navy }}>
                ₹{j.salary.toLocaleString()}<span style={{ fontSize: 13, color: T.slateLight, fontWeight: 400 }}>/mo</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Btn variant="outline" style={{ fontSize: 11, padding: '5px 10px' }}>Edit</Btn>
                <Btn variant="outline" style={{ fontSize: 11, padding: '5px 10px' }}>Salary History</Btn>
                <Btn variant="outline" style={{ fontSize: 11, padding: '5px 10px' }}>Designations</Btn>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            {[
              ['Salary Cycle', `${j.cycle_start}st – ${j.cycle_end === 31 ? 'Month End' : j.cycle_end + 'th'}`],
              ['Received Day', `${j.received_day}th of next month`],
              ['Probation End', j.probation_end || '—'],
              ['Reporting To', j.reporting],
            ].map(([k, v]) => (
              <div key={k} style={{ background: T.cream, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: T.slateLight, marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Salary timeline preview */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <SectionTitle style={{ marginBottom: 10 }}>Recent Salary Records</SectionTitle>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
              {[
                { month: 'Jun 2025', expected: 25000, received: 25000, status: 'received' },
                { month: 'May 2025', expected: 25000, received: 20000, status: 'partial' },
                { month: 'Apr 2025', expected: 25000, received: 25000, status: 'received' },
              ].map(s => (
                <div key={s.month} style={{ background: T.cream, borderRadius: 8, padding: '10px 14px', minWidth: 130, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, color: T.slateLight, marginBottom: 4 }}>{s.month}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>₹{s.received.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: T.slateLight }}>of ₹{s.expected.toLocaleString()}</div>
                  <div style={{ marginTop: 6 }}><StatusBadge status={s.status} /></div>
                </div>
              ))}
              <div onClick={() => navigate('/salary')} style={{ background: T.white, borderRadius: 8, padding: '10px 14px', minWidth: 100, border: `1px dashed ${T.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: T.gold, fontWeight: 600 }}>
                View all →
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ═══ FREELANCING SOURCES ═══ */
export function Sources() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', client: '', platform: '', email: '' });

  return (
    <div>
      <PageHeader title="Freelancing Sources / Clients" sub="Manage your freelance work sources"
        action={<Btn variant="gold" onClick={() => setShowAdd(true)}>＋ Add Source</Btn>} />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Freelancing Source" width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Source / Client Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. FreelanceHub" />
          <Input label="Primary Contact" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="e.g. Aakash Mehta" />
          <Select label="Platform" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}
            options={[['direct','Direct Client'],['upwork','Upwork'],['fiverr','Fiverr'],['toptal','Toptal'],['other','Other']]} />
          <Input label="Contact Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="client@example.com" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <Btn variant="outline" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="gold" onClick={() => setShowAdd(false)}>＋ Add Source</Btn>
          </div>
        </div>
      </Modal>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {mockSources.map(s => (
          <Card key={s.id}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: T.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💼</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.navy }}>{s.name}</div>
                <div style={{ fontSize: 12, color: T.slateLight }}>Contact: {s.client} · {s.platform}</div>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.slateLight, marginBottom: 6 }}>Projects ({s.projects})</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {mockProjects.filter(p => p.source === s.name).map(p => (
                  <div key={p.id} style={{ padding: '4px 10px', background: T.navyTint, borderRadius: 6, fontSize: 12, color: T.navy, fontWeight: 500 }}>{p.name}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="outline" style={{ fontSize: 11, padding: '5px 10px' }}>Edit</Btn>
              <Btn variant="outline" style={{ fontSize: 11, padding: '5px 10px' }}>View Projects</Btn>
              <Btn variant="gold" style={{ fontSize: 11, padding: '5px 10px' }}>＋ Add Project</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══ PROJECTS ═══ */
export function Projects() {
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const filters = [['all','All'],['job','Job'],['freelancing','Freelancing'],['active','Active']];
  const filtered = filter === 'all' ? mockProjects : mockProjects.filter(p => p.sourceType === filter || p.status === filter);

  return (
    <div>
      <PageHeader title="Projects" sub={`${mockProjects.length} total projects`}
        action={<Btn variant="gold" onClick={() => setShowAdd(true)}>＋ Add Project</Btn>} />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Project" width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Project Name" required placeholder="e.g. Payroll System" />
          <Select label="Source Type" options={[['job','Job'],['freelancing','Freelancing']]} />
          <Select label="Source" options={[['TechCorp Solutions','TechCorp Solutions'],['FreelanceHub','FreelanceHub'],['ClientCo Direct','ClientCo Direct']]} />
          <Input label="Start Date" type="date" />
          <Input label="Budget (₹)" placeholder="e.g. 50000 (0 for job projects)" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <Btn variant="outline" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn variant="gold" onClick={() => setShowAdd(false)}>＋ Add Project</Btn>
          </div>
        </div>
      </Modal>

      <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
        {filters.map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${filter === v ? T.gold : T.border}`, background: filter === v ? T.goldLight : T.white, color: filter === v ? T.goldDark : T.slateLight, transition: 'all .12s' }}>{l}</button>
        ))}
      </div>

      <TableWrapper>
        <thead><tr><Th>Project Name</Th><Th>Source</Th><Th>Type</Th><Th>Start Date</Th><Th>Budget</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
        <tbody>{filtered.map((p, i) => (
          <tr key={p.id} onMouseEnter={e => e.currentTarget.style.background = T.rowAlt} onMouseLeave={e => e.currentTarget.style.background = ''}>
            <Td alt={i % 2 === 1}><div style={{ fontWeight: 500, color: T.navy, fontSize: 13 }}>{p.name}</div></Td>
            <Td alt={i % 2 === 1}>{p.source}</Td>
            <Td alt={i % 2 === 1}><Badge label={p.sourceType === 'job' ? 'Job' : 'Freelance'} color={p.sourceType === 'job' ? 'navy' : 'info'} /></Td>
            <Td alt={i % 2 === 1}>{p.start}</Td>
            <Td alt={i % 2 === 1}>{p.budget > 0 ? `₹${p.budget.toLocaleString()}` : '—'}</Td>
            <Td alt={i % 2 === 1}><StatusBadge status={p.status} /></Td>
            <Td alt={i % 2 === 1}>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="outline" style={{ padding: '4px 8px', fontSize: 11 }}>Edit</Btn>
                <Btn variant="outline" style={{ padding: '4px 8px', fontSize: 11 }}>Tasks</Btn>
              </div>
            </Td>
          </tr>
        ))}</tbody>
      </TableWrapper>
    </div>
  );
}

/* ═══ EMPLOYEES ═══ */
export function Employees() {
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'employee', designation: '', company: '', email: '', phone: '' });
  const TYPE_COLORS = { senior: 'navy', employee: 'info', client: 'warning', freelancer: 'success', self: 'gold' };
  const filters = [['all','All'],['senior','Senior'],['employee','Employee'],['client','Client'],['freelancer','Freelancer']];
  const filtered = filter === 'all' ? mockEmployees : mockEmployees.filter(e => e.type === filter);

  return (
    <div>
      <PageHeader title="Employees / Members" sub="People in your work network"
        action={<Btn variant="gold" onClick={() => setShowAdd(true)}>＋ Add Member</Btn>} />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Team Member" width={520}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label="Full Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Sharma" />
          <Select label="Type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
            options={[['senior','Senior / Manager'],['employee','Employee'],['client','Client'],['freelancer','Freelancer'],['self','Self']]} />
          <Input label="Designation" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Tech Lead" />
          <Input label="Company" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="e.g. TechCorp" />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" />
          <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <Btn variant="outline" onClick={() => setShowAdd(false)}>Cancel</Btn>
          <Btn variant="gold" onClick={() => setShowAdd(false)}>＋ Add Member</Btn>
        </div>
      </Modal>

      <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
        {filters.map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${filter === v ? T.gold : T.border}`, background: filter === v ? T.goldLight : T.white, color: filter === v ? T.goldDark : T.slateLight }}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {filtered.map(e => (
          <Card key={e.id} style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: T.navyTint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: T.navy, flexShrink: 0 }}>
                {e.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.navy }}>{e.name}</div>
                <div style={{ fontSize: 12, color: T.slateLight }}>{e.designation}</div>
              </div>
              <Badge label={e.type.charAt(0).toUpperCase() + e.type.slice(1)} color={TYPE_COLORS[e.type] || 'slate'} />
            </div>
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, fontSize: 12, color: T.slateLight, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>🏢 {e.company}</div>
              <div>✉️ {e.email}</div>
              <div>📞 {e.phone}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn variant="outline" style={{ fontSize: 11, padding: '4px 9px' }}>Edit</Btn>
              <Btn variant="outline" style={{ fontSize: 11, padding: '4px 9px' }}>View Tasks</Btn>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══ SETTINGS ═══ */
export function Settings() {
  const [tab, setTab] = useState('profile');
  const TABS = [
    ['profile', '👤 Profile'],
    ['templates', '📋 Email Templates'],
    ['password', '🔐 Password'],
    ['prefs', '⚙️ Preferences'],
  ];

  return (
    <div>
      <PageHeader title="Settings" sub="Account & application configuration" />
      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 20 }}>
        {/* Tab list */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: 8, height: 'fit-content' }}>
          {TABS.map(([id, label]) => (
            <div key={id} onClick={() => setTab(id)} style={{
              padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              fontWeight: tab === id ? 600 : 400, color: tab === id ? T.gold : T.slate,
              background: tab === id ? T.goldLight : 'transparent',
              borderLeft: `3px solid ${tab === id ? T.gold : 'transparent'}`,
              transition: 'all .15s', marginBottom: 2,
            }}>{label}</div>
          ))}
        </div>

        {/* Tab content */}
        <Card>
          {tab === 'profile' && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 20 }}>Profile Information</h2>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: T.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: T.white }}>AK</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: T.navy }}>Arjun Kumar</div>
                  <div style={{ fontSize: 12, color: T.slateLight }}>arjun@example.com</div>
                </div>
                <Btn variant="outline" style={{ marginLeft: 'auto', fontSize: 12 }}>Change Photo</Btn>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Input label="Full Name" defaultValue="Arjun Kumar" />
                <Input label="Email" type="email" defaultValue="arjun@example.com" />
                <Input label="Phone" defaultValue="+91 98765 43210" />
                <Select label="Timezone" options={[['Asia/Kolkata','Asia/Kolkata (IST)'],['UTC','UTC'],['America/New_York','America/New_York (EST)']]} />
              </div>
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <Btn variant="gold">Save Changes</Btn>
              </div>
            </div>
          )}

          {tab === 'templates' && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 16 }}>Email Templates</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Leave Request', 'Subject: Leave Request — {{date}}', 'leave'],
                  ['Work Update', 'Subject: Project Update — {{project}}', 'work_update'],
                  ['MOM', 'Subject: MOM — {{meeting_title}}', 'mom'],
                  ['Salary Follow-up', 'Subject: Salary Follow-up — {{month}} Pending', 'salary'],
                ].map(([name, preview, type]) => (
                  <div key={type} style={{ padding: '14px 16px', border: `1px solid ${T.border}`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.navy }}>{name}</div>
                      <div style={{ fontSize: 11, color: T.slateLight, marginTop: 2, fontFamily: 'monospace' }}>{preview}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn variant="outline" style={{ fontSize: 11, padding: '4px 9px' }}>Preview</Btn>
                      <Btn variant="outline" style={{ fontSize: 11, padding: '4px 9px' }}>Edit</Btn>
                    </div>
                  </div>
                ))}
                <Btn variant="gold" style={{ width: 'fit-content', fontSize: 12 }}>＋ Add Template</Btn>
              </div>
            </div>
          )}

          {tab === 'password' && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 20 }}>Change Password</h2>
              <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input label="Current Password" type="password" placeholder="••••••••" />
                <Input label="New Password" type="password" placeholder="••••••••" />
                <Input label="Confirm New Password" type="password" placeholder="••••••••" />
                <div style={{ padding: '10px 14px', background: T.infoBg, borderRadius: 8, border: `1px solid #BFDBFE`, fontSize: 12, color: T.info }}>
                  💡 Password must be at least 8 characters with a number and a special character
                </div>
                <Btn variant="gold" style={{ width: 'fit-content' }}>Update Password</Btn>
              </div>
            </div>
          )}

          {tab === 'prefs' && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 20 }}>Display Preferences</h2>
              {[
                ['Default task view',    'List',          [['list','List'],['board','Board'],['calendar','Calendar']]],
                ['Date format',          'DD/MM/YYYY',    [['DD/MM/YYYY','DD/MM/YYYY'],['MM/DD/YYYY','MM/DD/YYYY'],['YYYY-MM-DD','YYYY-MM-DD']]],
                ['Currency symbol',      'INR (₹)',       [['inr','INR (₹)'],['usd','USD ($)'],['eur','EUR (€)']]],
                ['Items per page',       '20',            [['10','10'],['20','20'],['50','50'],['100','100']]],
                ['Salary calculation',   'Pro-rata',      [['prorata','Pro-rata'],['fixed','Fixed monthly']]],
              ].map(([label, def, opts]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13 }}>
                  <span style={{ color: T.slate }}>{label}</span>
                  <select defaultValue={opts[0][0]} style={{ padding: '6px 10px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, background: T.white, color: T.navy, outline: 'none', cursor: 'pointer' }}>
                    {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <Btn variant="gold">Save Preferences</Btn>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
