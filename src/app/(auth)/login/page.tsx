import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-[#17141f]">
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden p-12 text-[#f4f0e8] lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_10%_0%,rgba(201,162,39,0.22),transparent_55%),radial-gradient(700px_500px_at_90%_80%,rgba(47,93,98,0.35),transparent_50%)]" />
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c9a227,#2f5d62)] text-lg font-bold">
            O
          </div>
          <p className="mt-6 text-[11px] font-semibold tracking-[0.28em] text-[#e4c56a] uppercase">OrgPulse</p>
          <h1 className="mt-4 max-w-sm text-4xl leading-tight font-semibold tracking-tight">
            See the organisation as people actually sit in it.
          </h1>
        </div>
        <p className="relative max-w-sm text-sm leading-relaxed text-[#9a94a3]">
          Positions form the hierarchy. People occupy seats. Open roles stay visible, and every
          change is audited.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[#f6f4ef] p-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_20px_50px_rgba(23,20,31,0.08)]">
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 mb-6 text-sm text-[var(--muted-foreground)]">
            Demo: owner@northstar.example
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
