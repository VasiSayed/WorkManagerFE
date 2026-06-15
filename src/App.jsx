import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { T } from './theme';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/Auth';
import {
  AddLeavePage,
  AddMeetingPage,
  AddSalaryPage,
  AddTaskPage,
  DashboardPage,
  EmailDetailPage,
  EmailListPage,
  LeaveDetailPage,
  LeaveListPage,
  ManagementPage,
  MeetingDetailPage,
  MeetingListPage,
  MeetingMOMPage,
  ProtectedRoute,
  ReportsPage,
  SalaryDetailPage,
  SalaryListPage,
  SendEmailPage,
  SettingsPage,
  TaskDetailPage,
  TaskListPage,
} from './pages/IntegratedPages';

const ProtectedLayout = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: ${T.cream}; color: ${T.slate}; font-size: 14px; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        input, textarea, select, button { font-family: inherit; }
        a { text-decoration: none; color: inherit; }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @media (max-width: 900px) { body { font-size: 13px; } }
      `}</style>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
        <Route path="/tasks" element={<ProtectedLayout><TaskListPage /></ProtectedLayout>} />
        <Route path="/tasks/new" element={<ProtectedLayout><AddTaskPage /></ProtectedLayout>} />
        <Route path="/tasks/:id" element={<ProtectedLayout><TaskDetailPage /></ProtectedLayout>} />
        <Route path="/tasks/:id/edit" element={<ProtectedLayout><TaskDetailPage /></ProtectedLayout>} />

        <Route path="/meetings" element={<ProtectedLayout><MeetingListPage /></ProtectedLayout>} />
        <Route path="/meetings/new" element={<ProtectedLayout><AddMeetingPage /></ProtectedLayout>} />
        <Route path="/meetings/:id" element={<ProtectedLayout><MeetingDetailPage /></ProtectedLayout>} />
        <Route path="/meetings/:id/mom" element={<ProtectedLayout><MeetingMOMPage /></ProtectedLayout>} />

        <Route path="/leave" element={<ProtectedLayout><LeaveListPage /></ProtectedLayout>} />
        <Route path="/leave/new" element={<ProtectedLayout><AddLeavePage /></ProtectedLayout>} />
        <Route path="/leave/:id" element={<ProtectedLayout><LeaveDetailPage /></ProtectedLayout>} />

        <Route path="/salary" element={<ProtectedLayout><SalaryListPage /></ProtectedLayout>} />
        <Route path="/salary/new" element={<ProtectedLayout><AddSalaryPage /></ProtectedLayout>} />
        <Route path="/salary/:id" element={<ProtectedLayout><SalaryDetailPage /></ProtectedLayout>} />

        <Route path="/emails" element={<ProtectedLayout><EmailListPage /></ProtectedLayout>} />
        <Route path="/emails/new" element={<ProtectedLayout><SendEmailPage /></ProtectedLayout>} />
        <Route path="/emails/:id" element={<ProtectedLayout><EmailDetailPage /></ProtectedLayout>} />

        <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
        <Route path="/reports/:category" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />

        <Route path="/management/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
        <Route path="/management/salary-rules" element={<Navigate to="/management/jobs" replace />} />
        <Route path="/management/:section" element={<ProtectedLayout><ManagementPage /></ProtectedLayout>} />
        <Route path="/management/jobs/new" element={<ProtectedLayout><ManagementPage /></ProtectedLayout>} />
        <Route path="/management/jobs/:id" element={<ProtectedLayout><ManagementPage /></ProtectedLayout>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
