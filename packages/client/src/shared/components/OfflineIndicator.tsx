import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div aria-live="polite" aria-atomic="true">
      {isOffline && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-400/60 bg-amber-950/90 px-4 py-2 text-sm text-amber-100 shadow-lg backdrop-blur-sm dark:border-amber-500/50 dark:bg-amber-900/95 dark:text-amber-100"
        >
          <WifiOff className="h-4 w-4" />
          You're offline — some data may be unavailable
        </div>
      )}
    </div>
  );
}
