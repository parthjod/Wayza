import { useNavigate } from 'react-router-dom';

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
    <div className="min-h-screen w-full bg-[#080c14] text-slate-300 antialiased selection:bg-blue-500/20 selection:text-white">
      {/* Minimal Formal Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-[#080c14]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>
            <span className="font-instrument text-2xl italic tracking-tight text-white select-none pl-2">
              Wayza
            </span>
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Legal Terms &amp; Policies
          </span>
        </div>
      </header>

      {/* Main Legal Document Content */}
      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16 sm:px-8">
        
        {/* Document Header */}
        <div className="mb-8 pb-6 border-b border-slate-800">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Terms of Service &amp; Legal Disclaimer
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
            <p><strong>Effective Date:</strong> October 27, 2026</p>
            <p><strong>Last Updated:</strong> October 2026</p>
            <p><strong>Jurisdiction:</strong> Pune, Maharashtra, India</p>
            <p><strong>Community:</strong> MIT-WPU Student Body</p>
          </div>
        </div>

        {/* Formal Legal Preamble Callout */}
        <div className="my-6 border-l-2 border-slate-600 bg-slate-900/60 p-4 text-xs sm:text-[13px] leading-relaxed text-slate-300 uppercase tracking-wide">
          PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE ACCESSING OR USING WAYZA.
          BY CREATING AN ACCOUNT, ACCESSING THE WEB APPLICATION, OR USING WAYZA TO DISCOVER
          TRAVEL PEERS, YOU EXPRESSLY AGREE TO BE BOUND BY ALL TERMS, CONDITIONS, AND
          DISCLAIMERS STATED HEREIN. IF YOU DO NOT AGREE TO THESE TERMS IN THEIR ENTIRETY,
          YOU ARE NOT AUTHORIZED TO USE THE PLATFORM.
        </div>

        <div className="space-y-8 text-[15px] leading-relaxed text-slate-300/90">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              1. Nature of the Platform &amp; Intermediary Classification
            </h2>
            <div className="space-y-3">
              <p>
                <strong>1.1 Informational Utility:</strong> Wayza (&ldquo;Platform&rdquo;) is an independent, student-built peer-discovery utility developed exclusively for verified university students (such as the MIT World Peace University community) to connect with peers heading toward common geographic destinations.
              </p>
              <p>
                <strong>1.2 Intermediary Safe Harbor (Section 79, IT Act, 2000):</strong> Wayza operates strictly as an &ldquo;intermediary&rdquo; as defined under Section 2(1)(w) of the Information Technology Act, 2000 (India). In accordance with Section 79 of the Information Technology Act, 2000, Wayza is an electronic communication platform that merely facilitates voluntary peer-to-peer interactions and transmission of user-submitted information without initiating, selecting, or modifying the transmission.
              </p>
              <p>
                <strong>1.3 Non-Transportation Provider Status:</strong> Wayza is <strong>not</strong> a motor cab aggregator, transport operator, logistics contractor, or taxi fleet service. Wayza does not own, lease, operate, or inspect motor vehicles, nor does it employ, dispatch, license, or hire drivers.
              </p>
              <p>
                <strong>1.4 Independent Third-Party Contracts:</strong> Any transportation vehicle engaged by students (including auto-rickshaws, app-based cabs, private taxis, or personal vehicles) constitutes a direct, private contractual agreement exclusively between the passengers and the respective driver or transport operator. Wayza is not a party to that transaction.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              2. Zero Monetary Responsibility &amp; Payment Disclaimers
            </h2>
            <div className="space-y-3">
              <p>
                <strong>2.1 Total Absence of Payment Processing:</strong> Wayza does <strong>not</strong> collect, process, hold, manage, or escrow money of any kind. The Platform does not integrate payment gateways, merchant accounts, credit facilities, or wallet infrastructures. Wayza charges <strong>zero commission</strong> and <strong>zero platform fees</strong>.
              </p>
              <p>
                <strong>2.2 Peer-to-Peer External Settlements:</strong> Any UPI identifiers, payment QR codes, or settlement figures discussed or exchanged within chat sessions are external and strictly between users. All financial settlements occur independently through third-party banking apps (such as Google Pay, PhonePe, Paytm, or cash). Wayza has no visibility into, custody of, or control over these external transactions.
              </p>
              <p>
                <strong>2.3 Non-Payment &amp; Default Risk:</strong> Wayza does not guarantee or warranty that fellow passengers will pay their agreed share of any transport fare. Each student assumes the sole risk of peer non-payment or default. Wayza cannot recover unpaid funds, mediate financial disputes, or act as a collection agent under any circumstances.
              </p>
              <p>
                <strong>2.4 Advisory Fare Estimations:</strong> Any split calculations or fare estimations displayed within the app are non-binding mathematical approximations provided solely for convenience. Students remain entirely responsible for settling actual commercial fares charged by third-party drivers.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              3. Transit Safety &amp; Assumption of Risk
            </h2>
            <div className="space-y-3">
              <p>
                <strong>3.1 Inherent Transit Hazards:</strong> Motor vehicle transit involves inherent risks, including road accidents, collisions, vehicle breakdowns, bodily injury, and death. By voluntarily using Wayza to coordinate travel with other students, you expressly assume all risks associated with your travel.
              </p>
              <p>
                <strong>3.2 Driver Conduct &amp; Competence:</strong> Wayza exercises no supervision, screening, background checks, or control over third-party drivers or motor vehicles. Wayza disclaims all liability for the driving conduct, sobriety, licensing, vehicular roadworthiness, or criminal actions of any third-party driver or vehicle operator.
              </p>
              <p>
                <strong>3.3 Personal Belongings:</strong> Wayza assumes no responsibility or liability for lost, stolen, damaged, or misplaced personal baggage, electronics, identification documents, or valuables during transit or pickup coordination.
              </p>
              <p>
                <strong>3.4 Delays &amp; Academic Consequences:</strong> Wayza is not liable for travel delays caused by traffic congestion, vehicular failure, adverse weather, or route detours. The Platform disclaims all liability for resulting damages, including missed academic lectures, university examinations, flight/train departures, or financial appointments.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              4. User Eligibility &amp; Campus Code of Conduct
            </h2>
            <div className="space-y-3">
              <p>
                <strong>4.1 Institutional Authentication:</strong> Access to Wayza is strictly restricted to currently enrolled students possessing a valid institutional email address ending in <code className="font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">@mitwpu.edu.in</code>. Account access is revoked automatically upon student graduation, de-enrollment, or suspension.
              </p>
              <p>
                <strong>4.2 Zero Tolerance for Misconduct:</strong> Users must treat co-passengers with dignity and respect. The Platform enforces a strict zero-tolerance policy against:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-3 text-slate-300">
                <li>Harassment, stalking, intimidation, or hate speech;</li>
                <li>Unwelcome physical conduct or sexual harassment;</li>
                <li>Substance abuse, intoxication, or carriage of illicit substances during shared transit;</li>
                <li>Fraudulent split claims, non-payment, or financial deception.</li>
              </ul>
              <p>
                <strong>4.3 Institutional &amp; Legal Escalation:</strong> Violations of this Code of Conduct will result in immediate and permanent account deactivation. Furthermore, Wayza reserves the explicit right to report verified incidents, audit trails, and user credentials to the <strong>MIT-WPU Disciplinary Committee</strong> and local law enforcement authorities (Pune Police).
              </p>
              <p>
                <strong>4.4 Account Integrity:</strong> You are solely responsible for all activities conducted under your authenticated credentials. You may not sell, transfer, share, or allow third parties to use your account.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              5. Ephemeral Location Data &amp; Privacy
            </h2>
            <div className="space-y-3">
              <p>
                <strong>5.1 Temporary Session Retention:</strong> Geographic coordinates and pickup points provided by users are stored ephemerally in volatile memory solely to facilitate real-time peer matching and active chat coordination.
              </p>
              <p>
                <strong>5.2 No Persistent Historical Tracking:</strong> Wayza does not build, store, or sell persistent historical GPS breadcrumb trails of students&rsquo; everyday movement. Once a ride session or active match concludes, real-time location telemetry is expunged from active caches in accordance with our data retention practices.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              6. Disclaimer of Warranties
            </h2>
            <div className="space-y-3 text-xs sm:text-[13px] uppercase tracking-wide text-slate-400 border border-slate-800 bg-slate-900/40 p-4 leading-relaxed">
              <p>
                THE PLATFORM, ITS FEATURES, AND ALL CONTENT ARE PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, WAYZA AND ITS STUDENT CREATORS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
              </p>
              <p>
                WAYZA DOES NOT WARRANT THAT (A) THE PLATFORM WILL MEET YOUR REQUIREMENTS; (B) ACCESS WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; OR (C) FELLOW USERS OR THIRD-PARTY DRIVERS ARE TRUSTWORTHY, LICENSED, OR SAFE.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              7. Limitation of Liability
            </h2>
            <div className="space-y-3 text-xs sm:text-[13px] uppercase tracking-wide text-slate-400 border border-slate-800 bg-slate-900/40 p-4 leading-relaxed">
              <p>
                TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, IN NO EVENT SHALL WAYZA, ITS STUDENT DEVELOPERS, SYSTEM OPERATORS, VOLUNTEERS, OR AFFILIATED INSTITUTIONS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF MONEY, PERSONAL INJURY, BODILY HARM, EMOTIONAL DISTRESS, LOSS OF REPUTATION, OR DELAY) ARISING OUT OF OR IN CONNECTION WITH:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-3">
                <li>YOUR ACCESS TO, USE OF, OR INABILITY TO USE THE PLATFORM;</li>
                <li>THE CONDUCT, OMISSIONS, OR ACTS OF ANY CO-PASSENGER, THIRD-PARTY DRIVER, OR VEHICLE OPERATOR;</li>
                <li>ANY PAYMENT DISPUTE, NON-PAYMENT, OR DEFAULT OCCURRING BETWEEN USERS;</li>
                <li>VEHICULAR ACCIDENTS, ROAD HAZARDS, OR PHYSICAL INCIDENTS OCCURRING DURING COMMUTES.</li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              8. Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless Wayza, its developers, project managers, student contributors, and academic affiliates from and against any and all claims, liabilities, damages, losses, costs, and legal expenses (including reasonable attorney fees) arising from: (a) your use of the Platform; (b) your violation of these Terms; (c) your interactions or disputes with other students or third-party drivers; or (d) your violation of any applicable municipal, state, or national laws.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              9. Governing Law &amp; Dispute Resolution
            </h2>
            <p>
              These Terms of Service and any dispute or controversy arising out of or relating to the Platform shall be governed by and construed in accordance with the substantive laws of the <strong>Republic of India</strong>. You irrevocably agree that the competent courts situated in <strong>Pune, Maharashtra, India</strong> shall have sole and exclusive jurisdiction over any legal proceeding arising out of or related to these Terms.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              10. Modifications &amp; Severability
            </h2>
            <p>
              Wayza reserves the right to revise or replace these Terms at any time. Updated versions will be published directly on this page with a revised &ldquo;Last Updated&rdquo; timestamp. Continued use of Wayza following any modifications constitutes full acceptance of the revised Terms. If any provision of these Terms is deemed unlawful, void, or unenforceable, that provision shall be severable without affecting the validity and enforceability of the remaining provisions.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-3 pt-4 border-b border-slate-800/80 pb-2">
              11. Contact &amp; Grievance Inquiries
            </h2>
            <p>
              For legal inquiries, safety reports, or terms clarification, please contact the student governance project team via the in-app reporting utility or through designated institutional campus channels.
            </p>
          </section>

        </div>

        {/* Clean Formal Document Footer */}
        <footer className="mt-14 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Wayza Student Mobility. MIT-WPU Pune Community.</p>
          <button
            type="button"
            onClick={handleBack}
            className="text-slate-400 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
          >
            Return to Application
          </button>
        </footer>

      </main>
    </div>
  );
}
