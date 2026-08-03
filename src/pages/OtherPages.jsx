import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { T } from '../theme';
import { mockMeetings, mockLeave, mockSalary, mockEmails } from '../data/mockData';
import { PageHeader, FilterChips, TableWrapper, Th, Td, Btn, Badge, StatusBadge, TypeBadge, Card, SectionTitle, StatCard, Breadcrumb, EmptyState, Input, Textarea, Select, MomNotepadModal } from '../components/UI';
import { Icon } from '../components/Icons';

/* ═══ MEETINGS ═══ */
export function MeetingList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const filters = [['all','All'],['job','Job'],['freelancing','Freelance'],['scheduled','Scheduled'],['completed','Completed']];
  const filtered = filter === 'all' ? mockMeetings : mockMeetings.filter(m => m.type === filter || m.status === filter);

  return (
    <div>
      <PageHeader title="Meetings / MOM" sub="Schedule and record meeting minutes"
        action={<Btn variant="gold" onClick={() => navigate('/meetings/new')}>＋ Add Meeting</Btn>} />
      <FilterChips options={filters} active={filter} onChange={setFilter} />
      <TableWrapper>
        <thead><tr><Th>Title</Th><Th>Source</Th><Th>Type</Th><Th>Date & Time</Th><Th>Members</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
        <tbody>{filtered.map((m, i) => (
          <tr key={m.id} style={{ cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = T.rowAlt}
            onMouseLeave={e => e.currentTarget.style.background = ''}
            onClick={() => navigate(`/meetings/${m.id}`)}>
            <Td alt={i%2===1}><div style={{fontWeight:500,color:T.navy,fontSize:13}}>{m.title}</div><div style={{fontSize:11,color:T.slateLight}}>{m.project}</div></Td>
            <Td alt={i%2===1}>{m.source}</Td>
            <Td alt={i%2===1}><TypeBadge type={m.type}/></Td>
            <Td alt={i%2===1}><div style={{fontSize:12}}>{m.date}</div><div style={{fontSize:11,color:T.slateLight}}>{m.time}</div></Td>
            <Td alt={i%2===1}>{m.members} members</Td>
            <Td alt={i%2===1}><StatusBadge status={m.status}/></Td>
            <Td alt={i%2===1}><div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
              <Btn variant="outline" style={{padding:'4px 8px',fontSize:11}} onClick={()=>navigate(`/meetings/${m.id}`)}>View</Btn>
              <Btn variant="outline" style={{padding:'4px 8px',fontSize:11,color:T.info,borderColor:T.info}} onClick={()=>navigate(`/meetings/${m.id}/mom`)}>MOM</Btn>
            </div></Td>
          </tr>
        ))}</tbody>
      </TableWrapper>
    </div>
  );
}

export function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meeting = mockMeetings.find(m => m.id === Number(id));
  if (!meeting) return <EmptyState icon="calendar" title="Meeting not found" action={<Btn variant="outline" onClick={() => navigate('/meetings')}>← Back</Btn>} />;

  return (
    <div>
      <Breadcrumb items={['Dashboard', 'Meetings', meeting.title]} />
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:T.navy,marginBottom:8}}>{meeting.title}</h1>
          <div style={{display:'flex',gap:8}}><TypeBadge type={meeting.type}/><StatusBadge status={meeting.status}/></div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Btn variant="outline" onClick={() => navigate('/meetings')}>← Back</Btn>
          <Btn variant="outline" onClick={() => navigate(`/meetings/${id}/mom`)}><Icon name="edit" size={14} /> Fill MOM</Btn>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <Card>
          <SectionTitle>Meeting Details</SectionTitle>
          {[['Source',meeting.source],['Project',meeting.project],['Date',meeting.date],['Time',meeting.time],['Members',`${meeting.members} attendees`]].map(([l,v])=>(
            <div key={l} style={{padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontSize:11,color:T.slateLight,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:3}}>{l}</div>
              <div style={{fontSize:13,color:T.navy,fontWeight:500}}>{v}</div>
            </div>
          ))}
        </Card>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <Card>
            <SectionTitle>Agenda</SectionTitle>
            <p style={{fontSize:13,color:T.slate,lineHeight:1.6}}>{meeting.agenda || 'No agenda set'}</p>
          </Card>
          <Card>
            <SectionTitle>Minutes of Meeting (MOM)</SectionTitle>
            {meeting.mom ? <p style={{fontSize:13,color:T.slate,lineHeight:1.6}}>{meeting.mom}</p> : (
              <div style={{textAlign:'center',padding:'16px 0'}}>
                <div style={{fontSize:12,color:T.slateLight,marginBottom:12}}>MOM not yet recorded</div>
                <Btn variant="gold" onClick={() => navigate(`/meetings/${id}/mom`)}>Fill MOM Now</Btn>
              </div>
            )}
          </Card>
          {meeting.conclusion && <Card><SectionTitle>Conclusion</SectionTitle><p style={{fontSize:13,color:T.slate,lineHeight:1.6}}>{meeting.conclusion}</p></Card>}
        </div>
      </div>
    </div>
  );
}

