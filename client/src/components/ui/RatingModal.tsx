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
    <div className="wayza-rating-overlay">
      {/* Backdrop */}
      <button
        type="button"
        className="wayza-rating-backdrop"
        onClick={onClose}
        aria-label="Close rating modal"
        tabIndex={-1}
      />

      {/* Modal Card */}
      <div
        className="wayza-rating-modal animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wayza-rating-title"
      >
        <div className="wayza-rating-top-glow" />

        {/* SCREEN 1: Co-rider Selection List */}
        {screen === 'list' && (
          <div className="wayza-rating-content wayza-rating-list-screen">
            {/* Header */}
            <button
              type="button"
              onClick={onClose}
              className="wayza-rating-close wayza-list-close"
              aria-label="Close rating"
            >
              ×
            </button>

            <header className="wayza-rating-list-header">
              <div className="wayza-rating-star-badge">
                <span>★</span>
              </div>

              <h2 id="wayza-rating-title" className="wayza-rating-title">
                Rate Your Co-rider
              </h2>

              <p className="wayza-rating-subtitle">
                Select a co-rider to rate your experience
              </p>
            </header>

            {/* Rider List */}
            {loading ? (
              <div className="wayza-rating-loading">
                <div className="wayza-rating-spinner" />
              </div>
            ) : coRiders.length === 0 ? (
              <div className="wayza-rating-empty">
                <p>No co-riders to rate.</p>
              </div>
            ) : (
              <div className="wayza-rider-list">
                {coRiders.map((rider) => (
                  <button
                    key={rider.userId}
                    type="button"
                    disabled={rider.rated}
                    onClick={() => {
                      if (!rider.rated) handleSelectRider(rider);
                    }}
                    className={`wayza-rider-row ${
                      rider.rated ? 'wayza-rider-row-rated' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="wayza-rider-avatar-wrap">
                      <Avatar
                        name={rider.fullName}
                        imageUrl={rider.profilePicUrl}
                        size="lg"
                        className="!w-[76px] !h-[76px] text-xl font-semibold"
                      />

                      {rider.rated && (
                        <span
                          className="wayza-rider-rated-indicator"
                          aria-label="Already rated"
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="wayza-rider-details">
                      <p className="wayza-rider-name">
                        {rider.fullName}
                      </p>

                      <p className="wayza-rider-meta">
                        {rider.rated ? (
                          'Rated ✓'
                        ) : (
                          <>
                            <span className="wayza-rider-meta-label">
                              Co-rider
                            </span>
                            <span className="wayza-rider-meta-dot">•</span>
                            <span>{formatDate(rideDate)}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Arrow */}
                    {!rider.rated && (
                      <span className="wayza-rider-arrow" aria-hidden="true">
                        ›
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="wayza-rating-list-footer">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDone();
                }}
                className="wayza-rating-skip-btn"
              >
                {unratedCount === 0 ? 'Done' : 'Skip for now'}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 2: Rating Form */}
        {screen === 'form' && selected && (
          <div className="wayza-rating-content wayza-rating-form-screen">
            {/* Navigation */}
            <div className="wayza-rating-form-nav">
              <button
                type="button"
                onClick={() => setScreen('list')}
                className="wayza-rating-close wayza-rating-back"
                aria-label="Back to co-rider list"
              >
                ‹
              </button>

              <div className="wayza-rating-nav-spacer" />

              <button
                type="button"
                onClick={onClose}
                className="wayza-rating-close"
                aria-label="Close rating"
              >
                ×
              </button>
            </div>

            {/* Header */}
            <header className="wayza-rating-form-header">
              <h2 id="wayza-rating-title" className="wayza-rating-title">
                Rate Your Co-rider
              </h2>

              <p className="wayza-rating-subtitle">
                Help keep Wayza safe and friendly for everyone
              </p>
            </header>

            {/* Selected Rider */}
            <div className="wayza-selected-rider">
              <Avatar
                name={selected.fullName}
                imageUrl={selected.profilePicUrl}
                size="lg"
                className="!w-[76px] !h-[76px] text-xl font-semibold"
              />

              <div className="wayza-selected-rider-details">
                <p className="wayza-selected-rider-name">
                  {selected.fullName}
                </p>

                <p className="wayza-selected-rider-meta">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <span>Co-rider</span>
                  <span className="wayza-rider-meta-dot">•</span>
                  <span>{formatDate(rideDate)}</span>
                </p>
              </div>
            </div>

            {/* Interactive Stars */}
            <section className="wayza-rating-stars-section">
              <div className="wayza-rating-stars" role="group" aria-label="Choose a rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStars(n)}
                    onMouseEnter={() => setHoveredStar(n)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onFocus={() => setHoveredStar(n)}
                    onBlur={() => setHoveredStar(0)}
                    aria-label={`${n} star${n !== 1 ? 's' : ''}`}
                    aria-pressed={stars === n}
                    className={`wayza-rating-star ${
                      n <= displayStar ? 'wayza-rating-star-active' : ''
                    }`}
                  >
                    {n <= displayStar ? '★' : '☆'}
                  </button>
                ))}
              </div>

              <p className="wayza-rating-star-hint" aria-live="polite">
                {displayStar > 0 ? `${displayStar} out of 5` : 'Tap to rate'}
              </p>
            </section>

            {/* Quick Tags */}
            <section className="wayza-rating-tag-section">
              <p className="wayza-rating-section-label">
                Quick Tags <span>(optional)</span>
              </p>

              <div className="wayza-rating-tags">
                {POSITIVE_TAGS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleTag(t.value)}
                    aria-pressed={selectedTags.includes(t.value)}
                    className={`wayza-rating-tag wayza-rating-tag-positive ${
                      selectedTags.includes(t.value) ? 'is-selected' : ''
                    }`}
                  >
                    {t.label}
                  </button>
                ))}

                {NEGATIVE_TAGS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleTag(t.value)}
                    aria-pressed={selectedTags.includes(t.value)}
                    className={`wayza-rating-tag wayza-rating-tag-negative ${
                      selectedTags.includes(t.value) ? 'is-selected' : ''
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Optional Note */}
            <section className="wayza-rating-note-section">
              <label
                htmlFor="wayza-rating-comment"
                className="wayza-rating-section-label"
              >
                Add a note <span>(optional)</span>
              </label>

              <div className="wayza-rating-textarea-wrap">
                <textarea
                  id="wayza-rating-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write something (optional)..."
                  maxLength={200}
                  rows={4}
                  className="wayza-rating-textarea"
                />

                <span className="wayza-rating-char-count">
                  {comment.length}/200
                </span>
              </div>
            </section>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={stars === 0 || submitting}
              className="wayza-rating-submit-btn"
            >
              {submitting ? (
                <>
                  <span className="wayza-rating-spinner wayza-rating-spinner-small" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                  <span>Submit Rating</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
