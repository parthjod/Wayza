import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { userApi } from '../api/user.api';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import { OTPInput } from '../components/ui/OTPInput';
import { Spinner } from '../components/ui/Spinner';
import { isValidPhone, normalizePhone } from '../utils/phone';
import { LOGIN_BG_VIDEO, LOADING_LINES } from '../utils/constants';

type FlowState =
  | 'idle'
  | 'checking'
  | 'login-otp'
  | 'signup-name'
  | 'signup-email'
  | 'signup-otp';

export default function Landing() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { showToast } = useToast();

  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [userName, setUserName] = useState('');
  const [loadingLineIndex, setLoadingLineIndex] = useState(0);

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [otpLoading, setOtpLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    userApi
      .getMe()
      .then((data) => {
        setUser({
          id: data.id,
          fullName: data.fullName,
          profilePicUrl: data.profilePicUrl,
        });
        navigate('/home', { replace: true });
      })
      .catch(() => {
        // Not authenticated or stale session — wipe local state and stay on auth landing page
        if (user) {
          useAuthStore.getState().clearUser();
        }
      });
  }, [navigate, setUser, user]);

  // Rotate loading lines
  useEffect(() => {
    if (flowState !== 'checking') return;
    const interval = setInterval(() => {
      setLoadingLineIndex((prev) => (prev + 1) % LOADING_LINES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [flowState]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Strip everything except digits
    let digits = val.replace(/\D/g, '');

    // If user pasted with country code
    if (digits.length > 10 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length > 10 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    // Cap at 10 digits
    digits = digits.slice(0, 10);

    // Format with space after 5 digits (e.g., "98765 43210")
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }

    setPhone(formatted);
    if (phoneError) setPhoneError('');
  };

  const handleCheckPhone = async () => {
    const normalized = normalizePhone(phone);
    if (!isValidPhone(normalized)) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      return;
    }
    setPhoneError('');
    setFlowState('checking');

    try {
      const result = await authApi.checkPhone(normalized);
      if (result.registered) {
        setUserName(result.userName || '');
        setPhone(normalized);
        setFlowState('login-otp');
      } else {
        setPhone(normalized);
        setFlowState('signup-name');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Something went wrong';
      showToast(msg, 'error');
      setFlowState('idle');
    }
  };

  const handleVerifyOTP = async (otpString: string, flow: 'login' | 'signup') => {
    setOtpLoading(true);
    try {
      const result = await authApi.verifyOTP(normalizePhone(phone), otpString, flow);
      setUser(result.user);
      showToast('Welcome to Wayza! 🚗', 'success');
      navigate('/home', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid OTP';
      showToast(msg, 'error');
      setOtp(Array(6).fill(''));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignupInitiate = async (emailOverride?: string) => {
    const targetEmail = (emailOverride ?? collegeEmail).trim();
    if (!targetEmail.includes('@') || !targetEmail.endsWith('mitwpu.edu.in')) {
      showToast('Please use your @mitwpu.edu.in email', 'error');
      return;
    }
    setSignupLoading(true);
    try {
      await authApi.signupInitiate(normalizePhone(phone), fullName.trim(), targetEmail);
      setFlowState('signup-otp');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Signup failed';
      showToast(msg, 'error');
    } finally {
      setSignupLoading(false);
    }
  };

  const phoneInputRef = useRef<HTMLInputElement>(null);

  const handleEnterWayza = () => {
    if (phone && isValidPhone(normalizePhone(phone))) {
      handleCheckPhone();
    } else {
      phoneInputRef.current?.focus();
    }
  };

  const closeFlow = () => {
    setFlowState('idle');
    setOtp(Array(6).fill(''));
  };

  // Render the current flow state overlay
  const renderOverlay = () => {
    if (flowState === 'login-otp') {
      return (
        <div className="otp-modal-wrapper">
          <div className="otp-modal-scrim" onClick={closeFlow} />
          <div className="otp-modal-card animate-fade-in-up">
            <button
              onClick={closeFlow}
              className="otp-modal-close"
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="otp-modal-heading">Welcome back, {userName} 👋</h2>
            <p className="otp-modal-subtitle">Enter the 6-digit code sent to your registered email & phone</p>
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={(val: string) => handleVerifyOTP(val, 'login')}
            />
            {otpLoading && <Spinner className="mx-auto mt-6" />}
            <button
              onClick={() => handleVerifyOTP(otp.join(''), 'login')}
              disabled={otp.some((d) => !d) || otpLoading}
              className="otp-modal-go-btn"
            >
              <span>Go</span>
              <span style={{ fontSize: '19px', lineHeight: 1 }}>→</span>
            </button>
            <button
              onClick={closeFlow}
              className="otp-modal-back"
            >
              ← Back
            </button>
          </div>
        </div>
      );
    }

    if (flowState === 'signup-name') {
      return (
        <div className="signup-name-wrapper">
          {/* Light scrim — keeps landscape visible */}
          <div className="signup-name-scrim" onClick={closeFlow} />

          {/* Glass modal */}
          <div className="signup-name-card animate-slide-in-right">
            {/* Close button */}
            <button
              className="signup-name-close"
              onClick={closeFlow}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Heading */}
            <h2 className="signup-name-heading">
              Looks like you're new to{' '}
              <span style={{ color: '#5bbef7' }}>Wayza.</span>
            </h2>

            {/* Full Name Input */}
            <div className="signup-name-input-wrap">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (fullName.trim().length < 2) {
                      showToast('Name must be at least 2 characters', 'error');
                      return;
                    }
                    setFlowState('signup-email');
                  }
                }}
                placeholder="Your full name"
                className="signup-name-input"
                autoFocus
                maxLength={100}
              />
              {fullName && (
                <button
                  type="button"
                  onClick={() => setFullName('')}
                  className="signup-name-clear"
                  aria-label="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Go button */}
            <button
              onClick={() => {
                if (fullName.trim().length < 2) {
                  showToast('Name must be at least 2 characters', 'error');
                  return;
                }
                setFlowState('signup-email');
              }}
              className="signup-name-go-btn"
            >
              <span>Go</span>
              <span style={{ fontSize: '19px', lineHeight: 1 }}>→</span>
            </button>

            {/* Back link */}
            <button
              onClick={closeFlow}
              className="signup-name-back"
            >
              ← Back
            </button>
          </div>
        </div>
      );
    }

    if (flowState === 'signup-email') {
      return (
        <div className="signup-name-wrapper">
          {/* Light scrim — keeps landscape visible */}
          <div className="signup-name-scrim" onClick={closeFlow} />

          {/* Glass modal */}
          <div className="signup-name-card animate-slide-in-right">
            {/* Close button */}
            <button
              className="signup-name-close"
              onClick={closeFlow}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Heading */}
            <h2 className="signup-name-heading">Your college email</h2>

            {/* Email input + validation hint */}
            <div className="signup-name-input-wrap" style={{ marginBottom: 0 }}>
              <input
                type="email"
                value={collegeEmail}
                onChange={(e) => setCollegeEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSignupInitiate(collegeEmail);
                  }
                }}
                placeholder="name@mitwpu.edu.in"
                className="signup-name-input"
                autoFocus
                maxLength={254}
                disabled={signupLoading}
              />
              {collegeEmail && !signupLoading && (
                <button
                  type="button"
                  onClick={() => setCollegeEmail('')}
                  className="signup-name-clear"
                  aria-label="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Validation hint */}
            <p className="signup-email-hint">Must be an @mitwpu.edu.in email address</p>

            {/* Go button */}
            <button
              onClick={() => handleSignupInitiate(collegeEmail)}
              disabled={signupLoading}
              className="signup-name-go-btn"
            >
              {signupLoading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <span>Go</span>
                  <span style={{ fontSize: '19px', lineHeight: 1 }}>→</span>
                </>
              )}
            </button>

            {/* Back link */}
            <button
              onClick={() => setFlowState('signup-name')}
              disabled={signupLoading}
              className="signup-name-back"
            >
              ← Back
            </button>
          </div>
        </div>
      );
    }

    if (flowState === 'signup-otp') {
      return (
        <div className="otp-modal-wrapper">
          {/* Light scrim — keeps landscape visible */}
          <div className="otp-modal-scrim" onClick={closeFlow} />

          {/* Glass modal card */}
          <div className="otp-modal-card animate-slide-in-right">
            {/* Close button */}
            <button
              onClick={closeFlow}
              className="otp-modal-close"
              aria-label="Close"
            >
              ✕
            </button>

            {/* Heading */}
            <h2 className="otp-modal-heading">Check your inbox for the OTP ✉️</h2>

            {/* Subtitle */}
            <p className="otp-modal-subtitle">
              6-digit verification code sent to <span className="text-[#5bbef7] font-medium">{collegeEmail}</span>
            </p>

            {/* 6 OTP input boxes */}
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={(val: string) => handleVerifyOTP(val, 'signup')}
            />

            {otpLoading && <Spinner className="mx-auto mt-6" />}

            {/* Go button */}
            <button
              onClick={() => handleVerifyOTP(otp.join(''), 'signup')}
              disabled={otp.some((d) => !d) || otpLoading}
              className="otp-modal-go-btn"
            >
              <span>Go</span>
              <span style={{ fontSize: '19px', lineHeight: 1 }}>→</span>
            </button>

            {/* Back link */}
            <button
              onClick={() => setFlowState('signup-email')}
              className="otp-modal-back"
            >
              ← Back
            </button>
          </div>
        </div>
      );
    }

    return null;
  };


  return (
    <div className="relative min-h-screen">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="video-bg"
        poster=""
      >
        <source src={LOGIN_BG_VIDEO} type="video/mp4" />
      </video>

      {/* Atmospheric Scrim for video contrast */}
      <div className="video-scrim" />

      {/* Minimal Top Navbar */}
      <header style={{ marginTop: "10px" }} className={`fixed top-0 left-0 right-0 w-full flex items-center justify-between px-8 sm:px-12 md:px-14 py-7 sm:py-8 pointer-events-none ${(flowState === 'signup-name' || flowState === 'signup-email' || flowState === 'signup-otp' || flowState === 'login-otp') ? 'z-[52]' : 'z-40'}`}>
        {/* Brand Logo */}
        <div className="pointer-events-auto select-none">
          <span className="text-white text-[32px] sm:text-[36px] font-instrument tracking-[0.14em] drop-shadow-md leading-none select-none" style={{ marginLeft: "10px" }}>
            WAYZA
          </span>
        </div>

        {/* Action Button: Enter Wayza */}
        <button
          onClick={handleEnterWayza}
          className="wayza-nav-btn pointer-events-auto cursor-pointer"
          style={{
            width: "200px",
            marginRight: "15px",
            height: "46px",
            padding: "0px 20px",
            background: "#F5F7FA",
            color: "#111827",
            border: "1px solid #D1D5DB",
            borderRadius: "9999px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            fontSize: "18px",
            fontWeight: "500",
            lineHeight: "1",
            boxSizing: "border-box",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          <span>Enter Wayza</span>

          <span
            style={{
              fontSize: "26px",
              fontWeight: "400",
              lineHeight: "1",
              marginRight: "10px"
            }}
          >
            →
          </span>
        </button>
      </header>

      {/* Main Center Box Section */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 py-16">
        <div
          className={`wayza-login-card relative mx-auto text-center transition-all duration-300 ${
            flowState !== 'idle' && flowState !== 'checking'
              ? 'hidden'
              : 'animate-fade-in-up'
          }`}
        >
          {/* Badge */}
          <div className="wayza-badge">
            <span className="wayza-badge-dot" />
            <span>MIT-WPU Campus Rides</span>
          </div>

          {/* Title */}
          <h1 className="text-[24px] sm:text-[28px] font-instrument italic text-white leading-[1.15] tracking-normal" style={{ marginBottom: '8px' }}>
            Let's check if you're part of the{' '}
            <span className="text-[#5bbef7] italic">Wayza crew.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-white/65 text-[14px] sm:text-[16px] font-normal tracking-normal leading-[1.4]" style={{ marginBottom: '22px' }}>
            Enter your mobile number to sign in or get started
          </p>

          {/* Phone Input Box (Pill Shape) */}
          <div className="w-full" style={{ marginBottom: '14px' }}>
            <div
              className={`wayza-phone-pill relative flex items-center w-full px-5 sm:px-6 shadow-inner ${phoneError
                ? 'border-red-400/80 bg-red-500/[0.08] ring-2 ring-red-400/20'
                : ''
                }`}
            >
              {/* Indian Flag SVG & Country Code */}
              <div className="flex items-center gap-2 select-none flex-shrink-0" style={{ marginLeft: "15px" }}>
                <svg
                  className="w-6 h-4 rounded-[3px] overflow-hidden shadow-sm flex-shrink-0"
                  viewBox="0 0 24 16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="24" height="5.33" fill="#FF9933" />
                  <rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
                  <rect y="10.67" width="24" height="5.33" fill="#138808" />
                  <circle cx="12" cy="8" r="2.2" fill="none" stroke="#000080" strokeWidth="0.6" />
                  <circle cx="12" cy="8" r="0.6" fill="#000080" />
                </svg>
                <span className="tracking-wide text-white font-medium text-[16px] sm:text-[17px]">
                  +91
                </span>
                {/* Down chevron */}
                <svg
                  className="w-3.5 h-3.5 text-white/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}

                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              <div style={{ marginLeft: "15px" }}
                className="h-6 w-[1px] bg-white/20 flex-shrink-0"
              />

              {/* Input field */}
              <input style={{ marginLeft: "15px", outline: "none", boxShadow: "none", border: "none" }}
                ref={phoneInputRef}
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                placeholder=""
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckPhone()}
                className="w-full bg-transparent border-none text-white text-[17px] sm:text-[18px] tracking-wide placeholder:text-white/40 pl-8 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 font-normal disabled:opacity-50"
                disabled={flowState === 'checking'}
              />

              {phone && flowState !== 'checking' && (
                <button style={{ marginRight: "15px" }}
                  type="button"
                  onClick={() => {
                    setPhone('');
                    setPhoneError('');
                    phoneInputRef.current?.focus();
                  }}
                  className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 text-white/70 hover:text-white flex items-center justify-center transition-colors text-xs flex-shrink-0 cursor-pointer ml-2"
                  aria-label="Clear input"
                >
                  ✕
                </button>
              )}
            </div>

            {phoneError && (
              <p className="mt-2.5 text-xs text-red-400 font-medium text-left flex items-center gap-1.5 px-4 animate-fade-in-up">
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{phoneError}</span>
              </p>
            )}
          </div>

          {/* Button / Checking State */}
          {flowState === 'checking' ? (
            <div className="w-full py-4 px-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center gap-3">
              <Spinner size="md" />
              <p className="text-white/80 text-sm font-medium animate-pulse">
                {LOADING_LINES[loadingLineIndex]}
              </p>
            </div>
          ) : (
            <button
              onClick={handleCheckPhone}
              className="wayza-continue-btn group w-full text-white font-semibold text-[18px] cursor-pointer flex items-center justify-center gap-2.5"
            >
              <span>Continue</span>
              <span className="text-[19px] leading-none transition-transform duration-200 group-hover:translate-x-1">→</span>
            </button>
          )}

          {/* Card Footer */}
          <div className="flex items-center justify-center gap-2 text-[13px] sm:text-[14px] text-white/60" style={{ marginTop: '18px' }}>
            <svg
              className="w-4 h-4 text-[#00e599] flex-shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                clipRule="evenodd"
              />
            </svg>
            <span>Instant phone verification • Exclusively for MIT-WPU</span>
          </div>
        </div>
      </main>

      {/* About Section */}
      <section
        id="about-section"
        className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 py-16"
      >
        <div
          className="glass-card w-full max-w-[720px] animate-fade-in-up"
          style={{
            padding: "32px 38px 28px",
            borderRadius: "24px",
            boxSizing: "border-box",
          }}
        >
          {/* Heading */}
          <h2
            className="font-instrument text-white"
            style={{
              fontSize: "36px",
              lineHeight: "1.15",
              margin: "0 0 20px 0",
            }}
          >
            About Wayza
          </h2>

          {/* Description */}
          <p
            className="text-white/70"
            style={{
              fontSize: "16px",
              lineHeight: "1.6",
              margin: "0 0 24px 0",
            }}
          >
            Wayza is a ride-sharing coordination platform built exclusively for
            MIT-WPU students. We help you find fellow students heading the same
            direction, connect instantly, share a ride, split the fare — and get to
            campus smarter, cheaper, and safer.
          </p>

          {/* How it works */}
          <h3
            className="font-instrument text-white"
            style={{
              fontSize: "21px",
              lineHeight: "1.3",
              margin: "0 0 14px 0",
            }}
          >
            How it works:
          </h3>

          {/* Steps */}
          <ul
            className="text-white/70"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              margin: 0,
              padding: 0,
              listStyle: "none",
              fontSize: "15.5px",
              lineHeight: "1.5",
            }}
          >
            <li>
              → Check in with your destination and how far you want to search.
            </li>

            <li>
              → Wayza finds students nearby heading the same way.
            </li>

            <li>
              → Connect, chat, and decide to go together.
            </li>

            <li>
              → Once you've agreed, start the journey together.
            </li>

            <li>
              → At the end, split the fare fairly — Wayza calculates your share
              automatically.
            </li>

            <li>
              → Rate the experience. Keep the community safe.
            </li>
          </ul>

          {/* Footer */}
          <p
            className="text-white/40 italic font-instrument"
            style={{
              margin: "20px 0 0 0",
              fontSize: "15px",
              lineHeight: "1.4",
            }}
          >
            Built for students, by students.
          </p>
        </div>
      </section>

      {/* Flow Overlays */}
      {renderOverlay()}
    </div>
  );
}
