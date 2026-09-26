import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { Spinner } from '../components/ui/Spinner';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        await authApi.verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.error || 'Verification link is invalid or has expired.'
        );
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-wayza-dark px-4 py-12">
      <div className="w-full max-w-md bg-white/[0.06] border border-white/10 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl">
        <div className="font-instrument text-4xl text-white mb-2">WAYZA</div>
        <p className="text-white/60 text-xs tracking-widest uppercase mb-8">
          MIT-WPU Student Verification
        </p>

        {status === 'verifying' && (
          <div className="py-12 flex flex-col items-center">
            <Spinner size="lg" />
            <p className="mt-6 text-white/80 font-medium">Verifying your college email…</p>
            <p className="text-white/40 text-xs mt-2">Checking domain and cryptographic signature</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-instrument text-2xl text-white mb-3">Email Verified!</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-8">
              Your <span className="text-white font-medium">@mitwpu.edu.in</span> email is verified.
              You now have full verified access to find rides, join groups, and share journeys.
            </p>
            <button
              onClick={() => navigate('/home')}
              className="w-full py-3.5 bg-white text-wayza-dark rounded-full font-medium hover:bg-white/90 transition shadow-lg"
            >
              Continue to Wayza
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6 flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="font-instrument text-2xl text-white mb-3">Verification Failed</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-8">{errorMessage}</p>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 bg-white/10 text-white rounded-full font-medium hover:bg-white/20 transition border border-white/20"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
