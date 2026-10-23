import { CheckCircle, AlertCircle, Clock, HandCoins, Shield, DollarSign } from 'lucide-react';

export default function HowItWorks() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Hero */}
      <div>
        <h1
          className="display text-3xl font-bold tracking-tight"
          style={{ color: 'var(--ink)' }}
        >
          How It Works &amp; Fees
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--muted)' }}>
          A simple, transparent escrow system for item lending built on Arc Testnet.
        </p>
      </div>

      {/* Steps */}
      <Section title="The Lending Process" icon={<HandCoins className="h-5 w-5" />}>
        <Steps
          steps={[
            {
              n: 1,
              title: 'Lender creates an offer',
              desc: 'The lender lists an item with a name, description, deposit amount in USDC, and a return date. No funds are sent at this stage.',
            },
            {
              n: 2,
              title: 'Borrower locks the deposit',
              desc: 'The borrower approves USDC and confirms the deposit. The platform fee (1.9%) is sent automatically to the platform. The remaining 98.1% is held in the escrow smart contract.',
            },
            {
              n: 3,
              title: 'Item is used',
              desc: 'The borrower uses the item. They must return it by the agreed return date to avoid late fees. The status page always shows how many days remain.',
            },
            {
              n: 4,
              title: 'Borrower signals return',
              desc: 'The borrower can optionally click "Signal Return" when they hand the item back. This timestamps the return and prevents the lender from claiming extra overdue days.',
            },
            {
              n: 5,
              title: 'Lender confirms the return',
              desc: 'The lender chooses an outcome: on time, late, damaged, or not returned. The escrow is settled instantly on-chain.',
            },
          ]}
        />
      </Section>

      {/* Return Outcomes */}
      <Section title="Return Outcomes" icon={<CheckCircle className="h-5 w-5" />}>
        <div className="space-y-3">
          <OutcomeCard
            color="var(--success)"
            bg="rgba(26,128,71,0.07)"
            title="Returned on time, good condition"
            desc="The full escrow amount is refunded to the borrower."
          />
          <OutcomeCard
            color="#b47814"
            bg="rgba(180,120,20,0.07)"
            title="Returned late"
            desc="A late fee of 2% of the original deposit per day overdue is deducted from the escrow. Late fees are capped at the full escrow amount. The lender receives the late fees; the borrower receives whatever remains."
          />
          <OutcomeCard
            color="var(--danger)"
            bg="rgba(186,43,76,0.07)"
            title="Returned damaged"
            desc="The lender specifies a damage percentage (e.g. 50% for significant damage). That amount is deducted in addition to any late fees. All deductions go to the lender; the borrower receives the rest."
          />
          <OutcomeCard
            color="var(--danger)"
            bg="rgba(186,43,76,0.07)"
            title="Not returned"
            desc="The full escrow amount is sent to the lender."
          />
        </div>
      </Section>

      {/* Fees */}
      <Section title="Fee Schedule" icon={<DollarSign className="h-5 w-5" />}>
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-muted)' }}>
                <th
                  className="px-4 py-3 text-left font-semibold"
                  style={{ color: 'var(--ink)' }}
                >
                  Fee
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold"
                  style={{ color: 'var(--ink)' }}
                >
                  Rate
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold"
                  style={{ color: 'var(--ink)' }}
                >
                  Who Pays / Receives
                </th>
              </tr>
            </thead>
            <tbody>
              <FeeRow fee="Platform fee" rate="1.9% of deposit" who="Borrower pays, deducted on lock" />
              <FeeRow fee="Late fee" rate="2% per day overdue" who="Borrower pays, lender receives" />
              <FeeRow fee="Damage deduction" rate="Custom % set by lender" who="Borrower pays, lender receives" />
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--subtle)' }}>
          All fees are calculated in USDC with 6 decimal precision. Late fees are capped at the
          total escrow amount so borrowers can never lose more than their original deposit.
        </p>
      </Section>

      {/* Extension */}
      <Section title="Extension Requests" icon={<Clock className="h-5 w-5" />}>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          If the borrower needs more time, they can request an extension (in days) from the loan
          page. The lender will receive a notification on their loan view and can approve or reject
          the request. Approved extensions update the return date on-chain, preventing late fees for
          the additional days.
        </p>
      </Section>

      {/* Safety */}
      <Section title="Safety &amp; Transparency" icon={<Shield className="h-5 w-5" />}>
        <div className="space-y-2">
          {[
            'All funds are held by the smart contract — not by any individual.',
            'The fee breakdown is shown before you confirm any deposit.',
            'Every transaction is recorded on-chain and viewable on ArcScan.',
            'The borrower can signal their return to lock in a fair timestamp.',
            'If a lender fails to confirm within 7 days of the return date, the borrower can claim their escrow back.',
            'Escrow is settled using a pull-payment model — funds are credited to your account and you can claim them at any time.',
          ].map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: 'var(--success)' }}
              />
              <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
                {point}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Warning */}
      <div
        className="flex items-start gap-3 rounded-2xl border p-4"
        style={{
          background: 'rgba(186,43,76,0.05)',
          borderColor: 'rgba(186,43,76,0.2)',
        }}
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--danger)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
            Testnet Only
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            This app runs on Arc Testnet with test USDC. No real funds are at risk. Use the
            "Get test USDC" button in the Arc Studio sidebar to fund your wallet.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-3xl border p-6 space-y-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: 'var(--surface-muted)', color: 'var(--accent)' }}
        >
          {icon}
        </div>
        <h2 className="display text-lg font-bold" style={{ color: 'var(--ink)' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Steps({
  steps,
}: {
  steps: { n: number; title: string; desc: string }[];
}) {
  return (
    <div className="space-y-4">
      {steps.map((step) => (
        <div key={step.n} className="flex gap-3">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {step.n}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {step.title}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              {step.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OutcomeCard({
  color,
  bg,
  title,
  desc,
}: {
  color: string;
  bg: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: bg, borderColor: `${color}33` }}
    >
      <p className="text-sm font-semibold" style={{ color }}>
        {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
        {desc}
      </p>
    </div>
  );
}

function FeeRow({
  fee,
  rate,
  who,
}: {
  fee: string;
  rate: string;
  who: string;
}) {
  return (
    <tr
      className="border-t"
      style={{ borderColor: 'var(--border)' }}
    >
      <td className="px-4 py-3 font-medium" style={{ color: 'var(--ink)' }}>
        {fee}
      </td>
      <td className="px-4 py-3 tabular-nums font-semibold" style={{ color: 'var(--accent)' }}>
        {rate}
      </td>
      <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>
        {who}
      </td>
    </tr>
  );
}
