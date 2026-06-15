import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { T } from '../theme';
import { mockTasks, mockEmployees } from '../data/mockData';
import { PageHeader, FilterChips, TableWrapper, Th, Td, Btn, Badge, StatusBadge, PriorityBadge, TypeBadge, Card, SectionTitle, Breadcrumb, EmptyState } from '../components/UI';

/* ── TASK LIST ── */
export function TaskList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const filters = [
    ['all','All'], ['job','Job'], ['freelancing','Freelance'], ['manual','Manual'],
    ['in_progress','In Progress'], ['todo','To Do'], ['completed','Completed'],
  ];
  const filtered = filter === 'all' ? mockTasks : mockTasks.filter(t => t.type === filter || t.status === filter);

  return (
    <div>
      <PageHeader
        title="Tasks"
        sub={`${mockTasks.length} total tasks`}
        action={<Btn variant="gold" onClick={() => navigate('/tasks/new')}>＋ Add Task</Btn>}
      />
      <FilterChips options={filters} active={filter} onChange={setFilter} />
      {filtered.length === 0 ? (
        <EmptyState icon="✅" title="No tasks found" sub="Try a different filter or add a new task" action={<Btn variant="gold" onClick={() => navigate('/tasks/new')}>＋ Add Task</Btn>} />
      ) : (
        <TableWrapper>
          <thead>
            <tr>
              <Th>Task Name</Th><Th>Source / Project</Th><Th>Assigned</Th>
              <Th>Date</Th><Th>Time</Th><Th>Priority</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id}
                onMouseEnter={e => e.currentTarget.style.background = T.rowAlt}
                onMouseLeave={e => e.currentTarget.style.background = ''}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/tasks/${t.id}`)}>
                <Td alt={i % 2 === 1}>
                  <div style={{ fontWeight: 500, color: T.navy, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{t.name}</div>
                  <TypeBadge type={t.type} />
                </Td>
                <Td alt={i % 2 === 1}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: T.navy }}>{t.source}</div>
                  <div style={{ fontSize: 11, color: T.slateLight }}>{t.project}</div>
                </Td>
                <Td alt={i % 2 === 1}>{t.assigned}</Td>
                <Td alt={i % 2 === 1}>{t.date}</Td>
                <Td alt={i % 2 === 1}><span style={{ fontSize: 12 }}>{t.start}–{t.end}</span></Td>
                <Td alt={i % 2 === 1}><PriorityBadge priority={t.priority} /></Td>
                <Td alt={i % 2 === 1}><StatusBadge status={t.status} /></Td>
                <Td alt={i % 2 === 1}>
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <Btn variant="outline" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => navigate(`/tasks/${t.id}`)}>View</Btn>
                    <Btn variant="outline" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => navigate(`/tasks/${t.id}/edit`)}>Edit</Btn>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </div>
  );
}

/* ── TASK DETAIL ── */
export function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const task = mockTasks.find(t => t.id === Number(id));

  if (!task) return <div style={{ padding: 40, textAlign: 'center', color: T.slateLight }}>Task not found. <Btn variant="outline" onClick={() => navigate('/tasks')}>← Back</Btn></div>;

  const priorityColors = { urgent: T.error, high: T.warning, normal: T.info, low: T.slateLight };

  return (
    <div>
      <Breadcrumb items={['Dashboard', 'Tasks', task.name]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 8 }}>{task.name}</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <TypeBadge type={task.type} />
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="outline" onClick={() => navigate('/tasks')}>← Back</Btn>
          <Btn variant="outline" onClick={() => navigate(`/tasks/${id}/edit`)}>✏️ Edit</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* Main details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionTitle>Task Details</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {[
                ['Source',      task.source],
                ['Project',     task.project],
                ['Assigned By', task.assigned],
                ['Date',        task.date],
                ['Start Time',  task.start],
                ['End Time',    task.end],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: '12px 0', borderBottom: `1px solid ${T.border}`, paddingRight: 20 }}>
                  <div style={{ fontSize: 11, color: T.slateLight, marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontSize: 13, color: T.navy, fontWeight: 500 }}>{value || '—'}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Priority & Status</SectionTitle>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1, padding: 16, borderRadius: 8, background: T.cream, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: T.slateLight, marginBottom: 6, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Priority</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: priorityColors[task.priority], textTransform: 'capitalize' }}>{task.priority}</div>
              </div>
              <div style={{ flex: 1, padding: 16, borderRadius: 8, background: T.cream, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: T.slateLight, marginBottom: 6, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Status</div>
                <StatusBadge status={task.status} size="lg" />
              </div>
            </div>
          </Card>
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: '16px 20px' }}>
            <SectionTitle>Team Members</SectionTitle>
            {mockEmployees.slice(0, 2).map(e => (
              <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.navyTint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.navy }}>
                  {e.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: T.navy }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: T.slateLight }}>{e.designation}</div>
                </div>
              </div>
            ))}
            <Btn variant="outline" style={{ width: '100%', marginTop: 10, fontSize: 12, justifyContent: 'center' }}>＋ Add Member</Btn>
          </Card>

          <Card style={{ padding: '16px 20px' }}>
            <SectionTitle>Email Log</SectionTitle>
            <div style={{ fontSize: 12, color: T.slateLight, padding: '12px 0', textAlign: 'center' }}>No emails for this task</div>
            <Btn variant="outline" style={{ width: '100%', fontSize: 12, justifyContent: 'center' }}>Send Email</Btn>
          </Card>

          <Card style={{ padding: '16px 20px' }}>
            <SectionTitle>Attachments</SectionTitle>
            <div style={{ fontSize: 12, color: T.slateLight, padding: '12px 0', textAlign: 'center' }}>No attachments</div>
            <Btn variant="outline" style={{ width: '100%', fontSize: 12, justifyContent: 'center' }}>📎 Upload File</Btn>
          </Card>
        </div>
      </div>
    </div>
  );
}
