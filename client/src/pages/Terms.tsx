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
    'text-xl sm:text-2xl font-semibold text-white tracking-tight leading-snug';

  const bodyText =
    'text-[14px] sm:text-[15px] text-slate-300/90 leading-[1.85]';

  const legalCard =
    'rounded-3xl border border-white/[0.09] bg-[#0c1626]/85 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.25)] hover:border-white/[0.16] transition-all duration-300';

  const badgeClass =
    'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1688ff] to-[#075bd7] text-base sm:text-lg font-bold text-white shadow-[0_4px_16px_rgba(0,107,255,0.3)]';

  const blueAccent =
    'absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-full bg-[#1685ff]';

  return (
    <div className="terms-page relative min-h-screen w-full bg-[#070b13] font-sans text-white selection:bg-[#398bff]/30 selection:text-white overflow-x-hidden flex flex-col items-center">
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
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(18,73,153,0.22),transparent_65%),linear-gradient(180deg,rgba(5,10,22,0.92),rgba(5,10,22,0.98)_45%,#070b13)]" />

      {/* Decorative background ambient shapes */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-48 top-[200px] h-[450px] w-[400px] rounded-full bg-[#0c3975]/15 blur-[110px]" />
        <div className="absolute -right-48 top-[450px] h-[450px] w-[400px] rounded-full bg-[#075bd7]/15 blur-[120px]" />
      </div>

      {/* Sticky Header Bar - Centered Content */}
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-[#070b13]/85 backdrop-blur-xl">
        <div className="terms-container mx-auto flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#10294b]/90 text-white/90 transition-all hover:border-blue-400/40 hover:bg-[#16375f] hover:text-white cursor-pointer shadow-md"
              title="Go back"
              aria-label="Go back"
            >
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <span className="font-instrument text-2xl sm:text-[28px] italic tracking-tight text-white select-none">
              Wayza
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex rounded-full border border-blue-500/40 bg-blue-500/[0.09] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-300">
              Campus Peer Agreement
            </span>

            <span className="rounded-full border border-amber-500/60 bg-amber-500/[0.12] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              Legal Disclaimer
            </span>
          </div>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="terms-container relative z-10 mx-auto w-full px-4 sm:px-6 md:px-8 py-10 sm:py-14 space-y-8 sm:space-y-10">
        
        {/* Centralized Hero Title */}
        <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-3 pt-2 pb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-xs font-medium text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>Safety Governance &amp; User Protection</span>
          </div>

          <h1 className="font-instrument text-3xl sm:text-4xl md:text-5xl italic tracking-tight text-white leading-[1.15]">
            Terms of Service &amp; Financial Disclaimer
          </h1>

          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.15em] text-slate-400 pt-1">
            Academic Session 2026–2027
            <span className="mx-2 text-blue-400">•</span>
            MIT-WPU Pune Community
          </p>
        </div>

        {/* Financial Disclaimer Banner */}
        <div className="rounded-3xl border border-amber-500/50 bg-gradient-to-br from-[#2a1d12]/95 via-[#221812]/95 to-[#191310]/95 p-6 sm:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            <div className="flex h-13 w-13 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/[0.14] text-amber-300 shadow-md">
              <svg
                className="h-7 w-7 sm:h-8 sm:w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.6}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v18M5 6h14M5 6l-3 6h6L5 6zm14 0l-3 6h6l-3-6zM12 3l-2 3h4l-2-3zM8 21h8M6 12c0 2 1.3 3 3 3s3-1 3-3m0 0c0 2 1.3 3 3 3s3-1 3-3"
                />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg md:text-xl font-bold leading-snug text-amber-300 mb-2">
                Crucial Financial Disclaimer: Zero Monetary Responsibility
              </h2>

              <p className="text-[14px] sm:text-[15px] leading-[1.8] text-slate-200/95">
                Wayza is strictly an informational student peer-discovery utility.
                Wayza does{' '}
                <span className="font-bold text-white underline decoration-amber-400 decoration-2 underline-offset-2">not</span>{' '}
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
        </div>

        {/* Section 1 */}
        <section className={legalCard}>
          <div className="mb-5 flex items-start gap-4">
            <span className={badgeClass}>1</span>

            <div className="min-w-0 flex-1 pt-0.5">
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

          <div className="space-y-3.5 pl-0 sm:pl-2">
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
                Wayza is <span className="underline decoration-blue-400 decoration-1">not</span> a motor cab
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
        <section className={legalCard}>
          <div className="mb-5 flex items-start gap-4">
            <span className={badgeClass}>2</span>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className={sectionHeading}>
                Zero Financial Liability &amp; Fare Disclaimer
              </h2>

              <p className={`${bodyText} mt-2`}>
                By using Wayza to coordinate travel with other students, you
                expressly understand and agree to the following financial
                terms:
              </p>
            </div>
          </div>

          {/* Responsive 2-column grid with generous spacing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Payment custody */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all hover:border-blue-500/35 hover:bg-white/[0.05]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
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
                <h3 className="mb-1 text-[15px] font-semibold text-white">
                  A. No Payment Custody
                </h3>
                <p className={bodyText}>
                  Wayza does not possess, operate, or integrate any payment
                  gateway, digital wallet, or escrow mechanism. No money ever
                  touches Wayza servers or bank accounts.
                </p>
              </div>
            </div>

            {/* Peer-to-peer payments */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all hover:border-blue-500/35 hover:bg-white/[0.05]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
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
                    d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m18 0v-2a4 4 0 00-3-3.87M9 11a4 4 0 110-8 4 4 0 010 8zm10-4a4 4 0 01-2 3.46"
                  />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-[15px] font-semibold text-white">
                  B. Peer-to-Peer UPI &amp; Cash
                </h3>
                <p className={bodyText}>
                  Any UPI links or GPay QR codes shared in group chats serve solely as informational shortcuts. Transfers happen externally on banking apps; Wayza cannot reverse or refund transfers.
                </p>
              </div>
            </div>

            {/* Non-payment */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all hover:border-blue-500/35 hover:bg-white/[0.05]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
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
                <h3 className="mb-1 text-[15px] font-semibold text-white">
                  C. Non-Payment &amp; Peer Default
                </h3>
                <p className={bodyText}>
                  Wayza does <strong className="text-white">not</strong>{' '}
                  guarantee that co-passengers will fulfill their agreed share. You are personally responsible for verifying payments before parting ways.
                </p>
              </div>
            </div>

            {/* Fare calculations */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all hover:border-blue-500/35 hover:bg-white/[0.05]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
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
                <h3 className="mb-1 text-[15px] font-semibold text-white">
                  D. Advisory Estimations Only
                </h3>
                <p className={bodyText}>
                  Any split calculations shown in the app are non-binding mathematical approximations for planning. Students must always pay the actual metered or negotiated fare charged by the driver.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className={legalCard}>
          <div className="mb-5 flex items-start gap-4">
            <span className={badgeClass}>3</span>

            <div className="min-w-0 flex-1 pt-0.5">
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

          <ul className={`${bodyText} space-y-3 pl-1 sm:pl-2`}>
            <li className="flex items-start gap-3.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <span>
                Wayza disclaims all liability for road traffic accidents,
                mechanical failures, bodily injury, or death occurring during
                travel.
              </span>
            </li>
            <li className="flex items-start gap-3.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <span>
                Wayza is not responsible for the competence, licensure,
                driving behavior, sobriety, or criminal acts of any
                third-party cab, taxi, or auto-rickshaw driver.
              </span>
            </li>
            <li className="flex items-start gap-3.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <span>
                Wayza assumes no liability for items lost, forgotten, stolen,
                or damaged inside vehicles or during transit.
              </span>
            </li>
            <li className="flex items-start gap-3.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <span>
                Wayza is not responsible for academic consequences,
                examination delays, missed train/flight departures, or
                detours due to traffic conditions.
              </span>
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className={legalCard}>
          <div className="mb-5 flex items-start gap-4">
            <span className={badgeClass}>4</span>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className={sectionHeading}>
                University Verification &amp; Peer Code of Conduct
              </h2>

              <p className={`${bodyText} mt-2`}>
                Platform registration requires an active, verified
                institutional email address (
                <code className="rounded-md border border-blue-400/25 bg-blue-500/[0.12] px-2 py-0.5 text-xs text-[#80c0ff] font-mono">
                  @mitwpu.edu.in
                </code>
                ). Each user agrees to adhere to the highest standards of
                safety, dignity, and integrity:
              </p>
            </div>
          </div>

          <ul className={`${bodyText} space-y-3 pl-1 sm:pl-2`}>
            <li className="flex items-start gap-3.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <span>
                <strong className="font-semibold text-white">
                  Zero Tolerance Policy:
                </strong>{' '}
                Any harassment, hate speech, stalking, unwelcome physical
                conduct, intoxication, or illicit activities will result in
                immediate permanent account termination.
              </span>
            </li>
            <li className="flex items-start gap-3.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <span>
                <strong className="font-semibold text-white">
                  Reporting to Campus Authorities:
                </strong>{' '}
                In cases of severe misconduct, fraud, or safety breaches,
                incident records will be escalated to the MIT-WPU Disciplinary
                Committee and local law enforcement.
              </span>
            </li>
            <li className="flex items-start gap-3.5">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
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
        <section className={legalCard}>
          <div className="flex items-start gap-4">
            <span className={badgeClass}>5</span>

            <div className="min-w-0 flex-1 pt-0.5">
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
        <section className={legalCard}>
          <div className="flex items-start gap-4">
            <span className={badgeClass}>6</span>

            <div className="min-w-0 flex-1 pt-0.5">
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
        <section className={legalCard}>
          <div className="flex items-start gap-4">
            <span className={badgeClass}>7</span>

            <div className="min-w-0 flex-1 pt-0.5">
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

        {/* Centered Footer */}
        <footer className="mt-14 pt-8 pb-10 border-t border-white/[0.08] w-full flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-xs sm:text-sm text-slate-400">
            © 2026 Wayza Student Mobility. MIT-WPU Pune Community.
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-white/20 bg-white/[0.1] px-8 py-3 text-sm font-medium text-white transition-all hover:border-blue-400/50 hover:bg-blue-600 hover:text-white cursor-pointer shadow-xl hover:shadow-blue-500/25"
          >
            Back to App
          </button>
        </footer>
      </main>
    </div>
  );
}
