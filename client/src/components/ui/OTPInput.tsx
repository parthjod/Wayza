import { useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (otp: string) => void;
}

export function OTPInput({ length = 6, value, onChange, onComplete }: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;

    const newValue = [...value];
    newValue[index] = char;
    onChange(newValue);

    // Auto-advance on digit entry
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check completion
    if (char && newValue.every((v) => v !== '')) {
      onComplete?.(newValue.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Auto-backspace: on Backspace with empty input, focus previous
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newValue = [...value];
      newValue[index - 1] = '';
      onChange(newValue);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted.length === 0) return;

    const newValue = [...value];
    for (let i = 0; i < pasted.length; i++) {
      newValue[i] = pasted[i];
    }
    onChange(newValue);

    // Focus appropriate box
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    if (newValue.every((v) => v !== '')) {
      onComplete?.(newValue.join(''));
    }
  };

  return (
    <div className="otp-boxes-row" role="group" aria-label="OTP input">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="otp-input"
          aria-label={`OTP digit ${i + 1}`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
