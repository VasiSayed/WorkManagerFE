import { useEffect, useRef, useState } from 'react';
import { T } from '../theme';
import { Icon } from './Icons';

/**
 * Browser voice-to-text input. Speech is converted locally by the browser's
 * SpeechRecognition/WebKitSpeechRecognition API and the resulting text is kept
 * editable before it is submitted with the parent form.
 */
export default function VoiceTextInput({
  label = 'Name (optional)',
  value,
  onChange,
  placeholder = 'Speak or type a name…',
  language = 'en-IN',
}) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => () => {
    try { recognitionRef.current?.stop?.(); } catch { /* ignore */ }
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage('Voice input is not supported in this browser. You can still type the name.');
      return;
    }

    try {
      recognitionRef.current?.stop?.();
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.lang = language;
      recognition.onstart = () => { setListening(true); setMessage('Listening…'); };
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() || '';
        if (transcript) onChange(value?.trim() ? `${value.trim()} ${transcript}` : transcript);
      };
      recognition.onerror = () => setMessage('Could not capture speech. You can type instead.');
      recognition.onend = () => { setListening(false); setMessage(''); };
      recognition.start();
    } catch {
      setListening(false);
      setMessage('Voice input could not be started. You can type instead.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: T.slate }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            padding: '9px 44px 9px 12px', border: `1px solid ${listening ? T.gold : T.border}`,
            borderRadius: 8, fontSize: 13, outline: 'none', width: '100%', fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={startListening}
          disabled={listening}
          title={listening ? 'Listening…' : 'Speak name'}
          aria-label={listening ? 'Listening' : 'Speak name'}
          style={{
            position: 'absolute', right: 5, top: 5, width: 34, height: 30, border: 0,
            borderRadius: 7, background: listening ? T.errorBg : T.navyTint,
            color: listening ? T.error : T.navy, cursor: listening ? 'default' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="mic" size={17} />
        </button>
      </div>
      {message && <div style={{ fontSize: 11, color: T.slateLight }}>{message}</div>}
    </div>
  );
}
