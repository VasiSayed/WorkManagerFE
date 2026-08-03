import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { T } from '../theme';
import { api, getAccessToken, getErrorMessage } from '../api/client';
import { Btn, Card, Input } from '../components/UI';
import { Icon } from '../components/Icons';

function AuthShell({ title, subtitle, children }) {
  if (getAccessToken()) return <Navigate to="/dashboard" replace />;
  return (
    <div className="auth-shell" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '45% 55%', background: T.cream }}>
      <div className="auth-intro" style={{ background: T.navy, color: T.white, padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(201,168,76,.14)', top: -80, right: -80 }} />
        <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.06)', bottom: 60, left: 40 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>WorkManager</div>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,.72)', maxWidth: 420, lineHeight: 1.7 }}>
            Personal Work Management System for tasks, MOM, leave, salary, email and reports.
          </div>
          <div style={{ marginTop: 34, display: 'grid', gap: 12, maxWidth: 380 }}>
            {['One task, one click', 'User-wise private records', 'Dashboard + management in one backend'].map(x => (
              <div key={x} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="check" size={16} /> {x}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="auth-form-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ width: 'min(440px, 100%)', padding: 32, boxShadow: '0 20px 60px rgba(27,42,74,.10)' }}>
          <h1 style={{ color: T.navy, fontSize: 26, marginBottom: 6 }}>{title}</h1>
          <p style={{ color: T.slateLight, fontSize: 13, marginBottom: 24 }}>{subtitle}</p>
          {children}
        </Card>
      </div>
    </div>
  );
}

function ErrorBox({ error }) {
  if (!error) return null;
  return <div style={{ padding: '10px 12px', background: T.errorBg, color: T.error, borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try { await api.auth.login(form.email, form.password); navigate('/dashboard', { replace: true }); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  return (
    <AuthShell title="Login" subtitle="Use your email and password to continue.">
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <ErrorBox error={error} />
        <Input label="Email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <Btn type="submit" variant="gold" disabled={loading} style={{ justifyContent: 'center', marginTop: 4 }}>{loading ? 'Logging in…' : 'Login'}</Btn>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <Link to="/forgot-password" style={{ color: T.goldDark }}>Forgot password?</Link>
          <Link to="/register" style={{ color: T.navy, fontWeight: 600 }}>Create account</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await api.auth.register(form); navigate('/dashboard', { replace: true }); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  return (
    <AuthShell title="Register" subtitle="Create your personal work manager account.">
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <ErrorBox error={error} />
        <Input label="Full Name" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
        <Input label="Email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <Input label="Password" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <Input label="Confirm Password" type="password" required value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })} />
        <Btn type="submit" variant="gold" disabled={loading} style={{ justifyContent: 'center' }}>{loading ? 'Creating…' : 'Create account'}</Btn>
        <Link to="/login" style={{ color: T.navy, fontWeight: 600, textAlign: 'center', fontSize: 12 }}>Already have account? Login</Link>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setError('');
    try { const res = await api.auth.forgotPassword(email); setMsg(res.detail || 'Request sent.'); }
    catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <AuthShell title="Forgot Password" subtitle="Request reset instructions for your account.">
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <ErrorBox error={error} />
        {msg && <div style={{ padding: 10, borderRadius: 8, background: T.successBg, color: T.success, fontSize: 12 }}>{msg}</div>}
        <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
        <Btn type="submit" variant="gold" style={{ justifyContent: 'center' }}>Submit</Btn>
        <Link to="/login" style={{ color: T.navy, fontWeight: 600, textAlign: 'center', fontSize: 12 }}>Back to login</Link>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ token: params.get('token') || '', new_password: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setMsg(''); setError('');
    try { const res = await api.auth.resetPassword(form); setMsg(res.detail || 'Password reset request accepted.'); }
    catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <AuthShell title="Reset Password" subtitle="Set a new password using your reset token.">
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <ErrorBox error={error} />
        {msg && <div style={{ padding: 10, borderRadius: 8, background: T.successBg, color: T.success, fontSize: 12 }}>{msg}</div>}
        <Input label="Token" required value={form.token} onChange={e => setForm({ ...form, token: e.target.value })} />
        <Input label="New Password" type="password" required value={form.new_password} onChange={e => setForm({ ...form, new_password: e.target.value })} />
        <Btn type="submit" variant="gold" style={{ justifyContent: 'center' }}>Reset password</Btn>
        <Link to="/login" style={{ color: T.navy, fontWeight: 600, textAlign: 'center', fontSize: 12 }}>Back to login</Link>
      </form>
    </AuthShell>
  );
}