export function MeetingMOM() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meeting = mockMeetings.find(m => m.id === Number(id));
  const [form, setForm] = useState({ mom: meeting?.mom || '', conclusion: meeting?.conclusion || '', next_action: '' });
  const [notepadOpen, setNotepadOpen] = useState(false);
  if (!meeting) return null;

  const iStyle = { padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', resize: 'vertical' };

  return (
    <div>
      <MomNotepadModal
        open={notepadOpen}
        onClose={() => setNotepadOpen(false)}
        onParsed={parsed => setForm(prev => ({
          mom:        parsed.mom        || prev.mom,
          conclusion: parsed.conclusion || prev.conclusion,
          next_action:parsed.next_action|| prev.next_action,
        }))}
      />

      <Breadcrumb items={['Meetings', meeting.title, 'MOM']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: T.navy }}>Minutes of Meeting</h1>
          <p style={{ fontSize: 12, color: T.slateLight, marginTop: 3 }}>Fill in discussion notes, conclusion, and next actions</p>
        </div>
        <Btn variant="outline" onClick={() => navigate(`/meetings/${id}`)}>← Back</Btn>
      </div>

      <Card style={{ maxWidth: 760 }}>
        {/* Meeting context strip */}
        <div style={{ padding: '12px 16px', background: T.navyTint, borderRadius: 8, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ color: T.navy, fontSize: 13 }}>{meeting.title}</strong>
            <span style={{ color: T.slateLight, fontSize: 12 }}> · {meeting.date} {meeting.time} · {meeting.source}</span>
          </div>
          <Btn variant="gold" onClick={() => setNotepadOpen(true)} style={{ fontSize: 12, padding: '6px 14px' }}>
            <Icon name="note" size={14} /> Notepad Import
          </Btn>
        </div>

        {/* Notepad hint */}
        <div style={{ padding: '9px 14px', background: T.goldLight, borderRadius: 8, border: `1px solid #EDD590`, marginBottom: 20, fontSize: 12, color: T.goldDark, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="info" size={16} />
          <span>Use <strong>Notepad Import</strong> to paste your raw meeting notes — MOM, Conclusion, and Actions are auto-detected and filled in below.</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* MOM */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>
                Minutes of Meeting <span style={{ color: T.error }}>*</span>
              </label>
              <span style={{ fontSize: 11, color: T.slateLight }}>What was discussed</span>
            </div>
            <textarea
              value={form.mom}
              onChange={e => setForm({ ...form, mom: e.target.value })}
              rows={6}
              placeholder="• Discussed sprint goals and velocity metrics&#10;• Reviewed PR #47 — login bug fix by Rahul&#10;• API design review scheduled for Thursday&#10;• Client feedback on Phase 1 was positive"
              style={iStyle}
              onFocus={e => e.target.style.borderColor = T.gold}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>

          {/* Conclusion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>Conclusion</label>
              <span style={{ fontSize: 11, color: T.slateLight }}>Key decisions made</span>
            </div>
            <textarea
              value={form.conclusion}
              onChange={e => setForm({ ...form, conclusion: e.target.value })}
              rows={3}
              placeholder="Phase 2 approved. Team capacity confirmed for next sprint."
              style={iStyle}
              onFocus={e => e.target.style.borderColor = T.gold}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>

          {/* Next Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>Next Actions</label>
              <span style={{ fontSize: 11, color: T.slateLight }}>Follow-up tasks & owners</span>
            </div>
            <textarea
              value={form.next_action}
              onChange={e => setForm({ ...form, next_action: e.target.value })}
              rows={3}
              placeholder="• Rahul: fix login bug by Friday&#10;• Priya: update API documentation&#10;• Dev: create new mockups for client review"
              style={iStyle}
              onFocus={e => e.target.style.borderColor = T.gold}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>

          {/* Filled indicator */}
          {(form.mom || form.conclusion || form.next_action) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {form.mom        && <span style={{ padding: '3px 10px', background: T.successBg, border: `1px solid #B7DFD0`, borderRadius: 20, fontSize: 11, color: T.success, fontWeight: 500 }}><Icon name="check" size={12} /> MOM filled</span>}
              {form.conclusion && <span style={{ padding: '3px 10px', background: T.successBg, border: `1px solid #B7DFD0`, borderRadius: 20, fontSize: 11, color: T.success, fontWeight: 500 }}><Icon name="check" size={12} /> Conclusion filled</span>}
              {form.next_action && <span style={{ padding: '3px 10px', background: T.successBg, border: `1px solid #B7DFD0`, borderRadius: 20, fontSize: 11, color: T.success, fontWeight: 500 }}><Icon name="check" size={12} /> Actions filled</span>}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            <Btn variant="outline" onClick={() => setNotepadOpen(true)} style={{ fontSize: 12 }}><Icon name="note" size={14} /> Notepad Import</Btn>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="outline" onClick={() => navigate(`/meetings/${id}`)}>Cancel</Btn>
              <Btn variant="gold" onClick={() => navigate('/meetings')}><Icon name="check" size={14} /> Save MOM</Btn>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═══ LEAVE ═══ */
const LEAVE_TYPE_MAP = { week_off:'Week Off', paid_leave:'Paid Leave', sick_leave:'Sick Leave', half_day:'Half Day', full_day:'Full Day', leave:'Leave', unpaid_leave:'Unpaid Leave' };

export function LeaveList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const filters = [['all','All'],['paid_leave','Paid Leave'],['sick_leave','Sick Leave'],['week_off','Week Off'],['half_day','Half Day']];
  const filtered = filter === 'all' ? mockLeave : mockLeave.filter(l => l.type === filter);
  const totalDeduction = mockLeave.reduce((a,b)=>a+b.deduction,0);

  return (
    <div>
      <PageHeader title="Leave / Holiday / Half Day" sub="Manage your leave and absence records"
        action={<Btn variant="gold" onClick={() => navigate('/leave/new')}>＋ Add Leave</Btn>} />
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        <StatCard icon="leave" label="Total Leaves"   value="3"                                      sub="This month"   color={T.success}/>
        <StatCard icon="home" label="Week Offs"       value="4"                                      sub="This month"   color={T.info}/>
        <StatCard icon="wallet" label="Total Deduction" value={`₹${totalDeduction.toLocaleString()}`} sub="May + Jun"     color={T.warning}/>
        <StatCard icon="check" label="Paid Leaves"     value="2"                                      sub="Approved"     color={T.navy}/>
      </div>
      <FilterChips options={filters} active={filter} onChange={setFilter} />
      <TableWrapper>
        <thead><tr><Th>Company</Th><Th>Date</Th><Th>Type</Th><Th>Title</Th><Th>Paid</Th><Th>Deduction</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
        <tbody>{filtered.map((l,i)=>(
          <tr key={l.id} style={{cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.background=T.rowAlt}
            onMouseLeave={e=>e.currentTarget.style.background=''}
            onClick={()=>navigate(`/leave/${l.id}`)}>
            <Td alt={i%2===1}>{l.company}</Td>
            <Td alt={i%2===1}>{l.date}</Td>
            <Td alt={i%2===1}><Badge label={LEAVE_TYPE_MAP[l.type]||l.type} color={l.type==='sick_leave'?'error':l.type==='half_day'?'warning':'navy'}/></Td>
            <Td alt={i%2===1}>{l.title}</Td>
            <Td alt={i%2===1}><span style={{color:l.paid?T.success:T.error,fontWeight:600}}>{l.paid?'Yes':'No'}</span></Td>
            <Td alt={i%2===1}>{l.deduction?`₹${l.deduction}`:'—'}</Td>
            <Td alt={i%2===1}><StatusBadge status={l.status}/></Td>
            <Td alt={i%2===1}><Btn variant="outline" style={{padding:'4px 8px',fontSize:11}} onClick={e=>{e.stopPropagation();navigate(`/leave/${l.id}`)}}>Edit</Btn></Td>
          </tr>
        ))}</tbody>
      </TableWrapper>
    </div>
  );
}

export function LeaveDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const leave = mockLeave.find(l => l.id === Number(id));
  if (!leave) return <EmptyState icon="leave" title="Leave not found" action={<Btn variant="outline" onClick={() => navigate('/leave')}>← Back</Btn>} />;
  return (
    <div>
      <Breadcrumb items={['Dashboard','Leave',leave.title]}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:T.navy,marginBottom:8}}>{leave.title}</h1>
          <div style={{display:'flex',gap:8}}><Badge label={LEAVE_TYPE_MAP[leave.type]||leave.type} color="navy"/><StatusBadge status={leave.status}/></div>
        </div>
        <Btn variant="outline" onClick={()=>navigate('/leave')}>← Back</Btn>
      </div>
      <Card style={{maxWidth:560}}>
        {[['Company',leave.company],['Date',leave.date],['Type',LEAVE_TYPE_MAP[leave.type]||leave.type],['Paid',leave.paid?'Yes — No deduction':'No'],['Deduction',leave.deduction?`₹${leave.deduction}`:'—'],['Reason',leave.reason||'—']].map(([l,v])=>(
          <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:12,color:T.slateLight,fontWeight:600}}>{l}</span>
            <span style={{fontSize:13,color:T.navy,fontWeight:500}}>{v}</span>
          </div>
        ))}
        <div style={{display:'flex',gap:10,marginTop:20}}><Btn variant="gold">Edit</Btn><Btn variant="outline" onClick={()=>navigate('/leave')}>← Back</Btn></div>
      </Card>
    </div>
  );
}

