import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { T } from './theme';
import { ChatPage, SocialPage, SocialProfilePage } from './pages/social/Social';
import ExpensePage, { ExpenseCategoriesPage, ExpenseContactsPage, ExpenseTagsPage } from './pages/Expenses';
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
  NoteDetailPage,
  NoteFormPage,
  NoteListPage,
  DocumentDetailPage,
  DocumentFormPage,
  DocumentListPage,
  ProtectedRoute,
  ReportsPage,
  SalaryDetailPage,
  SalaryListPage,
  SendEmailPage,
  SettingsPage,
  TaskDetailPage,
  TaskListPage,
} from './pages/IntegratedPages';
import ModuleHome from './pages/ModuleHome';
import RentalDashboard from './pages/rental/RentalDashboard';
import Collection from './pages/rental/Collection';
import { PropertiesPage, PropertyDetailPage } from './pages/rental/Properties';
import { TenantsPage, TenantDetailPage } from './pages/rental/Tenants';
import { AgreementsPage, AgreementFormPage, AgreementDetailPage } from './pages/rental/Agreements';
import { ElectricityPage, MeterDetailPage, BillDetailPage } from './pages/rental/Electricity';
import { RentalExpensesPage, RentalReportsPage } from './pages/rental/ExpensesReports';
import { ChargesPage } from './pages/rental/Charges';

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
        @media (max-width: 900px) {
          body { font-size: 13px; }
          .auth-shell { grid-template-columns: 1fr !important; }
          .auth-intro { padding: 32px 24px !important; min-height: 260px; }
          .auth-form-wrap { padding: 18px 12px 28px !important; align-items: flex-start !important; }
        }
        @media (max-width: 520px) {
          .auth-intro { padding: 28px 18px !important; min-height: 220px; }
          .auth-form-wrap > div { padding: 22px 16px !important; }
        }
      `}</style>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<ProtectedLayout><ModuleHome /></ProtectedLayout>} />
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

        <Route path="/notes" element={<ProtectedLayout><NoteListPage /></ProtectedLayout>} />
        <Route path="/notes/new" element={<ProtectedLayout><NoteFormPage /></ProtectedLayout>} />
        <Route path="/notes/:id" element={<ProtectedLayout><NoteDetailPage /></ProtectedLayout>} />
        <Route path="/notes/:id/edit" element={<ProtectedLayout><NoteFormPage /></ProtectedLayout>} />

        <Route path="/expenses" element={<ProtectedLayout><ExpensePage /></ProtectedLayout>} />
        <Route path="/expenses/categories" element={<ProtectedLayout><ExpenseCategoriesPage /></ProtectedLayout>} />
        <Route path="/expenses/contacts" element={<ProtectedLayout><ExpenseContactsPage /></ProtectedLayout>} />
        <Route path="/expenses/tags" element={<ProtectedLayout><ExpenseTagsPage /></ProtectedLayout>} />

        <Route path="/documents" element={<ProtectedLayout><DocumentListPage /></ProtectedLayout>} />
        <Route path="/documents/new" element={<ProtectedLayout><DocumentFormPage /></ProtectedLayout>} />
        <Route path="/documents/:id" element={<ProtectedLayout><DocumentDetailPage /></ProtectedLayout>} />
        <Route path="/documents/:id/edit" element={<ProtectedLayout><DocumentFormPage /></ProtectedLayout>} />

        <Route path="/leave" element={<ProtectedLayout><LeaveListPage /></ProtectedLayout>} />
        <Route path="/leave/new" element={<ProtectedLayout><AddLeavePage /></ProtectedLayout>} />
        <Route path="/leave/:id" element={<ProtectedLayout><LeaveDetailPage /></ProtectedLayout>} />

        <Route path="/salary" element={<ProtectedLayout><SalaryListPage /></ProtectedLayout>} />
        <Route path="/salary/new" element={<ProtectedLayout><AddSalaryPage /></ProtectedLayout>} />
        <Route path="/salary/:id" element={<ProtectedLayout><SalaryDetailPage /></ProtectedLayout>} />

        <Route path="/emails" element={<ProtectedLayout><EmailListPage /></ProtectedLayout>} />
        <Route path="/emails/new" element={<ProtectedLayout><SendEmailPage /></ProtectedLayout>} />
        <Route path="/emails/:id" element={<ProtectedLayout><EmailDetailPage /></ProtectedLayout>} />

        <Route path="/social" element={<ProtectedLayout><SocialPage /></ProtectedLayout>} />
        <Route path="/social/users/:id" element={<ProtectedLayout><SocialProfilePage /></ProtectedLayout>} />
        <Route path="/chat" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
        <Route path="/chat/:id" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />

        <Route path="/rental" element={<ProtectedLayout><RentalDashboard /></ProtectedLayout>} />
        <Route path="/rental/collection" element={<ProtectedLayout><Collection /></ProtectedLayout>} />
        <Route path="/rental/properties" element={<ProtectedLayout><PropertiesPage /></ProtectedLayout>} />
        <Route path="/rental/properties/:id" element={<ProtectedLayout><PropertyDetailPage /></ProtectedLayout>} />
        <Route path="/rental/tenants" element={<ProtectedLayout><TenantsPage /></ProtectedLayout>} />
        <Route path="/rental/tenants/:id" element={<ProtectedLayout><TenantDetailPage /></ProtectedLayout>} />
        <Route path="/rental/agreements" element={<ProtectedLayout><AgreementsPage /></ProtectedLayout>} />
        <Route path="/rental/agreements/new" element={<ProtectedLayout><AgreementFormPage /></ProtectedLayout>} />
        <Route path="/rental/agreements/:id" element={<ProtectedLayout><AgreementDetailPage /></ProtectedLayout>} />
        <Route path="/rental/electricity" element={<ProtectedLayout><ElectricityPage /></ProtectedLayout>} />
        <Route path="/rental/electricity/meters/:id" element={<ProtectedLayout><MeterDetailPage /></ProtectedLayout>} />
        <Route path="/rental/electricity/bills/:id" element={<ProtectedLayout><BillDetailPage /></ProtectedLayout>} />
        <Route path="/rental/expenses" element={<ProtectedLayout><RentalExpensesPage /></ProtectedLayout>} />
        <Route path="/rental/charges" element={<ProtectedLayout><ChargesPage /></ProtectedLayout>} />
        <Route path="/rental/reports" element={<ProtectedLayout><RentalReportsPage /></ProtectedLayout>} />

        <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
        <Route path="/reports/:category" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />

        <Route path="/management/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
        <Route path="/management/salary-rules" element={<Navigate to="/management/jobs" replace />} />
        <Route path="/management/:section" element={<ProtectedLayout><ManagementPage /></ProtectedLayout>} />
        <Route path="/management/jobs/new" element={<ProtectedLayout><ManagementPage /></ProtectedLayout>} />
        <Route path="/management/jobs/:id" element={<ProtectedLayout><ManagementPage /></ProtectedLayout>} />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
