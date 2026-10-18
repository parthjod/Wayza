import { useState, useEffect } from 'react';
import { Avatar } from './Avatar';
import { ratingApi, type CoRider } from '../../api/rating.api';

// ─── Tag definitions ─────────────────────────────────────────────────────────
const POSITIVE_TAGS = [
  { label: 'On time ⏱️', value: 'On time' },
  { label: 'Fast UPI payment 💸', value: 'Fast UPI payment' },
  { label: 'Friendly & polite 😊', value: 'Friendly & polite' },
  { label: 'Safe vibes 🛡️', value: 'Safe vibes' },
  { label: 'Respectful 🤝', value: 'Respectful' },
];

const NEGATIVE_TAGS = [
  { label: 'Delay / Late ⏳', value: 'Delay / Late' },
  { label: 'Unpaid fare ❌', value: 'Unpaid fare' },
  { label: 'Rude behaviour ⚠️', value: 'Rude behaviour' },
];

// ─── Props ───────────────────────────────────────────────────────────────────
interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  /** Called when all riders have been rated (or user skips remaining) */
  onDone: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function RatingModal({ open, onClose, groupId, onDone }: RatingModalProps) {
  const [screen, setScreen] = useState<'list' | 'form'>('list');
  const [coRiders, setCoRiders] = useState<CoRider[]>([]);
  const [rideDate, setRideDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<CoRider | null>(null);
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !groupId) return;
    setScreen('list');
    setSelected(null);
    setStars(0);
    setSelectedTags([]);
    setComment('');
    setLoading(true);
    ratingApi
      .getPending(groupId)
      .then((data) => {
        setCoRiders(data.coRiders);
        setRideDate(data.rideDate);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, groupId]);

  if (!open) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectRider = (rider: CoRider) => {
    setSelected(rider);
    setStars(0);
    setHoveredStar(0);
    setSelectedTags([]);
    setComment('');
    setScreen('form');
  };

  const handleSubmit = async () => {
    if (!selected || stars === 0 || submitting) return;
    setSubmitting(true);
    try {
      await ratingApi.submit(groupId, selected.userId, stars, selectedTags, comment || undefined);
      // Mark this rider as rated in local state
      setCoRiders((prev) =>
        prev.map((r) => (r.userId === selected.userId ? { ...r, rated: true } : r))
      );
      setScreen('list');
      setSelected(null);
    } catch {
      // silently ignore — don't block navigation
    } finally {
      setSubmitting(false);
    }
  };

  const displayStar = hoveredStar || stars;
  const unratedCount = coRiders.filter((r) => !r.rated).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal card */}
      <div
        className="relative w-full max-w-md rounded-[28px] bg-gradient-to-b from-[#0a0f1e]/98 to-[#06091a]/98 border border-blue-500/40 shadow-[0_0_50px_rgba(37,99,235,0.2)] animate-fade-in-up overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Glow ring accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

        {/* ── SCREEN 1: Co-rider List ── */}
        {screen === 'list' && (
          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex flex-col items-center w-full text-center gap-1">
                <div className="w-14 h-14 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-3xl mb-1 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                  ⭐
                </div>
                <h2 className="font-instrument text-2xl text-white tracking-tight">
                  Rate Your Co-rider
                </h2>
                <p className="text-sm text-slate-400">
                  Select a co-rider to rate your experience
                </p>
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-slate-800/80 border border-white/5 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer text-base"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Rider list */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : coRiders.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No co-riders to rate.</p>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {coRiders.map((rider) => (
                  <button
                    key={rider.userId}
                    disabled={rider.rated}
                    onClick={() => !rider.rated && handleSelectRider(rider)}
                    className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all duration-200 text-left cursor-pointer
                      ${rider.rated
                        ? 'bg-slate-800/40 border-white/5 opacity-60 cursor-default'
                        : 'bg-gradient-to-r from-[#111e32]/90 to-[#101a2c]/90 hover:from-[#172943] hover:to-[#14223a] border-blue-400/20 hover:border-blue-400/50'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <Avatar name={rider.fullName} imageUrl={rider.profilePicUrl} size="md" />
                        {rider.rated && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#101a2c] flex items-center justify-center text-[9px] font-bold text-black">
                            ✓
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{rider.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {rider.rated ? 'Rated ✓' : `Co-rider • ${formatDate(rideDate)}`}
                        </p>
                      </div>
                    </div>
                    {!rider.rated && (
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-base">
                        ›
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { onClose(); onDone(); }}
                className="flex-1 py-3 rounded-full bg-slate-800/60 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-medium transition-all cursor-pointer"
              >
                {unratedCount === 0 ? 'Done' : 'Skip for now'}
              </button>
              {unratedCount === 0 && (
                <button
                  onClick={() => { onClose(); onDone(); }}
                  className="flex-1 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-bold shadow-[0_0_18px_rgba(37,99,235,0.3)] transition-all cursor-pointer"
                >
                  Done ✓
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── SCREEN 2: Rating Form ── */}
        {screen === 'form' && selected && (
          <div className="p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setScreen('list')}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800/80 border border-white/5 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer text-base"
                aria-label="Back"
              >
                ‹
              </button>
              <div className="flex-1 text-center">
                <div className="w-10 h-10 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-2xl mx-auto mb-0.5">
                  ⭐
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800/80 border border-white/5 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer text-base"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <h2 className="font-instrument text-2xl text-white text-center tracking-tight mb-0.5">
              Rate Your Co-rider
            </h2>
            <p className="text-xs text-slate-400 text-center mb-4">
              Help keep Wayza safe and friendly for everyone
            </p>

            {/* Selected rider card */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#111e32]/80 border border-blue-400/20 mb-5">
              <Avatar name={selected.fullName} imageUrl={selected.profilePicUrl} size="lg" />
              <div>
                <p className="text-base font-bold text-white">{selected.fullName}</p>
                <p className="text-xs text-slate-400">Co-rider • {formatDate(rideDate)}</p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex flex-col items-center mb-5">
              <div className="flex gap-2 mb-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setStars(n)}
                    onMouseEnter={() => setHoveredStar(n)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="text-4xl transition-transform hover:scale-110 active:scale-95 cursor-pointer leading-none"
                    aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                  >
                    {n <= displayStar ? '★' : '☆'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {displayStar > 0
                  ? `${displayStar} out of 5`
                  : 'Tap to rate'}
              </p>
            </div>

            {/* Quick Tags */}
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Quick Tags (optional)</p>
              <div className="flex flex-wrap gap-1.5">
                {POSITIVE_TAGS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => toggleTag(t.value)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer
                      ${selectedTags.includes(t.value)
                        ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                        : 'bg-blue-600/10 border-blue-500/30 text-blue-300 hover:bg-blue-600/20'
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
                {NEGATIVE_TAGS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => toggleTag(t.value)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer
                      ${selectedTags.includes(t.value)
                        ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                        : 'bg-red-600/10 border-red-500/30 text-red-300 hover:bg-red-600/20'
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional note */}
            <div className="mb-5">
              <p className="text-xs text-slate-400 mb-1.5">Add a note (optional)</p>
              <div className="relative">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write something (optional)..."
                  maxLength={200}
                  rows={3}
                  className="w-full bg-[#0d1525]/80 border border-white/10 rounded-2xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 resize-none transition-colors"
                  style={{ fontSize: '16px' }}
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-slate-500">
                  {comment.length}/200
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={stars === 0 || submitting}
              className="w-full py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base shadow-[0_0_24px_rgba(37,99,235,0.3)] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>✈ Submit Rating</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
