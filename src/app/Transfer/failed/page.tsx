// src/app/Transfer/failed/page.tsx
'use client';

import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Nav from '@/app/dashboard/dashboardnav';
import { AlertTriangle, RefreshCcw, LifeBuoy, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type FailedSummary = {
  status: 'failed';
  type: 'ach' | 'wire_domestic' | 'wire_international' | 'crypto';
  createdAt: string;
  amount: { value: number; currency: string };
  sender: { accountName: string; accountMasked: string };
  recipient: {
    name: string;
    accountMasked?: string;
    cryptoAddress?: string;
    network?: string;
  };
  referenceId: string;
  error: { code?: string; message: string };
  note?: string;
};

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-base font-medium">{value || '—'}</div>
    </div>
  );
}

function railLabel(t: FailedSummary['type']) {
  switch (t) {
    case 'ach':
      return 'ACH (Standard)';
    case 'wire_domestic':
      return 'Wire (Domestic)';
    case 'wire_international':
      return 'SWIFT / International';
    case 'crypto':
      return 'Crypto';
    default:
      return 'Transfer';
  }
}

function FailedInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [userName, setUserName] = useState('User');
  const [setupPercent, setSetupPercent] = useState<number | undefined>(undefined);

  const data: FailedSummary = useMemo(() => {
    let fromLS: any;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('last_transfer');
        if (raw) fromLS = JSON.parse(raw);
      } catch {}
    }

    const q = (k: string, d = '') => params.get(k) ?? d;

    const fallback: FailedSummary = {
      status: 'failed',
      type: (q('type', 'ach') as any),
      createdAt: new Date().toISOString(),
      amount: { value: Number(q('amount', '250')), currency: q('ccy', 'USD') },
      sender: { accountName: 'Checking', accountMasked: '••••9876' },
      recipient: {
        name: q('to', 'Acme LLC'),
        accountMasked: q('acct', '••••1234'),
        cryptoAddress: q('addr') || undefined,
        network: q('net') || undefined,
      },
      referenceId: q('ref', 'TX_' + Math.random().toString(36).slice(2, 8).toUpperCase()),
      error: {
        code: q('errCode') || undefined,
        message:
          q('err') ||
          (q('type') === 'ach'
            ? 'R01 Insufficient funds'
            : q('type')?.startsWith('wire')
            ? 'Beneficiary bank rejected details'
            : q('type') === 'crypto'
            ? 'Invalid address checksum'
            : 'Transfer could not be completed'),
      },
      note: q('note') || undefined,
    };

    return fromLS && fromLS.status === 'failed' ? fromLS : fallback;
  }, [params]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setUserName(localStorage.getItem('hb_user_name') || 'User');
    const s = localStorage.getItem('hb_setup_percent');
    if (s) setSetupPercent(Number(s));
  }, []);

  const fmt = (n: number, ccy = 'USD') =>
    n.toLocaleString(undefined, { style: 'currency', currency: ccy });

  return (
    <main className="min-h-svh bg-[#0E131B] text-white">
      <Nav userName={userName} setupPercent={setupPercent} />
      <section className="container-x pt-[120px] pb-24">
        <div className="max-w-3xl mx-auto rounded-3xl border border-white/15 bg-white/[0.04] p-8 shadow-[0_8px_32px_rgba(0,0,0,.5)]">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 grid place-items-center">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">Transfer Failed</h1>
              <p className="text-white/70 mt-1">
                Attempted {new Date(data.createdAt).toLocaleString()} • Ref: {data.referenceId}
              </p>
            </div>
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <Info label="Amount" value={fmt(data.amount.value, data.amount.currency)} />
            <Info
              label="Recipient"
              value={`${data.recipient.name}${
                data.recipient.accountMasked ? ` • ${data.recipient.accountMasked}` : ''
              }`}
            />
            <Info label="From account" value={`Checking ${'••••9876'}`} />
            <Info label="Transfer rail" value={railLabel(data.type)} />
          </div>

          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            <div className="text-sm">
              <span className="font-medium">Reason:</span> {data.error.message}
              {data.error.code && <span className="opacity-80"> (Code {data.error.code})</span>}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 flex items-center gap-2"
              onClick={() => router.back()}
            >
              <RefreshCcw size={18} /> Fix & Resend
            </button>
            <button className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 flex items-center gap-2">
              <LifeBuoy size={18} /> Contact support
            </button>
            <button
              className="ml-auto px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/20 flex items-center gap-2"
              onClick={() => router.push('/dashboard/dashboard')}
            >
              Back to dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-svh bg-[#0E131B] text-white">
          <section className="container-x pt-[120px] pb-24">
            <div className="max-w-3xl mx-auto rounded-3xl border border-white/15 bg-white/[0.04] p-8">
              <div className="h-6 w-40 rounded bg-white/10" />
              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="h-16 rounded-2xl border border-white/10 bg-white/5" />
                <div className="h-16 rounded-2xl border border-white/10 bg-white/5" />
                <div className="h-16 rounded-2xl border border-white/10 bg-white/5" />
                <div className="h-16 rounded-2xl border border-white/10 bg-white/5" />
              </div>
            </div>
          </section>
        </main>
      }
    >
      <FailedInner />
    </Suspense>
  );
}