/* ═══ SALARY ═══ */
export function SalaryList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const filters = [['all','All'],['job','Job'],['freelancing','Freelance'],['received','Received'],['partial','Partial'],['pending','Pending']];
  const filtered = filter === 'all' ? mockSalary : mockSalary.filter(s => s.type === filter || s.status === filter);
  const exp = mockSalary.reduce((a,b)=>a+b.expected,0);
  const rec = mockSalary.reduce((a,b)=>a+b.received,0);
  const pen = mockSalary.reduce((a,b)=>a+b.pending,0);

  return (
    <div>
      <PageHeader title="Salary / Payments" sub="Track expected, received, and pending amounts"
        action={<Btn variant="gold" onClick={()=>navigate('/salary/new')}>＋ Add Salary Record</Btn>}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        <StatCard icon="clipboard" label="Total Expected" value={`₹${exp.toLocaleString()}`} sub="All sources"  color={T.navy}/>
        <StatCard icon="check" label="Total Received"  value={`₹${rec.toLocaleString()}`} sub="All sources"  color={T.success}/>
        <StatCard icon="⏳" label="Total Pending"   value={`₹${pen.toLocaleString()}`} sub="Outstanding" color={T.warning}/>
      </div>
      <FilterChips options={filters} active={filter} onChange={setFilter}/>
      <TableWrapper>
        <thead><tr><Th>Source</Th><Th>Month</Th><Th>Expected</Th><Th>Received</Th><Th>Pending</Th><Th>Status</Th><Th>Date</Th><Th>Actions</Th></tr></thead>
        <tbody>{filtered.map((s,i)=>(
          <tr key={s.id} style={{cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.background=T.rowAlt}
            onMouseLeave={e=>e.currentTarget.style.background=''}
            onClick={()=>navigate(`/salary/${s.id}`)}>
            <Td alt={i%2===1}><div style={{fontWeight:500,color:T.navy,fontSize:13}}>{s.source}</div></Td>
            <Td alt={i%2===1}>{s.month}</Td>
            <Td alt={i%2===1}><span style={{fontWeight:600}}>₹{s.expected.toLocaleString()}</span></Td>
            <Td alt={i%2===1}><span style={{color:T.success,fontWeight:600}}>₹{s.received.toLocaleString()}</span></Td>
            <Td alt={i%2===1}><span style={{color:s.pending>0?T.warning:T.success,fontWeight:600}}>₹{s.pending.toLocaleString()}</span></Td>
            <Td alt={i%2===1}><StatusBadge status={s.status}/></Td>
            <Td alt={i%2===1}>{s.date}</Td>
            <Td alt={i%2===1}><div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
              <Btn variant="outline" style={{padding:'4px 8px',fontSize:11}} onClick={()=>navigate(`/salary/${s.id}`)}>View</Btn>
              <Btn variant="outline" style={{padding:'4px 8px',fontSize:11}}>Edit</Btn>
            </div></Td>
          </tr>
        ))}</tbody>
      </TableWrapper>
    </div>
  );
}

