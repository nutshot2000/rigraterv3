// Lightweight analytics helper that safely calls Vercel Web Analytics and GA (if present)
// This avoids throwing in environments where one or both are not initialized.

let trackFn: ((name: string, properties?: Record<string, any>) => void) | null = null;
try {
    // Lazy import to keep SSR/build happy even if package tree shakes differently
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@vercel/analytics');
    trackFn = typeof mod.track === 'function' ? mod.track : null;
} catch {}

export function trackEvent(name: string, properties?: Record<string, any>) {
    try {
        if (trackFn) trackFn(name, properties);
    } catch {}
    try {
        // Also emit to GA if present for users who run both
        (window as any)?.gtag?.('event', name, properties || {});
    } catch {}
}


