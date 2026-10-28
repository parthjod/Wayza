import { useNavigate } from 'react-router-dom';

const sectionHeadingClass =
  "mb-1 flex items-center gap-4 text-[23px] sm:text-[27px] font-bold leading-[1.25] tracking-[-0.025em] text-slate-50 after:mt-2 after:min-w-[28px] after:flex-1 after:border-t after:border-[#2d5c8b]/80 after:content-['']";

const paragraphClass = 'text-[15px] sm:text-[16px] leading-[2] text-slate-300';
const clauseClass = 'space-y-7 sm:space-y-8';

function MetaIcon({ children }) {
  return (
    <span
      className="mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#17365a] bg-[#0d1b2d] text-blue-400 shadow-sm shadow-black/20"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function SectionHeading({ children }) {
  return <h2 className={sectionHeadingClass}>{children}</h2>;
}

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
    <div
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#101b2b_0%,_#080c14_52%)] text-slate-300 antialiased selection:bg-blue-500/25 selection:text-white"
      style={{
        width: '100vw',
        maxWidth: '100vw',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* Sticky document navigation */}
      <header className="sticky top-0 z-30 w-full border-b border-[#1d2a3c] bg-[#080c14]/95 backdrop-blur-xl">
        <div
          className="flex h-10 items-center justify-between"
          style={{
            width: 'min(930px, calc(100% - 32px))',
            maxWidth: '930px',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-[27px] items-center gap-1.5 rounded-md border border-[#2b3b53] bg-[#111b2b] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-blue-400/50 hover:bg-[#18263a] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m15 18-6-6 6-6"
                />
              </svg>
              <span>Back</span>
            </button>

            <span className="select-none pl-0.5 font-instrument text-[27px] italic leading-none tracking-tight text-white">
              Wayza
            </span>
          </div>

          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Terms of Service
          </span>
        </div>
      </header>

      <main
        className="pb-20 pt-10 sm:pt-12"
        style={{
          width: 'min(1380px, calc(100vw - 64px))',
          maxWidth: '1380px',
          marginLeft: 'auto',
          marginRight: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Document heading */}
        <div className="mb-8 sm:mb-9">
          <h1 className="mb-6 text-[35px] sm:text-[46px] font-bold leading-[1.15] tracking-[-0.04em] text-white">
            Terms of Service{' '}
            <span className="bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent">
              &amp; Legal Disclaimer
            </span>
          </h1>

          <div className="grid grid-cols-1 gap-x-6 gap-y-5 border-b border-[#1c2a3d] pb-6 text-[13px] leading-[1.6] sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <MetaIcon>
                <svg
                  className="h-[21px] w-[21px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <rect x="3.5" y="5" width="17" height="15" rx="2" />
                  <path
                    strokeLinecap="round"
                    d="M7.5 3.5v3M16.5 3.5v3M4 9.5h16"
                  />
                </svg>
              </MetaIcon>

              <p>
                <span className="mb-2 block text-slate-400">
                  Effective Date:
                </span>
                <span className="text-slate-200">October 27, 2026</span>
              </p>
            </div>

            <div className="flex items-start gap-3 border-[#203047] sm:border-l sm:pl-5">
              <MetaIcon>
                <svg
                  className="h-[21px] w-[21px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 3.5h7l4.5 4.5v12a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 3.8V8h4.2M8.5 12h7M8.5 15.5h7"
                  />
                </svg>
              </MetaIcon>

              <p>
                <span className="mb-2 block text-slate-400">
                  Last Revised:
                </span>
                <span className="text-slate-200">
                  Academic Session 2026–2027
                </span>
              </p>
            </div>

            <div className="flex items-start gap-3 border-[#203047] sm:border-l sm:pl-5">
              <MetaIcon>
                <svg
                  className="h-[22px] w-[22px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="8" r="3" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.5 19v-1.2a5.5 5.5 0 0 1 11 0V19M16 5.5a3 3 0 0 1 0 5.8M17.5 14a4.5 4.5 0 0 1 3 4.2V19"
                  />
                </svg>
              </MetaIcon>

              <p>
                <span className="mb-2 block text-slate-400">
                  Applicable Community:
                </span>
                <span className="text-slate-200">MIT-WPU Pune</span>
              </p>
            </div>

            <div className="flex items-start gap-3 border-[#203047] sm:border-l sm:pl-5">
              <MetaIcon>
                <svg
                  className="h-[22px] w-[22px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z"
                  />
                  <circle cx="12" cy="10" r="2.2" />
                </svg>
              </MetaIcon>

              <p>
                <span className="mb-2 block text-slate-400">
                  Jurisdiction:
                </span>
                <span className="text-slate-200">
                  Pune, Maharashtra, India
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Introductory legal notice */}
        <div className="mb-7 sm:mb-8 flex gap-5 sm:gap-6 rounded-2xl border border-[#2863a1] bg-gradient-to-br from-[#12243a] to-[#0b1524] px-6 py-5 sm:px-7 sm:py-6 shadow-lg shadow-black/10">
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-400/15 text-blue-300"
            aria-hidden="true"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 10.5v5M12 7.5h.01" />
            </svg>
          </span>

          <p className="text-[12px] sm:text-[13px] font-medium uppercase leading-[2] tracking-[0.055em] text-blue-100/90">
            PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE ACCESSING OR
            USING WAYZA. BY REGISTERING AN ACCOUNT, ACCESSING THE WEB
            APPLICATION, OR COORDINATING SHARED TRAVEL VIA THE PLATFORM, YOU
            EXPRESSLY ACKNOWLEDGE AND AGREE TO BE BOUND BY ALL TERMS,
            CONDITIONS, POLICIES, AND DISCLAIMERS STATED HEREIN. IF YOU DO NOT
            AGREE WITH THESE TERMS IN THEIR ENTIRETY, YOU MUST IMMEDIATELY
            DISCONTINUE USE OF THE SERVICE.
          </p>
        </div>

        <div className="space-y-8 sm:space-y-10 text-slate-300">
          {/* 1. Platform and intermediary status */}
          <section className={clauseClass}>
            <SectionHeading>
              1. Nature of the Platform &amp; Technical Intermediary Status
            </SectionHeading>

            <div className="space-y-5 sm:space-y-6 pl-0">
              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  1.1
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Informational Utility
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Wayza (&ldquo;Platform&rdquo;) is an independent, student-built
                    peer-discovery utility developed exclusively for verified
                    university students (such as the MIT World Peace University
                    community) to connect with peers heading toward common
                    geographic destinations.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  1.2
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Intermediary Safe Harbor (Section 79, IT Act, 2000)
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Wayza operates strictly as an &ldquo;intermediary&rdquo; as
                    defined under Section 2(1)(w) of the Information Technology
                    Act, 2000 (India). In accordance with Section 79 of the
                    Information Technology Act, 2000, Wayza is an electronic
                    communication platform that merely facilitates voluntary
                    peer-to-peer interactions and transmission of user-submitted
                    information without initiating, selecting, or modifying the
                    transmission.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  1.3
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Non-Transportation Provider Status
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Wayza is{' '}
                    <strong className="font-semibold text-slate-100">not</strong>{' '}
                    a motor cab aggregator, transport operator, logistics
                    contractor, or taxi fleet service. Wayza does not own, lease,
                    operate, or inspect motor vehicles, nor does it employ,
                    dispatch, license, or hire drivers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  1.4
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Independent Third-Party Contracts
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Any transportation vehicle engaged by students (including
                    auto-rickshaws, app-based cabs, private taxis, or personal
                    vehicles) constitutes a direct, private contractual agreement
                    exclusively between the passengers and the respective driver
                    or transport operator. Wayza is not a party to that
                    transaction.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Payment disclaimers */}
          <section className={clauseClass}>
            <SectionHeading>
              2. Zero Monetary Responsibility &amp; Payment Disclaimers
            </SectionHeading>

            <div className="space-y-5 sm:space-y-6 pl-0">
              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  2.1
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Total Absence of Payment Processing
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Wayza does{' '}
                    <strong className="font-semibold text-slate-100">not</strong>{' '}
                    collect, process, hold, manage, or escrow money of any kind.
                    The Platform does not integrate payment gateways, merchant
                    accounts, credit facilities, or wallet infrastructures. Wayza
                    charges{' '}
                    <strong className="font-semibold text-slate-100">
                      zero commission
                    </strong>{' '}
                    and{' '}
                    <strong className="font-semibold text-slate-100">
                      zero platform fees
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  2.2
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Peer-to-Peer External Settlements
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Any UPI identifiers, payment QR codes, or settlement figures
                    discussed or exchanged within chat sessions are external and
                    strictly between users. All financial settlements occur
                    independently through third-party banking apps (such as Google
                    Pay, PhonePe, Paytm, or cash). Wayza has no visibility into,
                    custody of, or control over these external transactions.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  2.3
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Non-Payment &amp; Default Risk
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Wayza does not guarantee or warranty that fellow passengers
                    will pay their agreed share of any transport fare. Each
                    student assumes the sole risk of peer non-payment or default.
                    Wayza cannot recover unpaid funds, mediate financial disputes,
                    or act as a collection agent under any circumstances.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  2.4
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Advisory Fare Estimations
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Any split calculations or fare estimations displayed within
                    the app are non-binding mathematical approximations provided
                    solely for convenience. Students remain entirely responsible
                    for settling actual commercial fares charged by third-party
                    drivers.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Transit safety */}
          <section className={clauseClass}>
            <SectionHeading>
              3. Transit Safety &amp; Assumption of Risk
            </SectionHeading>

            <div className="space-y-5 sm:space-y-6 pl-0">
              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  3.1
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Inherent Transit Hazards
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Motor vehicle transit involves inherent risks, including road
                    accidents, collisions, vehicle breakdowns, bodily injury, and
                    death. By voluntarily using Wayza to coordinate travel with
                    other students, you expressly assume all risks associated with
                    your travel.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  3.2
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Driver Conduct &amp; Competence
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Wayza exercises no supervision, screening, background checks,
                    or control over third-party drivers or motor vehicles. Wayza
                    disclaims all liability for the driving conduct, sobriety,
                    licensing, vehicular roadworthiness, or criminal actions of any
                    third-party driver or vehicle operator.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  3.3
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Personal Belongings
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Wayza assumes no responsibility or liability for lost, stolen,
                    damaged, or misplaced personal baggage, electronics,
                    identification documents, or valuables during transit or
                    pickup coordination.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  3.4
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Delays &amp; Academic Consequences
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Wayza is not liable for travel delays caused by traffic
                    congestion, vehicular failure, adverse weather, or route
                    detours. The Platform disclaims all liability for resulting
                    damages, including missed academic lectures, university
                    examinations, flight/train departures, or financial
                    appointments.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Eligibility and conduct */}
          <section className={clauseClass}>
            <SectionHeading>
              4. User Eligibility &amp; Campus Code of Conduct
            </SectionHeading>

            <div className="space-y-5 sm:space-y-6 pl-0">
              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  4.1
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Institutional Authentication
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Access to Wayza is strictly restricted to currently enrolled
                    students possessing a valid institutional email address ending
                    in{' '}
                    <code className="rounded bg-[#111d2e] px-1.5 py-0.5 font-mono text-[12px] text-blue-300">
                      @mitwpu.edu.in
                    </code>
                    . Account access is revoked automatically upon student
                    graduation, de-enrollment, or suspension.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  4.2
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Zero Tolerance for Misconduct
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Users must treat co-passengers with dignity and respect. The
                    Platform enforces a strict zero-tolerance policy against:
                  </p>
                </div>
              </div>

              <ul className="ml-6 list-disc space-y-4 pl-2 text-[15px] sm:text-[16px] leading-[1.95] marker:text-blue-400">
                <li>Harassment, stalking, intimidation, or hate speech;</li>
                <li>Unwelcome physical conduct or sexual harassment;</li>
                <li>
                  Substance abuse, intoxication, or carriage of illicit
                  substances during shared transit;
                </li>
                <li>Fraudulent split claims, non-payment, or financial deception.</li>
              </ul>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  4.3
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Institutional &amp; Legal Escalation
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Violations of this Code of Conduct will result in immediate and
                    permanent account deactivation. Furthermore, Wayza reserves
                    the explicit right to report verified incidents, audit trails,
                    and user credentials to the{' '}
                    <strong className="font-semibold text-slate-100">
                      MIT-WPU Disciplinary Committee
                    </strong>{' '}
                    and local law enforcement authorities (Pune Police).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  4.4
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Account Integrity
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    You are solely responsible for all activities conducted under
                    your authenticated credentials. You may not sell, transfer,
                    share, or allow third parties to use your account.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Location and privacy */}
          <section className={clauseClass}>
            <SectionHeading>
              5. Ephemeral Location Data &amp; Privacy
            </SectionHeading>

            <div className="space-y-5 sm:space-y-6 pl-0">
              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  5.1
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    Temporary Session Retention
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Geographic coordinates and pickup points provided by users are
                    stored ephemerally in volatile memory solely to facilitate
                    real-time peer matching and active chat coordination.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[56px_minmax(0,1fr)] gap-x-4 sm:gap-x-6 items-start">
                <span className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-lg border border-[#2863a1] bg-[#0c1a2c] px-2 text-[15px] font-bold tracking-tight text-blue-400 shadow-sm shadow-blue-950/30">
                  5.2
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-blue-400">
                    No Persistent Historical Tracking
                  </h3>
                  <p className="text-[15px] sm:text-[16px] leading-[1.8] sm:leading-[1.85] text-slate-300">
                    Wayza does not build, store, or sell persistent historical GPS
                    breadcrumb trails of students&rsquo; everyday movement. Once a
                    ride session or active match concludes, real-time location
                    telemetry is expunged from active caches in accordance with
                    our data retention practices.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 6. Disclaimer of warranties */}
          <section className={clauseClass}>
            <SectionHeading>6. Disclaimer of Warranties</SectionHeading>

            <div className="space-y-6 sm:space-y-7 rounded-2xl border border-[#20334c] bg-[#0b1422]/85 p-5 sm:p-7">
              <p className="text-[12px] sm:text-[13px] leading-[2] tracking-[0.035em] text-slate-400">
                THE PLATFORM, ITS FEATURES, AND ALL CONTENT ARE PROVIDED ON AN
                &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE
                MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, WAYZA AND ITS
                STUDENT CREATORS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED,
                INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
                NON-INFRINGEMENT.
              </p>

              <p className="text-[12px] sm:text-[13px] leading-[2] tracking-[0.035em] text-slate-400">
                WAYZA DOES NOT WARRANT THAT (A) THE PLATFORM WILL MEET YOUR
                REQUIREMENTS; (B) ACCESS WILL BE UNINTERRUPTED, TIMELY, SECURE,
                OR ERROR-FREE; OR (C) FELLOW USERS OR THIRD-PARTY DRIVERS ARE
                TRUSTWORTHY, LICENSED, OR SAFE.
              </p>
            </div>
          </section>

          {/* 7. Limitation of liability */}
          <section className={clauseClass}>
            <SectionHeading>7. Limitation of Liability</SectionHeading>

            <div className="space-y-6 sm:space-y-7 rounded-2xl border border-[#20334c] bg-[#0b1422]/85 p-5 sm:p-7">
              <p className="text-[12px] sm:text-[13px] leading-[2] tracking-[0.035em] text-slate-400">
                TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, IN NO
                EVENT SHALL WAYZA, ITS STUDENT DEVELOPERS, SYSTEM OPERATORS,
                VOLUNTEERS, OR AFFILIATED INSTITUTIONS BE LIABLE FOR ANY
                DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR
                CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF MONEY, PERSONAL
                INJURY, BODILY HARM, EMOTIONAL DISTRESS, LOSS OF REPUTATION, OR
                DELAY) ARISING OUT OF OR IN CONNECTION WITH:
              </p>

              <ul className="ml-5 list-disc space-y-4 text-[12px] sm:text-[13px] leading-[2] tracking-[0.025em] text-slate-400 marker:text-blue-300">
                <li>YOUR ACCESS TO, USE OF, OR INABILITY TO USE THE PLATFORM;</li>
                <li>
                  THE CONDUCT, OMISSIONS, OR ACTS OF ANY CO-PASSENGER,
                  THIRD-PARTY DRIVER, OR VEHICLE OPERATOR;
                </li>
                <li>
                  ANY PAYMENT DISPUTE, NON-PAYMENT, OR DEFAULT OCCURRING
                  BETWEEN USERS;
                </li>
                <li>
                  VEHICULAR ACCIDENTS, ROAD HAZARDS, OR PHYSICAL INCIDENTS
                  OCCURRING DURING COMMUTES.
                </li>
              </ul>
            </div>
          </section>

          {/* 8. Indemnification */}
          <section className={clauseClass}>
            <SectionHeading>8. Indemnification</SectionHeading>

            <p className={`${paragraphClass} pl-0.5`}>
              You agree to indemnify, defend, and hold harmless Wayza, its
              developers, project managers, student contributors, and academic
              affiliates from and against any and all claims, liabilities,
              damages, losses, costs, and legal expenses (including reasonable
              attorney fees) arising from: (a) your use of the Platform; (b)
              your violation of these Terms; (c) your interactions or disputes
              with other students or third-party drivers; or (d) your violation
              of any applicable municipal, state, or national laws.
            </p>
          </section>

          {/* 9. Governing law */}
          <section className={clauseClass}>
            <SectionHeading>
              9. Governing Law &amp; Exclusive Jurisdiction
            </SectionHeading>

            <p className={`${paragraphClass} pl-0.5`}>
              These Terms of Service and any dispute or controversy arising
              out of or relating to the Platform shall be governed by and
              construed in accordance with the substantive laws of the{' '}
              <strong className="font-semibold text-slate-100">
                Republic of India
              </strong>
              . You irrevocably agree that the competent courts situated in{' '}
              <strong className="font-semibold text-slate-100">
                Pune, Maharashtra, India
              </strong>{' '}
              shall have sole and exclusive jurisdiction over any legal
              proceeding arising out of or related to these Terms.
            </p>
          </section>

          {/* 10. Modifications */}
          <section className={clauseClass}>
            <SectionHeading>10. Modifications &amp; Severability</SectionHeading>

            <p className={`${paragraphClass} pl-0.5`}>
              Wayza reserves the right to revise or replace these Terms at any
              time. Updated versions will be published directly on this page
              with a revised &ldquo;Last Revised&rdquo; timestamp. Continued
              use of Wayza following any modifications constitutes full
              acceptance of the revised Terms. If any provision of these Terms
              is deemed unlawful, void, or unenforceable, that provision shall
              be severable without affecting the validity and enforceability
              of the remaining provisions.
            </p>
          </section>

          {/* 11. Contact */}
          <section className={clauseClass}>
            <SectionHeading>11. Contact &amp; Grievance Inquiries</SectionHeading>

            <p className={`${paragraphClass} pl-0.5`}>
              For legal inquiries, safety reports, or terms clarification,
              please contact the student governance project team via the
              in-app reporting utility or through designated institutional
              campus channels.
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-14 sm:mt-16 flex flex-col items-center justify-center gap-6 border-t border-[#1d2a3c] pt-8 sm:pt-10 text-center text-[12px] text-slate-500">
          <p>© 2026 Wayza Student Mobility. MIT-WPU Pune Community.</p>

          <button
            type="button"
            onClick={() => navigate("/home")}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#30445f] bg-[#111d2e] px-7 py-3 text-sm font-semibold text-slate-100 shadow-lg shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400/70 hover:bg-[#192a40] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
          >
            Return to Application
          </button>
        </footer>
      </main>
    </div>
  );
}