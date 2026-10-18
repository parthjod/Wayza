import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { userApi } from '../api/user.api';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui/Toast';
import { OTPInput } from '../components/ui/OTPInput';
import { Spinner } from '../components/ui/Spinner';
import { normalizePhone, isValidPhone } from '../utils/phone';
import { LOGIN_BG_VIDEO, LOADING_LINES } from '../utils/constants';

type FlowState =
  | 'idle'
  | 'checking'
  | 'login-otp'
  | 'signup-name'
  | 'signup-otp';

export default function Landing() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const { showToast } = useToast();

  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [userName, setUserName] = useState('');
  const [loadingLineIndex, setLoadingLineIndex] = useState(0);

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [otpLoading, setOtpLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [signupToken, setSignupToken] = useState('');

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated on initial page load
  useEffect(() => {
    if (useAuthStore.getState().user) {
      navigate('/home', { replace: true });
      return;
    }
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
        // Not authenticated, stay on landing page
      });
  }, []);

  // Rotate loading lines while checking
  useEffect(() => {
    if (flowState !== 'checking') return;
    const interval = setInterval(() => {
      setLoadingLineIndex((prev) => (prev + 1) % LOADING_LINES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [flowState]);

  // Resend OTP countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const validateCollegeEmail = (val: string): boolean => {
    const clean = val.trim().toLowerCase();
    return clean.includes('@') && clean.endsWith('mitwpu.edu.in');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
    digits = digits.slice(0, 10);

    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    setPhone(formatted);
    if (phoneError) setPhoneError('');
  };

  const handleCheckEmail = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!validateCollegeEmail(cleanEmail)) {
      setEmailError('Please enter your valid @mitwpu.edu.in college email');
      return;
    }
    setEmailError('');
    setFlowState('checking');

    try {
      const result = await authApi.checkEmail(cleanEmail);
      setResendCooldown(30);
      setOtp(Array(6).fill(''));

      if (result.registered) {
        setUserName(result.userName || '');
        setFlowState('login-otp');
        showToast('6-digit OTP sent to your inbox ✉️', 'success');
      } else {
        setUserName('');
        setFlowState('signup-otp');
        showToast('Verification code sent to your inbox ✉️', 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Something went wrong';
      showToast(msg, 'error');
      setFlowState('idle');
    }
  };

  const handleSignupSubmit = async () => {
    if (fullName.trim().length < 2) {
      showToast('Name must be at least 2 characters', 'error');
      return;
    }

    let normalizedPhone: string | undefined = undefined;
    if (phone.trim()) {
      const p = normalizePhone(phone);
      if (!isValidPhone(p)) {
        setPhoneError('Please enter a valid 10-digit mobile number');
        return;
      }
      normalizedPhone = p;
    }

    setPhoneError('');
    setSignupLoading(true);
    try {
      const result = await authApi.signupComplete({
        collegeEmail: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        phone: normalizedPhone,
        signupToken,
      });

      setUser(result.user);
      showToast('Welcome to Wayza! 🚗', 'success');
      navigate('/home', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed';
      const code = err.response?.data?.code;
      if (code === 'phone_exists' || code === 'invalid_phone' || msg.toLowerCase().includes('phone')) {
        setPhoneError(msg);
      }
      showToast(msg, 'error');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleVerifyOTP = async (otpString: string, flow: 'login' | 'signup') => {
    setOtpLoading(true);
    try {
      const result = await authApi.verifyOTP(
        { email: email.trim().toLowerCase() },
        otpString,
        flow
      );

      if (flow === 'login' && result.user) {
        setUser(result.user);
        showToast('Welcome back to Wayza! 🚗', 'success');
        navigate('/home', { replace: true });
      } else if (flow === 'signup') {
        if (result.user) {
          // Direct login fallback
          setUser(result.user);
          showToast('Welcome to Wayza! 🚗', 'success');
          navigate('/home', { replace: true });
        } else {
          // Email verified! Transition to profile info modal
          setSignupToken(result.signupToken || '');
          setFlowState('signup-name');
          showToast('Email verified! Please complete your profile 🚀', 'success');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid OTP';
      showToast(msg, 'error');
      setOtp(Array(6).fill(''));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendOTP(email.trim().toLowerCase());
      setResendCooldown(30);
      setOtp(Array(6).fill(''));
      showToast('New verification code sent to your inbox ✉️', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to resend OTP';
      showToast(msg, 'error');
    }
  };

  const closeFlow = () => {
    setFlowState('idle');
    setOtp(Array(6).fill(''));
    setSignupToken('');
  };

  // Render the current flow state overlay
  const renderOverlay = () => {
    if (flowState === 'login-otp') {
      return (
        <div className="otp-modal-wrapper">
          <div className="otp-modal-scrim" onClick={closeFlow} />
          <div className="otp-modal-card animate-fade-in-up">
            <button onClick={closeFlow} className="otp-modal-close" aria-label="Close">
              ✕
            </button>
            <h2 className="otp-modal-heading">Welcome back{userName ? `, ${userName}` : ''} 👋</h2>
            <p className="otp-modal-subtitle">
              Enter the 6-digit code sent to <span className="text-[#5bbef7] font-medium">{email}</span>
            </p>
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={(val: string) => handleVerifyOTP(val, 'login')}
            />
            {otpLoading && <Spinner className="mx-auto mt-6" />}

            <div className="mt-4 text-center">
              {resendCooldown > 0 ? (
                <span className="text-white/40 text-xs">
                  Resend code in <span className="text-[#5bbef7]">{resendCooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-xs text-[#5bbef7] hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Didn't receive code? Resend OTP
                </button>
              )}
            </div>

            <button
              onClick={() => handleVerifyOTP(otp.join(''), 'login')}
              disabled={otp.some((d) => !d) || otpLoading}
              className="otp-modal-go-btn mt-6"
            >
              <span>Go</span>
              <span style={{ fontSize: '19px', lineHeight: 1 }}>→</span>
            </button>
            <button onClick={closeFlow} className="otp-modal-back">
              ← Back
            </button>
          </div>
        </div>
      );
    }

    if (flowState === 'signup-otp') {
      return (
        <div className="otp-modal-wrapper">
          <div className="otp-modal-scrim" onClick={closeFlow} />
          <div className="otp-modal-card animate-slide-in-right">
            <button onClick={closeFlow} className="otp-modal-close" aria-label="Close">
              ✕
            </button>

            <h2 className="otp-modal-heading">Verify your college email ✉️</h2>
            <p className="otp-modal-subtitle">
              6-digit verification code sent to <span className="text-[#5bbef7] font-medium">{email}</span>
            </p>

            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={(val: string) => handleVerifyOTP(val, 'signup')}
            />

            {otpLoading && <Spinner className="mx-auto mt-6" />}

            <div className="mt-4 text-center">
              {resendCooldown > 0 ? (
                <span className="text-white/40 text-xs">
                  Resend code in <span className="text-[#5bbef7]">{resendCooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-xs text-[#5bbef7] hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  Didn't receive code? Resend OTP
                </button>
              )}
            </div>

            <button
              onClick={() => handleVerifyOTP(otp.join(''), 'signup')}
              disabled={otp.some((d) => !d) || otpLoading}
              className="otp-modal-go-btn mt-6"
            >
              <span>Verify & Continue</span>
              <span style={{ fontSize: '19px', lineHeight: 1 }}>→</span>
            </button>

            <button onClick={closeFlow} className="otp-modal-back">
              ← Change Email
            </button>
          </div>
        </div>
      );
    }

    if (flowState === 'signup-name') {
      return (
        <div className="signup-name-wrapper">
          <div className="signup-name-scrim" onClick={closeFlow} />
          <div className="signup-name-card animate-slide-in-right">
            <button className="signup-name-close" onClick={closeFlow} aria-label="Close">
              ✕
            </button>

            <h2 className="signup-name-heading">
              Welcome to <span style={{ color: '#5bbef7' }}>Wayza.</span>
            </h2>
            <p className="text-white/60 text-sm mb-6 -mt-2">
              Email verified: <span className="text-[#5bbef7] font-medium">{email}</span> ✓
            </p>

            {/* Full Name Input */}
            <div className="signup-name-input-wrap mb-4">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="signup-name-input"
                autoFocus
                maxLength={100}
                disabled={signupLoading}
              />
              {fullName && !signupLoading && (
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

            {/* Mobile Number Input */}
            <div className="signup-name-input-wrap mb-2">
              <div className="flex items-center w-full relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignupSubmit()}
                  placeholder="Mobile number"
                  className="signup-name-input"
                  maxLength={15}
                  disabled={signupLoading}
                />
                {phone && !signupLoading && (
                  <button
                    type="button"
                    onClick={() => setPhone('')}
                    className="signup-name-clear"
                    aria-label="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {phoneError && (
              <p className="text-xs text-red-400 font-medium text-left mb-3 px-2">
                {phoneError}
              </p>
            )}

            {/* Continue Button */}
            <button
              onClick={handleSignupSubmit}
              disabled={signupLoading || fullName.trim().length < 2}
              className="signup-name-go-btn mt-2"
            >
              {signupLoading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <span>Continue</span>
                  <span style={{ fontSize: '19px', lineHeight: 1 }}>→</span>
                </>
              )}
            </button>

            {/* Brief note at bottom */}
            <p className="text-white/45 text-[12px] text-center mt-4 tracking-wide">
              No more OTPs — authentication is done through college email.
            </p>

            <button onClick={() => setFlowState('signup-otp')} className="signup-name-back mt-2">
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
      <header
        style={{ marginTop: '10px' }}
        className={`fixed top-0 left-0 right-0 w-full flex items-center justify-between px-8 sm:px-12 md:px-14 py-7 sm:py-8 pointer-events-none ${
          flowState !== 'idle' && flowState !== 'checking' ? 'z-[52]' : 'z-40'
        }`}
      >
        {/* Brand Logo */}
        <div className="pointer-events-auto select-none">
          <span
            className="text-white text-[32px] sm:text-[36px] font-instrument tracking-[0.14em] drop-shadow-md leading-none select-none"
            style={{ marginLeft: '10px' }}
          >
            WAYZA
          </span>
        </div>
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
          <h1
            className="text-[24px] sm:text-[28px] font-instrument italic text-white leading-[1.15] tracking-normal"
            style={{ marginBottom: '8px' }}
          >
            Let's check if you're part of the{' '}
            <span className="text-[#5bbef7] italic">Wayza crew.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-white/65 text-[14px] sm:text-[16px] font-normal tracking-normal leading-[1.4]"
            style={{ marginBottom: '22px' }}
          >
            Enter your official college email (<span className="text-[#5bbef7] font-medium">@mitwpu.edu.in</span>) to continue
          </p>

          {/* Email Input Box (Pill Shape) */}
          <div className="w-full" style={{ marginBottom: '14px' }}>
            <div
              className={`wayza-phone-pill relative flex items-center justify-center w-full px-8 shadow-inner ${
                emailError
                  ? 'border-red-400/80 bg-red-500/[0.08] ring-2 ring-red-400/20'
                  : ''
              }`}
            >
              {/* Input field */}
              <input
                style={{
                  outline: 'none',
                  boxShadow: 'none',
                  border: 'none',
                }}
                ref={emailInputRef}
                type="email"
                autoComplete="email"
                placeholder="name@mitwpu.edu.in"
                value={email}
                onChange={handleEmailChange}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
                className="w-full bg-transparent border-none text-white text-[16px] sm:text-[17px] tracking-wide placeholder:text-white/40 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 font-normal disabled:opacity-50 text-center placeholder:text-center"
                disabled={flowState === 'checking'}
              />

              {email && flowState !== 'checking' && (
                <button
                  type="button"
                  onClick={() => {
                    setEmail('');
                    setEmailError('');
                    emailInputRef.current?.focus();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 text-white/70 hover:text-white flex items-center justify-center transition-colors text-xs flex-shrink-0 cursor-pointer"
                  aria-label="Clear input"
                >
                  ✕
                </button>
              )}
            </div>

            {emailError && (
              <p className="mt-2.5 text-xs text-red-400 font-medium text-left flex items-center gap-1.5 px-4 animate-fade-in-up">
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{emailError}</span>
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
              onClick={handleCheckEmail}
              className="wayza-continue-btn group w-full text-white font-semibold text-[18px] cursor-pointer flex items-center justify-center gap-2.5"
            >
              <span>Continue</span>
              <span className="text-[19px] leading-none transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </button>
          )}

          {/* Card Footer */}
          <div
            className="flex items-center justify-center gap-2 text-[13px] sm:text-[14px] text-white/60"
            style={{ marginTop: '18px' }}
          >
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
            <span>Instant email verification • Exclusively for MIT-WPU</span>
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
            padding: '32px 38px 28px',
            borderRadius: '24px',
            boxSizing: 'border-box',
          }}
        >
          <h2
            className="font-instrument text-white"
            style={{
              fontSize: '36px',
              lineHeight: '1.15',
              margin: '0 0 20px 0',
            }}
          >
            About Wayza
          </h2>

          <p
            className="text-white/70"
            style={{
              fontSize: '16px',
              lineHeight: '1.6',
              margin: '0 0 24px 0',
            }}
          >
            Wayza is a ride-sharing coordination platform built exclusively for
            MIT-WPU students. We help you find fellow students heading the same
            direction, connect instantly, share a ride, split the fare — and get to
            campus smarter, cheaper, and safer.
          </p>

          <h3
            className="font-instrument text-white"
            style={{
              fontSize: '21px',
              lineHeight: '1.3',
              margin: '0 0 14px 0',
            }}
          >
            How it works:
          </h3>

          <ul
            className="text-white/70"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              margin: 0,
              padding: 0,
              listStyle: 'none',
              fontSize: '15.5px',
              lineHeight: '1.5',
            }}
          >
            <li>→ Check in with your destination and how far you want to search.</li>
            <li>→ Wayza finds students nearby heading the same way.</li>
            <li>→ Connect, chat, and decide to go together.</li>
            <li>→ Once you've agreed, start the journey together.</li>
            <li>→ At the end, split the fare fairly — Wayza calculates your share automatically.</li>
            <li>→ Rate the experience. Keep the community safe.</li>
          </ul>

          <p
            className="text-white/40 italic font-instrument"
            style={{
              margin: '20px 0 0 0',
              fontSize: '15px',
              lineHeight: '1.4',
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
