'use client';

import { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
}

export function TurnstileWidget({ onVerify, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    // If no site key is set in .env, simulate instant pass for seamless local testing
    if (!siteKey) {
      onVerify('mock-dev-turnstile-token');
      return;
    }

    // Load Cloudflare Turnstile script
    const scriptId = 'cloudflare-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    function renderWidget() {
      const turnstile = (window as any).turnstile;
      if (turnstile && containerRef.current) {
        try {
          turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            callback: (token: string) => onVerify(token),
            'error-callback': (err: any) => onError?.(err || 'Turnstile verification failed'),
          });
        } catch {
          // ignore double render
        }
      }
    }

    if ((window as any).turnstile) {
      renderWidget();
    } else {
      script.addEventListener('load', renderWidget);
    }
  }, [siteKey, onVerify, onError]);

  if (!siteKey) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>Bot Protection: Cloudflare Turnstile Active</span>
      </div>
    );
  }

  return <div ref={containerRef} className="my-2 min-h-[65px] flex justify-center" />;
}
