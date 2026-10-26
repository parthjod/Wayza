import { useNavigate } from 'react-router-dom';
import { HOME_BG_VIDEO } from '../utils/constants';

export default function Terms() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length <= 1) {
      window.close();
    } else {
      navigate(-1);
    }
  };

  const sectionHeading =
    'text-lg sm:text-xl font-semibold text-white tracking-tight';

  const bodyText =
    'text-[13px] sm:text-sm text-slate-300/90 leading-[1.8]';

  const legalCard =
    'rounded-2xl border border-[#243650]/80 bg-[#0b1425]/80 backdrop-blur-xl shadow-[0_8px_28px_rgba(0,0,0,0.12)]';

  const badgeClass =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1688ff] to-[#075bd7] text-lg font-bold text-white shadow-[0_4px_14px_rgba(0,107,255,0.22)]';

  const blueAccent =
    'absolute left-0 top-1 bottom-1 w-[4px] rounded-full bg-[#1685ff]';

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#070b13] font-sans text-white selection:bg-[#398bff]/30 selection:text-white">
      {/* Background ambient video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover opacity-[0.14] blur-[2px]"
        src={HOME_BG_VIDEO}
      />

      {/* Dark gradient and subtle navy ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(18,73,153,0.14),transparent_55%),linear-gradient(180deg,rgba(5,10,22,0.93),rgba(5,10,22,0.97)_48%,#070b13)]" />

      {/* Decorative background shapes */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-40 top-[280px] h-[380px] w-[300px] rounded-full bg-[#0c3975]/10 blur-[90px]" />
        <div className="absolute -right-40 top-[500px] h-[380px] w-[300px] rounded-full bg-[#075bd7]/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.09] bg-[#10294b]/90 text-white/90 transition-all hover:border-blue-400/40 hover:bg-[#16375f] hover:text-white"
            title="Go back"
            aria-label="Go back"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <span className="font-instrument text-2xl italic tracking-tight text-white sm:text-[30px]">
            Wayza
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-blue-500/50 bg-blue-500/[0.08] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-blue-300 sm:px-3 sm:text-[11px]">
            Campus Peer Agreement
          </span>

          <span className="rounded-full border border-amber-500/70 bg-amber-500/[0.08] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-amber-300 sm:px-3 sm:text-[11px]">
            Legal Disclaimer
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 pb-8 pt-4 sm:px-6 sm:pt-5">
        {/* Page title */}
        <div className="mb-5">
          <h1 className="font-instrument text-[32px] italic leading-tight tracking-tight text-white sm:text-[42px]">
            Terms of Service &amp; Financial Disclaimer
          </h1>

          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 sm:text-xs sm:tracking-[0.15em]">
            Effective Date: Academic Session 2026–2027
            <span className="mx-2 text-blue-400">•</span>
            MIT-WPU Pune Community
          </p>
        </div>

        {/* Financial disclaimer banner */}
        <div className="mb-4 flex items-start gap-4 rounded-2xl border border-amber-500/60 bg-gradient-to-r from-[#2b2115]/95 to-[#211b17]/95 p-4 shadow-[0_8px_28px_rgba(0,0,0,0.16)] sm:p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/[0.12] text-amber-300">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v18M5 6h14M5 6l-3 6h6L5 6zm14 0l-3 6h6l-3-6zM12 3l-2 3h4l-2-3zM8 21h8M6 12c0 2 1.3 3 3 3s3-1 3-3m0 0c0 2 1.3 3 3 3s3-1 3-3"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="mb-1 text-[15px] font-bold leading-6 text-amber-300 sm:text-[18px]">
              Crucial Financial Disclaimer: Zero Monetary Responsibility
            </h2>

            <p className="text-[13px] leading-[1.75] text-slate-200/95 sm:text-sm">
              Wayza is strictly an informational student peer-discovery utility.
              Wayza does{' '}
              <span className="font-bold text-white underline">not</span>{' '}
              collect, hold, process, transfer, or escrow any money. Wayza
              charges{' '}
              <span className="font-semibold text-white">zero commission</span>{' '}
              and takes{' '}
              <span className="font-semibold text-white">
                zero platform fees
              </span>
              . All ride costs, fare splits, UPI/GPay transfers, and cash
              settlements are direct, private peer-to-peer agreements between
              students and independent vehicle drivers. Wayza has zero liability
              for unpaid splits or financial disputes.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Section 1 */}
          <section className={`${legalCard} p-4 sm:p-5`}>
            <div className="mb-4 flex items-start gap-3 sm:gap-4">
              <span className={badgeClass}>1</span>

              <div className="min-w-0 flex-1 pt-1">
                <h2 className={sectionHeading}>
                  Nature of Service &amp; Intermediary Classification
                </h2>

                <p className={`${bodyText} mt-2`}>
                  Wayza is an independent student networking platform developed
                  exclusively for verified university students (such as the
                  MIT-WPU Pune community) to discover peers heading in the same
                  direction.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pl-0 sm:pl-1">
              <div className="relative pl-5">
                <span className={blueAccent} />
                <p className={bodyText}>
                  <strong className="font-semibold text-white">
                    Intermediary Status:
                  </strong>{' '}
                  In accordance with Section 79 of the Information Technology
                  Act, 2000 (India), Wayza functions strictly as an electronic
                  platform / technical intermediary facilitating voluntary
                  communications between students.
                </p>
              </div>

              <div className="relative pl-5">
                <span className={blueAccent} />
                <p className={bodyText}>
                  <strong className="font-semibold text-white">
                    Not a Transportation Aggregator:
                  </strong>{' '}
                  Wayza is <span className="underline">not</span> a motor cab
                  aggregator (like Uber, Ola, or Rapido), public transport
                  carrier, fleet operator, or taxi service. Wayza does not own,
                  inspect, lease, or operate motor vehicles, nor does it hire,
                  license, or employ drivers.
                </p>
              </div>

              <div className="relative pl-5">
                <span className={blueAccent} />
                <p className={bodyText}>
                  <strong className="font-semibold text-white">
                    Independent Commercial Transactions:
                  </strong>{' '}
                  Any auto-rickshaw, cab, taxi, or personal vehicle engaged by
                  student groups is a direct contract between the passengers and
                  the third-party driver.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className={`${legalCard} p-4 sm:p-5`}>
            <div className="mb-4 flex items-start gap-3 sm:gap-4">
              <span className={badgeClass}>2</span>

              <div className="min-w-0 flex-1 pt-1">
                <h2 className={sectionHeading}>
                  Zero Financial Liability &amp; Fare Disclaimer
                </h2>

                <p className={`${bodyText} mt-1`}>
                  By using Wayza to coordinate travel with other students, you
                  expressly understand and agree to the following financial
                  terms:
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Payment custody */}
              <div className="flex items-start gap-3 rounded-xl border border-[#283a55] bg-gradient-to-r from-[#101c30]/95 to-[#0d1728]/90 p-3.5 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#142c4d] text-blue-400">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.7}
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 10h18M7 15h4"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="mb-0.5 text-sm font-semibold text-white">
                    A. No Payment Custody or Gateways
                  </h3>
                  <p className={bodyText}>
                    Wayza does not possess, operate, or integrate any payment
                    gateway, digital wallet, or escrow mechanism. No money ever
                    touches Wayza servers, bank accounts, or systems.
                  </p>
                </div>
              </div>

              {/* Peer-to-peer payments */}
              <div className="flex items-start gap-3 rounded-xl border border-[#283a55] bg-gradient-to-r from-[#101c30]/95 to-[#0d1728]/90 p-3.5 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#142c4d] text-blue-400">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.7}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m18 0v-2a4 4 0 00-3-3.87M9 11a4 4 0 110-8 4 4 0 010 8zm10-4a4 4 0 01-2 3.46"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="mb-0.5 text-sm font-semibold text-white">
                    B. Purely Peer-to-Peer Settlements (UPI / GPay / Cash)
                  </h3>
                  <p className={bodyText}>
                    Any UPI links, GPay QR codes, or phone numbers shared in
                    the group chat or fare split dialogs serve solely as
                    informational shortcuts for your convenience. Financial
                    transactions take place externally through third-party
                    banking applications (e.g., Google Pay, PhonePe, Paytm,
                    BHIM). Wayza has no capability or authority to reverse,
                    refund, audit, or intervene in any bank transfer.
                  </p>
                </div>
              </div>

              {/* Non-payment */}
              <div className="flex items-start gap-3 rounded-xl border border-[#283a55] bg-gradient-to-r from-[#101c30]/95 to-[#0d1728]/90 p-3.5 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#142c4d] text-blue-400">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.7}
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 21v-2a7 7 0 0114 0v2M19 8l3 3m0-3l-3 3"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="mb-0.5 text-sm font-semibold text-white">
                    C. Non-Payment &amp; Peer Default
                  </h3>
                  <p className={bodyText}>
                    Wayza does <strong className="text-white">not</strong>{' '}
                    guarantee that co-passengers will fulfill their agreed
                    share. You are personally responsible for verifying
                    payments with your peers (e.g., verifying UPI transaction
                    confirmation screens) before parting ways. Wayza cannot
                    recover unpaid shares or act as a collection agent.
                  </p>
                </div>
              </div>

              {/* Fare calculations */}
              <div className="flex items-start gap-3 rounded-xl border border-[#283a55] bg-gradient-to-r from-[#101c30]/95 to-[#0d1728]/90 p-3.5 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#142c4d] text-blue-400">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.7}
                  >
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 3h2m4 0h2"
                    />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="mb-0.5 text-sm font-semibold text-white">
                    D. Advisory Nature of Fare Calculations
                  </h3>
                  <p className={bodyText}>
                    Any equal or distance-based split estimates shown in the
                    app are non-binding mathematical aids provided solely for
                    informal planning. Students must always pay the actual
                    metered or negotiated fare charged by the driver.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className={`${legalCard} p-4 sm:p-5`}>
            <div className="mb-3 flex items-start gap-3 sm:gap-4">
              <span className={badgeClass}>3</span>

              <div className="min-w-0 flex-1 pt-1">
                <h2 className={sectionHeading}>
                  Transit Safety &amp; Assumption of Risk
                </h2>

                <p className={`${bodyText} mt-2`}>
                  Motor vehicle transit carries inherent roadside, vehicular,
                  and environmental hazards. You acknowledge that choosing to
                  travel with fellow students is entirely voluntary:
                </p>
              </div>
            </div>

            <ul className={`${bodyText} space-y-2 pl-1`}>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  Wayza disclaims all liability for road traffic accidents,
                  mechanical failures, bodily injury, or death occurring during
                  travel.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  Wayza is not responsible for the competence, licensure,
                  driving behavior, sobriety, or criminal acts of any
                  third-party cab, taxi, or auto-rickshaw driver.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  Wayza assumes no liability for items lost, forgotten, stolen,
                  or damaged inside vehicles or during transit.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  Wayza is not responsible for academic consequences,
                  examination delays, missed train/flight departures, or
                  detours due to traffic conditions.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className={`${legalCard} p-4 sm:p-5`}>
            <div className="mb-3 flex items-start gap-3 sm:gap-4">
              <span className={badgeClass}>4</span>

              <div className="min-w-0 flex-1 pt-1">
                <h2 className={sectionHeading}>
                  University Verification &amp; Peer Code of Conduct
                </h2>

                <p className={`${bodyText} mt-2`}>
                  Platform registration requires an active, verified
                  institutional email address (
                  <code className="rounded-md border border-blue-400/15 bg-blue-500/[0.08] px-1.5 py-0.5 text-xs text-[#80c0ff]">
                    @mitwpu.edu.in
                  </code>
                  ). Each user agrees to adhere to the highest standards of
                  safety, dignity, and integrity:
                </p>
              </div>
            </div>

            <ul className={`${bodyText} space-y-2 pl-1`}>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="font-semibold text-white">
                    Zero Tolerance Policy:
                  </strong>{' '}
                  Any harassment, hate speech, stalking, unwelcome physical
                  conduct, intoxication, or illicit activities will result in
                  immediate permanent account termination.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="font-semibold text-white">
                    Reporting to Campus Authorities:
                  </strong>{' '}
                  In cases of severe misconduct, fraud, or safety breaches,
                  incident records will be escalated to the MIT-WPU Disciplinary
                  Committee and local law enforcement.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="font-semibold text-white">
                    Account Responsibility:
                  </strong>{' '}
                  You may not share your account or impersonate any other
                  student. You are strictly responsible for all actions
                  conducted under your credentials.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className={`${legalCard} p-4 sm:p-5`}>
            <div className="flex items-start gap-3 sm:gap-4">
              <span className={badgeClass}>5</span>

              <div className="min-w-0 flex-1 pt-1">
                <h2 className={sectionHeading}>
                  Ephemeral Data &amp; Location Privacy
                </h2>

                <p className={`${bodyText} mt-2`}>
                  Wayza values student privacy. Geospatial coordinates, pickup
                  landmarks, and live match requests are retained temporarily in
                  volatile memory strictly to facilitate active session
                  coordination. Wayza does not maintain persistent historical
                  GPS telemetry logs of your continuous daily travels.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className={`${legalCard} p-4 sm:p-5`}>
            <div className="flex items-start gap-3 sm:gap-4">
              <span className={badgeClass}>6</span>

              <div className="min-w-0 flex-1 pt-1">
                <h2 className={sectionHeading}>
                  Indemnification &amp; Limitation of Liability
                </h2>

                <p className={`${bodyText} mt-2`}>
                  To the maximum extent permitted by applicable Indian laws, you
                  agree to indemnify, defend, and hold harmless Wayza, its
                  student developers, project contributors, and affiliated
                  educational institutions against any and all claims, damages,
                  liabilities, losses, or legal expenses (including legal fees)
                  arising out of or related to your use of the platform,
                  interactions with other passengers or drivers, or violation
                  of these terms.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className={`${legalCard} p-4 sm:p-5`}>
            <div className="flex items-start gap-3 sm:gap-4">
              <span className={badgeClass}>7</span>

              <div className="min-w-0 flex-1 pt-1">
                <h2 className={sectionHeading}>
                  Governing Law &amp; Jurisdiction
                </h2>

                <p className={`${bodyText} mt-2`}>
                  These terms shall be governed by and construed in accordance
                  with the laws of the Republic of India. Any controversy,
                  dispute, or claim arising out of or in connection with these
                  terms or the use of Wayza shall be subject to the exclusive
                  jurisdiction of the competent courts in{' '}
                  <strong className="font-semibold text-white">
                    Pune, Maharashtra
                  </strong>
                  .
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-5 flex flex-col items-center justify-between gap-4 border-t border-white/[0.09] px-1 pt-5 sm:flex-row">
          <p className="text-center text-xs leading-5 text-slate-500 sm:text-left">
            © 2026 Wayza Student Mobility. MIT-WPU Pune Community.
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-white/15 bg-white/[0.06] px-6 py-2.5 text-sm font-medium text-slate-200 transition-all hover:border-blue-400/35 hover:bg-blue-500/10 hover:text-white"
          >
            Back to App
          </button>
        </footer>
      </main>
    </div>
  );
}
