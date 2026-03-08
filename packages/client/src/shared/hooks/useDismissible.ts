import { useState, useCallback } from 'react';

/**
 * Hook for localStorage-persisted dismissal state.
 *
 * Returns `[dismissed, dismiss]` — a boolean and a callback to permanently
 * dismiss. Once dismissed, the state persists across page reloads.
 */
export function useDismissible(storageKey: string): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(storageKey) === '1',
  );

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(storageKey, '1');
  }, [storageKey]);

  return [dismissed, dismiss];
}
