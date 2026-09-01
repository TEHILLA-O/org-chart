import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-[var(--ink)]">
      <div className="hidden w-[42%] flex-col justify-between border-r border-white/10 p-10 text-[#e8e4d8] lg:flex">
        <div>
          <p className="text-xs tracking-[0.3em] text-[#c9a227] uppercase">OrgPulse</p>
          <h1 className="mt-6 max-w-sm text-4xl leading-tight font-semibold">
            The organisation, as it actually is.
          </h1>
        </div>
        <p className="max-w-sm text-sm text-[#8b909d]">
          Positions, not people, form the hierarchy. People occupy seats. Vacancies remain
          visible. Every change is audited.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[var(--paper)] p-6">
        <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="mt-1 mb-6 text-sm text-[var(--muted-foreground)]">
            Demo directory: owner@northstar.example
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
