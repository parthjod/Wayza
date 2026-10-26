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

  return (
    <div className="relative min-h-screen w-full bg-[#070b13] font-sans text-white selection:bg-[#398bff]/30 selection:text-white overflow-x-hidden flex flex-col items-center">
      {/* Background ambient video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="pointer-events-none fixed inset-0 z-0 h-full w-full object-cover opacity-[0.12] blur-[2px]"
        src={HOME_BG_VIDEO}
      />

      {/* Dark gradient and subtle ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(18,73,153,0.22),transparent_65%),linear-gradient(180deg,rgba(5,10,22,0.92),rgba(5,10,22,0.98)_45%,#070b13)]" />

      {/* Decorative ambient radial glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-1/2 -translate-x-1/2 top-[100px] h-[550px] w-[700px] rounded-full bg-[#0c3975]/15 blur-[130px]" />
        <div className="absolute left-1/2 -translate-x-1/2 top-[700px] h-[550px] w-[700px] rounded-full bg-[#075bd7]/10 blur-[140px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-[#070b13]/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/90 transition-all hover:border-blue-400/40 hover:bg-blue-500/15 hover:text-white cursor-pointer shadow-md"
              title="Go back"
              aria-label="Go back"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
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
            <span className="hidden sm:inline-flex rounded-full border border-blue-500/40 bg-blue-500/[0.08] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-300">
              Campus Peer Agreement
            </span>

            <span className="rounded-full border border-amber-500/50 bg-amber-500/[0.1] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              Legal Terms
            </span>
          </div>
        </div>
      </header>

      {/* Main Centered Reading Content Container */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-10 sm:py-16 space-y-8 sm:space-y-10 flex flex-col items-center">
        
        {/* Hero Header */}
        <div className="flex flex-col items-center text-center space-y-4 pt-2 pb-2 w-full max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Safety Governance &amp; User Protection</span>
          </div>

          <h1 className="font-instrument text-4xl sm:text-5xl md:text-[52px] italic tracking-tight text-white leading-[1.16]">
            Terms of Service &amp; Financial Disclaimer
          </h1>

          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.16em] text-slate-400 pt-1">
            Academic Session 2026–2027
            <span className="mx-2.5 text-blue-400">•</span>
            MIT-WPU Pune Community
          </p>
        </div>

        {/* Highlighted Financial Disclaimer Banner - Elegant & Spacious */}
        <div className="w-full rounded-2xl sm:rounded-3xl border border-amber-500/40 bg-gradient-to-br from-[#2a1d12]/95 via-[#201712]/95 to-[#16110f]/95 p-6 sm:p-8 md:p-9 shadow-2xl space-y-6">
          <div className="flex items-center gap-3.5 text-amber-300">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M5 6h14M5 6l-3 6h6L5 6zm14 0l-3 6h6l-3-6zM12 3l-2 3h4l-2-3zM8 21h8M6 12c0 2 1.3 3 3 3s3-1 3-3m0 0c0 2 1.3 3 3 3s3-1 3-3" />
              </svg>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400/80 block">Important Notice</span>
              <h2 className="text-lg sm:text-xl font-bold text-amber-200">Zero Monetary Responsibility</h2>
            </div>
          </div>

          <p className="text-[14.5px] sm:text-[15.5px] leading-relaxed text-slate-200">
            Wayza is strictly an informational student peer-discovery utility.
            Wayza does <strong className="text-white underline decoration-amber-400 decoration-2 underline-offset-4">not</strong> collect,
            hold, process, transfer, or escrow any money. Wayza charges <strong className="text-white">zero commission</strong> and
            takes <strong className="text-white">zero platform fees</strong>.
          </p>

          {/* 3 Pillar Cards - Spacious with clear padding and no text overflow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-amber-500/25 flex flex-col justify-between space-y-2">
              <div className="text-amber-300 font-semibold text-xs sm:text-[13px] flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-300">✕</span>
                <span>No Payment Custody</span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-300/90 leading-relaxed">
                No funds ever touch Wayza servers, accounts, or payment channels.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-amber-500/25 flex flex-col justify-between space-y-2">
              <div className="text-amber-300 font-semibold text-xs sm:text-[13px] flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-300">⇄</span>
                <span>Direct Peer Splits</span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-300/90 leading-relaxed">
                All UPI, GPay, and cash settlements are direct peer-to-peer agreements.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-xl bg-black/40 border border-amber-500/25 flex flex-col justify-between space-y-2">
              <div className="text-amber-300 font-semibold text-xs sm:text-[13px] flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-300">⚖️</span>
                <span>Zero Debt Liability</span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-300/90 leading-relaxed">
                Wayza cannot recover unpaid shares or resolve external financial disputes.
              </p>
            </div>
          </div>
        </div>

        {/* Section 01 */}
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c1424]/60 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
              Section 01
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Nature of Service &amp; Intermediary Classification
            </h2>
          </div>

          <p className="text-[14.5px] sm:text-[15px] text-slate-300 leading-relaxed">
            Wayza is an independent student networking platform developed exclusively for verified university students (such as the MIT-WPU Pune community) to discover peers heading in the same direction.
          </p>

          <div className="grid grid-cols-1 gap-4 pt-1">
            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Intermediary Status (Section 79 IT Act, 2000)
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  In accordance with Section 79 of the Information Technology Act, 2000 (India), Wayza functions strictly as an electronic platform / technical intermediary facilitating voluntary communications between students.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Not a Transportation Aggregator
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Wayza is <span className="text-white font-medium underline decoration-blue-400 underline-offset-2">not</span> a motor cab aggregator (like Uber, Ola, or Rapido), public transport carrier, fleet operator, or taxi service. Wayza does not own, inspect, lease, or operate motor vehicles, nor does it hire, license, or employ drivers.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Independent Commercial Transactions
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Any auto-rickshaw, cab, taxi, or personal vehicle engaged by student groups is a direct contract between the passengers and the third-party driver.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 02 */}
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c1424]/60 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
              Section 02
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Zero Financial Liability &amp; Fare Disclaimer
            </h2>
          </div>

          <p className="text-[14.5px] sm:text-[15px] text-slate-300 leading-relaxed">
            By using Wayza to coordinate travel with other students, you expressly understand and agree to the following financial terms:
          </p>

          <div className="grid grid-cols-1 gap-4 pt-1">
            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-bold text-blue-400">
                A
              </span>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Zero Payment Custody or Gateways
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Wayza does not possess, operate, or integrate any payment gateway, digital wallet, or escrow mechanism. No money ever touches Wayza servers, bank accounts, or systems.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-bold text-blue-400">
                B
              </span>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Purely Peer-to-Peer Settlements (UPI / GPay / Cash)
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Any UPI links or GPay QR codes shared in group chats serve solely as informational shortcuts for student convenience. Transfers happen externally directly on banking apps; Wayza cannot reverse, refund, or investigate transfers.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-bold text-blue-400">
                C
              </span>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Non-Payment &amp; Peer Default
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Wayza does <strong className="text-white">not</strong> guarantee that co-passengers will fulfill their agreed share. You are personally responsible for verifying payments before parting ways. Wayza cannot recover unpaid shares or act as a collection agent.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-bold text-blue-400">
                D
              </span>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Advisory Mathematical Estimations Only
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Any split calculations shown in the app are non-binding mathematical approximations for planning. Students must always pay the actual metered or negotiated fare charged by the driver.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 03 */}
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c1424]/60 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
              Section 03
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Transit Safety &amp; Assumption of Risk
            </h2>
          </div>

          <p className="text-[14.5px] sm:text-[15px] text-slate-300 leading-relaxed">
            Motor vehicle transit carries inherent roadside, vehicular, and environmental hazards. You acknowledge that choosing to travel with fellow students is entirely voluntary:
          </p>

          <div className="grid grid-cols-1 gap-4 pt-1">
            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Road &amp; Traffic Accidents
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Wayza disclaims all liability for road traffic accidents, mechanical failures, bodily injury, or death occurring during travel.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Third-Party Driver Conduct
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Wayza is not responsible for the competence, licensure, driving behavior, sobriety, or criminal acts of any third-party cab, taxi, or auto-rickshaw driver.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Lost or Damaged Property
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Wayza assumes no liability for items lost, forgotten, stolen, or damaged inside vehicles or during transit.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-white font-semibold text-[15px] leading-snug">
                  Delays &amp; Schedule Disruptions
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Wayza is not responsible for academic consequences, examination delays, missed train/flight departures, or detours due to traffic conditions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 04 */}
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c1424]/60 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
              Section 04
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              University Verification &amp; Peer Code of Conduct
            </h2>
          </div>

          <p className="text-[14.5px] sm:text-[15px] text-slate-300 leading-relaxed">
            Platform registration requires an active, verified institutional email address (
            <code className="rounded-md border border-blue-400/25 bg-blue-500/[0.12] px-2 py-0.5 text-xs text-[#80c0ff] font-mono">
              @mitwpu.edu.in
            </code>
            ). Each user agrees to adhere to the highest standards of safety, dignity, and integrity:
          </p>

          <div className="grid grid-cols-1 gap-4 pt-1">
            <div className="p-5 rounded-xl border border-red-500/30 bg-red-500/[0.05] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-red-300 font-semibold text-[15px] leading-snug">
                  Zero Tolerance Policy
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  Any harassment, hate speech, stalking, unwelcome physical conduct, intoxication, or illicit activities will result in immediate permanent account termination.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-amber-300 font-semibold text-[15px] leading-snug">
                  Reporting to Campus Authorities
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  In cases of severe misconduct, fraud, or safety breaches, incident records will be escalated to the MIT-WPU Disciplinary Committee and local law enforcement.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-blue-500/30 bg-blue-500/[0.05] flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              <div className="space-y-1.5 flex-1">
                <h3 className="text-blue-300 font-semibold text-[15px] leading-snug">
                  Account Responsibility
                </h3>
                <p className="text-sm text-slate-300/85 leading-relaxed">
                  You may not share your account or impersonate any other student. You are strictly responsible for all actions conducted under your credentials.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 05 */}
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c1424]/60 backdrop-blur-md p-6 sm:p-8 space-y-4 shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
              Section 05
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Ephemeral Data &amp; Location Privacy
            </h2>
          </div>

          <p className="text-[14.5px] sm:text-[15px] text-slate-300/90 leading-relaxed">
            Wayza values student privacy. Geospatial coordinates, pickup landmarks, and live match requests are retained temporarily in volatile memory strictly to facilitate active session coordination. Wayza does not maintain persistent historical GPS telemetry logs of your continuous daily travels.
          </p>
        </div>

        {/* Section 06 */}
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c1424]/60 backdrop-blur-md p-6 sm:p-8 space-y-4 shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
              Section 06
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Indemnification &amp; Limitation of Liability
            </h2>
          </div>

          <p className="text-[14.5px] sm:text-[15px] text-slate-300/90 leading-relaxed">
            To the maximum extent permitted by applicable Indian laws, you agree to indemnify, defend, and hold harmless Wayza, its student developers, project contributors, and affiliated educational institutions against any and all claims, damages, liabilities, losses, or legal expenses (including legal fees) arising out of or related to your use of the platform, interactions with other passengers or drivers, or violation of these terms.
          </p>
        </div>

        {/* Section 07 */}
        <div className="w-full rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c1424]/60 backdrop-blur-md p-6 sm:p-8 space-y-4 shadow-lg">
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
              Section 07
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Governing Law &amp; Jurisdiction
            </h2>
          </div>

          <p className="text-[14.5px] sm:text-[15px] text-slate-300/90 leading-relaxed">
            These terms shall be governed by and construed in accordance with the laws of the Republic of India. Any controversy, dispute, or claim arising out of or in connection with these terms or the use of Wayza shall be subject to the exclusive jurisdiction of the competent courts in <strong className="text-white">Pune, Maharashtra</strong>.
          </p>
        </div>

        {/* Centered Footer */}
        <footer className="mt-8 pt-8 pb-14 border-t border-white/[0.08] w-full flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-xs sm:text-sm text-slate-400">
            © 2026 Wayza Student Mobility. MIT-WPU Pune Community.
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-white/20 bg-white/[0.08] px-8 py-3 text-sm font-medium text-white transition-all hover:border-blue-400/50 hover:bg-blue-600 hover:text-white cursor-pointer shadow-xl hover:shadow-blue-500/25"
          >
            Back to App
          </button>
        </footer>
      </main>
    </div>
  );
}
