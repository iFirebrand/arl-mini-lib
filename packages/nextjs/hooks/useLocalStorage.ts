import { useCallback, useMemo, useSyncExternalStore } from "react";

// Other hooks using the same key re-read when one of them writes.
const LOCAL_WRITE_EVENT = "arlib-local-storage";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_WRITE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_WRITE_EVENT, onChange);
  };
};

const read = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** A JSON value kept in localStorage. Renders initialValue on the server and before hydration. */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );

  const storedValue = useMemo<T>(() => {
    if (raw === null) return initialValue;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  }, [raw, initialValue]);

  const setValue = useCallback(
    (value: T) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new Event(LOCAL_WRITE_EVENT));
      } catch (error) {
        console.log(error);
      }
    },
    [key],
  );

  return [storedValue, setValue] as const;
}
