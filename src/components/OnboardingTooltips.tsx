import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'epochlight-onboarded';

interface TooltipStep {
  message: string;
  position: (viewport: { width: number; height: number }) => React.CSSProperties;
  arrowPosition: 'bottom' | 'top' | 'left';
}

const STEPS: TooltipStep[] = [
  {
    message: 'Drag to travel through time — or just scroll',
    arrowPosition: 'bottom',
    position: ({ width }) => ({
      left: width / 2,
      bottom: 80,
      transform: 'translateX(-50%)',
    }),
  },
  {
    message: 'Click any point to explore a discovery',
    arrowPosition: 'top',
    position: ({ width, height }) => ({
      left: width / 2,
      top: height / 2 + 20,
      transform: 'translateX(-50%)',
    }),
  },
  {
    message: 'Filter by subject to focus your exploration',
    arrowPosition: 'left',
    position: () => ({
      left: 260,
      top: 16,
    }),
  },
];

export default function OnboardingTooltips() {
  const [step, setStep] = useState(-1);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Small delay so the app renders first
    const timer = setTimeout(() => setStep(0), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const finish = useCallback(() => {
    setStep(-1);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= STEPS.length - 1) {
        localStorage.setItem(STORAGE_KEY, 'true');
        return -1;
      }
      return s + 1;
    });
  }, []);

  if (step < 0) return null;

  const current = STEPS[step];
  const pos = current.position(viewport);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Tooltip */}
      <div
        style={{
          position: 'absolute',
          ...pos,
          pointerEvents: 'auto',
          animation: 'onboarding-fade-in 0.3s ease',
        }}
      >
        <div
          style={{
            background: 'rgba(20, 20, 30, 0.95)',
            color: '#e8e8ec',
            borderRadius: 10,
            padding: '16px 20px',
            maxWidth: 320,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)',
            fontSize: 14,
            lineHeight: 1.5,
            position: 'relative',
          }}
        >
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              ...(current.arrowPosition === 'bottom'
                ? {
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '8px solid rgba(20, 20, 30, 0.95)',
                  }
                : current.arrowPosition === 'top'
                  ? {
                      top: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      borderLeft: '8px solid transparent',
                      borderRight: '8px solid transparent',
                      borderBottom: '8px solid rgba(20, 20, 30, 0.95)',
                    }
                  : {
                      left: -8,
                      top: 16,
                      borderTop: '8px solid transparent',
                      borderBottom: '8px solid transparent',
                      borderRight: '8px solid rgba(20, 20, 30, 0.95)',
                    }),
            }}
          />

          <p style={{ margin: '0 0 14px 0' }}>{current.message}</p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 5 }}>
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: i === step ? '#a0a0ff' : 'rgba(255, 255, 255, 0.2)',
                    transition: 'background 0.2s',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={finish}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.45)',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '4px 8px',
                }}
              >
                Skip
              </button>
              <button
                onClick={next}
                style={{
                  background: 'rgba(160, 160, 255, 0.2)',
                  border: '1px solid rgba(160, 160, 255, 0.3)',
                  color: '#c8c8ff',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '4px 14px',
                  borderRadius: 6,
                  fontWeight: 500,
                }}
              >
                {step === STEPS.length - 1 ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animation injected via style tag */}
      <style>{`
        @keyframes onboarding-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
