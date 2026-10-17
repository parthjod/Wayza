import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { feedbackApi } from "../../api/feedback.api";

interface FeedbackFormProps {
  open: boolean;
  onClose: () => void;
}

type Step = "intro" | "message" | "submitting" | "done";

const PLACEHOLDER_PROMPTS = [
  "e.g. The matching felt super fast, loved it!",
  "e.g. Could use a dark mode toggle maybe?",
  "e.g. Found a bug when booking to Kothrud...",
  "e.g. The vibe is immaculate but the map lags a bit.",
];

export function FeedbackForm({ open, onClose }: FeedbackFormProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [placeholder] = useState(
    () =>
      PLACEHOLDER_PROMPTS[Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length)]
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setStep("intro");
      setMessage("");
      setError("");
    }
  }, [open]);

  // Auto-focus textarea when on message step
  useEffect(() => {
    if (step === "message") {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [step]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (message.trim().length < 10) {
      setError("Give us a bit more - at least 10 characters please");
      return;
    }
    setError("");
    setStep("submitting");
    try {
      await feedbackApi.submit(message.trim());
      setStep("done");
    } catch {
      setStep("message");
      setError("Oops, could not send that. Try again?");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className="relative feedback-modal animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-label="Share your thoughts"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="feedback-close-btn"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* -- INTRO STEP -- */}
        {step === "intro" && (
          <div className="feedback-step feedback-step--intro">
            <div className="feedback-emoji-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#a855f7" }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="feedback-heading">
              Got something on your mind?
            </h2>
            <p className="feedback-subtext">
              A bug, a vibe, a feature idea - anything you want us to hear.
              No forms, no fluff. Just you talking to us.
            </p>
            <button
              className="feedback-primary-btn"
              onClick={() => setStep("message")}
            >
              Sure, let&apos;s talk
              <svg className="feedback-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        )}

        {/* -- MESSAGE STEP -- */}
        {step === "message" && (
          <div className="feedback-step feedback-step--message">
            <div className="feedback-question-label">
              <span className="feedback-q-num">Q</span>
              <span>What&apos;s on your mind?</span>
            </div>
            <h2 className="feedback-heading feedback-heading--sm">
              Drop your thoughts right here
            </h2>
            <div className="feedback-textarea-wrap">
              <textarea
                ref={textareaRef}
                className="feedback-textarea"
                rows={5}
                maxLength={2000}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (error) setError("");
                }}
                placeholder={placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
              />
              <div className="feedback-char-count">
                {message.length}/2000
              </div>
            </div>
            {error && (
              <p className="feedback-error">{error}</p>
            )}
            <div className="feedback-actions">
              <button
                className="feedback-back-btn"
                onClick={() => setStep("intro")}
              >
                &larr; Back
              </button>
              <button
                className="feedback-primary-btn"
                onClick={handleSubmit}
                disabled={message.trim().length === 0}
              >
                Send it
                <svg className="feedback-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="feedback-hint">Ctrl + Enter to send</p>
          </div>
        )}

        {/* -- SUBMITTING STEP -- */}
        {step === "submitting" && (
          <div className="feedback-step feedback-step--loading">
            <div className="feedback-spinner" />
            <p className="feedback-subtext" style={{ marginTop: "20px" }}>
              Sending your thoughts our way...
            </p>
          </div>
        )}

        {/* -- DONE STEP -- */}
        {step === "done" && (
          <div className="feedback-step feedback-step--done">
            <div className="feedback-success-ring">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="feedback-heading">
              We heard you!
            </h2>
            <p className="feedback-subtext">
              Your message just landed with us. We actually read these - thanks for making Wayza better.
            </p>
            <button
              className="feedback-primary-btn"
              onClick={() => {
                onClose();
                navigate("/home", { replace: true });
              }}
              style={{ marginTop: "4px" }}
            >
              Take me back to cruising
              <svg className="feedback-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        )}

        {/* Progress bar */}
        <div className="feedback-progress">
          <div
            className="feedback-progress-bar"
            style={{
              width:
                step === "intro"
                  ? "33%"
                  : step === "message"
                  ? "66%"
                  : "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
