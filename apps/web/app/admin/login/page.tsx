import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in' };

export default function AdminLoginPage() {
  return (
    <main className="page-shell page-content admin-login">
      <header className="page-intro">
        <p className="eyebrow">BharatLens Admin</p>
        <h1>Sign in</h1>
        <p>Operator access to the review console.</p>
      </header>
      <LoginForm />
    </main>
  );
}
