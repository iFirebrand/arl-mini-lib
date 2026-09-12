import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** False while rendering on the server and during hydration, true in the browser after that. */
export const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
