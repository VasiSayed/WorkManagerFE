import { useNavigate } from 'react-router-dom';
import { T } from '../theme';
import { mockTasks, mockMeetings, mockSalary } from '../data/mockData';
import { StatCard, Card, SectionTitle, Btn, StatusBadge, PageHeader } from '../components/UI';
import { Icon } from '../components/Icons';

export default function Dashboard() {
  const navigate = useNavigate();
  const today = mockTasks.filter(t => t.date === '2025-06-11');
  const upcoming = mockMeetings.filter(m => m.status === 'scheduled');
  const pending = mockSalary.filter(s => s.pending > 0).reduce((a, b) => a + b.pending, 0);

  const quickActions = [
    ['tasks', 'Add Task',     '/tasks/new'],
    ['calendar', 'Add Meeting', '/meetings/new'],
    ['leave', 'Add Leave',   '/leave/new'],
    ['wallet', 'Add Salary',  '/salary/new'],
    ['mail', 'Send Email',  '/emails/new'],
    ['chart', 'Reports',     '/reports'],
  ];

  return (
    <div>
      <PageHeader title="Good morning, Arjun" sub="Here's your work summary for today" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard icon="tasks" label="Tasks Today"       value={today.length}               sub="2 in progress"       color={T.navy} />
        <StatCard icon="calendar" label="Upcoming Meetings"  value={upcoming.length}            sub="Next: 10:00 AM"      color={T.info} />
        <StatCard icon="wallet" label="Pending Salary"     value={`₹${pending.toLocaleString()}`} sub="Across 2 sources" color={T.warning} />
        <StatCard icon="leave" label="Leave Used"         value="3"                          sub="This month"          color={T.success} />
      </div>

      {/* Quick Actions */}
      <SectionTitle style={{ marginBottom: 12 }}>Quick Actions</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 28 }}>
        {quickActions.map(([ic, lb, path]) => (
          <div key={path} onClick={() => navigate(path)} style={{
            background: T.navy, borderRadius: 10, padding: '14px 8px', textAlign: 'center',
            cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.navyLight; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.navy; e.currentTarget.style.transform = ''; }}
          >
            <Icon name={ic} size={20} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>{lb}</span>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Today's Tasks */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionTitle style={{ margin: 0 }}>Today's Tasks</SectionTitle>
            <Btn variant="ghost" onClick={() => navigate('/tasks')} style={{ fontSize: 12, padding: '4px 10px', color: T.gold }}>View all →</Btn>
          </div>
          {today.length ? today.map((t, i) => (
            <div key={t.id} style={{ padding: '10px 0', borderBottom: i < today.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}
              onClick={() => navigate(`/tasks/${t.id}`)}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.priority === 'urgent' ? T.error : t.priority === 'high' ? T.warning : T.info, flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                <div style={{ fontSize: 11, color: T.slateLight }}>{t.start}–{t.end} · {t.source}</div>
              </div>
              <StatusBadge status={t.status} />
            </div>
          )) : <div style={{ padding: '20px 0', textAlign: 'center', color: T.slateLight, fontSize: 13 }}>No tasks today</div>}
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: '16px 20px' }}>
            <SectionTitle>Upcoming Meetings</SectionTitle>
            {upcoming.map((m, i) => (
              <div key={m.id} style={{ padding: '10px 0', borderBottom: i < upcoming.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}
                onClick={() => navigate(`/meetings/${m.id}`)}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: T.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="calendar" size={17} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: T.slateLight }}>{m.date} · {m.time} · {m.members} members</div>
                </div>
              </div>
            ))}
          </Card>
          <Card style={{ padding: '16px 20px' }}>
            <SectionTitle>Pending Salaries</SectionTitle>
            {mockSalary.filter(s => s.pending > 0).map((s, i, arr) => (
              <div key={s.id} style={{ padding: '10px 0', borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => navigate(`/salary/${s.id}`)}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.navy }}>{s.source}</div>
                  <div style={{ fontSize: 11, color: T.slateLight }}>{s.month}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.warning }}>₹{s.pending.toLocaleString()}</div>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