export function SalaryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sal = mockSalary.find(s => s.id === Number(id));
  if (!sal) return <EmptyState icon="wallet" title="Record not found" action={<Btn variant="outline" onClick={()=>navigate('/salary')}>← Back</Btn>}/>;
  const pct = sal.expected > 0 ? Math.round((sal.received/sal.expected)*100) : 0;

  return (
    <div>
      <Breadcrumb items={['Dashboard','Salary',sal.source]}/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:T.navy,marginBottom:8}}>{sal.source} — {sal.month}</h1>
          <StatusBadge status={sal.status}/>
        </div>
        <Btn variant="outline" onClick={()=>navigate('/salary')}>← Back</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <Card>
          <SectionTitle>Payment Summary</SectionTitle>
          {[['Expected',`₹${sal.expected.toLocaleString()}`],['Received',`₹${sal.received.toLocaleString()}`],['Pending',`₹${sal.pending.toLocaleString()}`],['Received On',sal.date],['Notes',sal.notes||'—']].map(([l,v],i)=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:12,color:T.slateLight,fontWeight:600}}>{l}</span>
              <span style={{fontSize:13,color:l==='Pending'&&sal.pending>0?T.warning:l==='Received'?T.success:T.navy,fontWeight:600}}>{v}</span>
            </div>
          ))}
        </Card>
        <Card>
          <SectionTitle>Payment Progress</SectionTitle>
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:12,color:T.slateLight}}>Received</span>
              <span style={{fontSize:12,fontWeight:600,color:T.navy}}>{pct}%</span>
            </div>
            <div style={{height:10,background:T.border,borderRadius:5,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:pct===100?T.success:pct>50?T.warning:T.error,borderRadius:5,transition:'width .3s'}}/>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            {[['Expected',`₹${sal.expected.toLocaleString()}`,T.navy],['Received',`₹${sal.received.toLocaleString()}`,T.success],['Pending',`₹${sal.pending.toLocaleString()}`,T.warning]].map(([l,v,c])=>(
              <div key={l} style={{background:T.cream,borderRadius:8,padding:'12px 10px',textAlign:'center'}}>
                <div style={{fontSize:10,color:T.slateLight,marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>{l}</div>
                <div style={{fontSize:15,fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ═══ EMAILS ═══ */
export function EmailList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(mockEmails[0]);
  const filters = [['all','All'],['sent','Sent'],['failed','Failed'],['Leave','Leave'],['MOM','MOM']];
  const filtered = filter === 'all' ? mockEmails : mockEmails.filter(e => e.status === filter || e.type === filter);

  return (
    <div>
      <PageHeader title="Emails" sub="Email communication log"
        action={<Btn variant="gold" onClick={()=>navigate('/emails/new')}>＋ Send Email</Btn>}/>
      <FilterChips options={filters} active={filter} onChange={setFilter}/>
      <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:16,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
        {/* List */}
        <div style={{borderRight:`1px solid ${T.border}`}}>
          {filtered.map((e,i)=>(
            <div key={e.id} onClick={()=>setSelected(e)} style={{padding:'14px 16px',borderBottom:`1px solid ${T.border}`,cursor:'pointer',background:selected?.id===e.id?T.goldLight:T.white,transition:'background .1s'}}
              onMouseEnter={ev=>{if(selected?.id!==e.id)ev.currentTarget.style.background=T.rowAlt}}
              onMouseLeave={ev=>{if(selected?.id!==e.id)ev.currentTarget.style.background=T.white}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontSize:13,fontWeight:500,color:T.navy,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{e.subject}</div>
                <StatusBadge status={e.status}/>
              </div>
              <div style={{fontSize:11,color:T.slateLight}}>{e.to}</div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                <Badge label={e.type} color="info" size="sm"/>
                <span style={{fontSize:10,color:T.slateLight}}>{e.date}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Preview */}
        <div style={{padding:'20px 24px',background:T.white}}>
          {selected ? (
            <div>
              <h2 style={{fontSize:16,fontWeight:700,color:T.navy,marginBottom:8}}>{selected.subject}</h2>
              <div style={{display:'flex',gap:8,marginBottom:16}}>
                <StatusBadge status={selected.status}/><Badge label={selected.type} color="info"/>
              </div>
              <div style={{fontSize:12,color:T.slateLight,marginBottom:16}}>
                <strong>To:</strong> {selected.to}<br/>
                <strong>Sent:</strong> {selected.date}
              </div>
              <div style={{background:T.cream,borderRadius:8,padding:'16px 20px',fontSize:13,color:T.slate,lineHeight:1.8,borderLeft:`3px solid ${T.gold}`}}>
                {selected.body}
              </div>
              {selected.status === 'failed' && (
                <div style={{marginTop:16,padding:'10px 14px',background:T.errorBg,borderRadius:8,border:`1px solid #FECACA`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:12,color:T.error}}>Email delivery failed</span>
                  <Btn variant="danger" style={{fontSize:11,padding:'5px 12px'}}>Retry Send</Btn>
                </div>
              )}
            </div>
          ) : <div style={{padding:40,textAlign:'center',color:T.slateLight}}>Select an email to preview</div>}
        </div>
      </div>
    </div>
  );
}

/* ═══ REPORTS ═══ */
export function Reports() {
  const navigate = useNavigate();
  const cats = [
    ['clipboard','Task Reports','Daily, project-wise, job-wise','/reports/tasks'],
    ['calendar','Meeting / MOM','MOM reports & attendance','/reports/meetings'],
    ['wallet','Salary Reports','Expected vs received, pro-rata','/reports/salary'],
    ['leave','Leave Reports','Leave & holiday analysis','/reports/leave'],
    ['mail','Email Reports','Sent/failed email logs','/reports/emails'],
    ['users','Employee Activity','Member involvement overview','/reports/employees'],
    ['trend','Designation History','Changes per job','/reports/designations'],
    ['clock','Salary Changes','Hike history','/reports/salary-changes'],
  ];
  return (
    <div>
      <PageHeader title="Reports" sub="Generate and export your work reports"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
        {cats.map(([ic,title,sub,path])=>(
          <div key={path} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:'20px',cursor:'pointer',transition:'all .15s'}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold;e.currentTarget.style.transform='translateY(-2px)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.transform='';}}>
            <div style={{marginBottom:12}}><Icon name={ic} size={30} /></div>
            <div style={{fontSize:13,fontWeight:600,color:T.navy,marginBottom:4}}>{title}</div>
            <div style={{fontSize:12,color:T.slateLight,marginBottom:16}}>{sub}</div>
            <div style={{display:'flex',gap:6}}>
              <Btn variant="outline" style={{fontSize:10,padding:'4px 8px'}}>View</Btn>
              <Btn variant="outline" style={{fontSize:10,padding:'4px 8px'}}>CSV</Btn>
              <Btn variant="outline" style={{fontSize:10,padding:'4px 8px'}}>PDF</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
