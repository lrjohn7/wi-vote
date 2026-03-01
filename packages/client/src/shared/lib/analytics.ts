/**
 * Lightweight analytics tracker — no cookies, no PII, ~1KB minified.
 * Session = random UUID in sessionStorage (per tab).
 * Events batched and sent via navigator.sendBeacon for reliability.
 */

interface AnalyticsEvent {
  session_id: string;
  event_type: 'pageview' | 'heartbeat' | 'interaction' | 'unload';
  page_path: string;
  referrer: string | null;
  device_type: 'mobile' | 'tablet' | 'desktop';
  screen_width: number;
  metadata?: Record<string, unknown>;
}

let eventQueue: AnalyticsEvent[] = [];
let initialized = false;

function getSessionId(): string {
  let sid = sessionStorage.getItem('wv_sid');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('wv_sid', sid);
  }
  return sid;
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function enqueue(
  type: AnalyticsEvent['event_type'],
  metadata?: Record<string, unknown>,
) {
  eventQueue.push({
    session_id: getSessionId(),
    event_type: type,
    page_path: window.location.pathname,
    referrer: document.referrer || null,
    device_type: getDeviceType(),
    screen_width: window.innerWidth,
    metadata,
  });
}

function flush() {
  if (eventQueue.length === 0) return;
  const payload = JSON.stringify({ events: eventQueue });
  eventQueue = [];
  try {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon('/api/v1/analytics/events', blob);
  } catch {
    // Silently fail — analytics should never break the app
  }
}

/** Track a page view. Called on SPA route changes. */
export function trackPageView() {
  enqueue('pageview');
}

/** Track a user interaction (ward click, search, etc.) */
export function trackInteraction(
  action: string,
  metadata?: Record<string, unknown>,
) {
  enqueue('interaction', { action, ...metadata });
}

/** Initialize analytics. Call once on app mount. */
export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  // Initial pageview
  enqueue('pageview');

  // Heartbeat every 30s for session duration tracking
  setInterval(() => {
    enqueue('heartbeat');
  }, 30_000);

  // Flush batch every 10s
  setInterval(flush, 10_000);

  // Flush on visibility change (tab hide / close)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      enqueue('unload');
      flush();
    }
  });
}
