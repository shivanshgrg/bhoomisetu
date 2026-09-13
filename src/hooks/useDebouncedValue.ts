import { useEffect, useState } from 'react';

// Returns `value`, but only after it has stopped changing for `delayMs` —
// used to keep typed filter input snappy while the (potentially expensive)
// downstream computation it drives waits for a pause in keystrokes.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}
