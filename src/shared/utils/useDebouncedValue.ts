import { useEffect, useState } from 'react';

/** Retrasa la actualización del valor hasta que permanece estable durante el tiempo indicado. Se utiliza para evitar una petición al backend en cada pulsación.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
