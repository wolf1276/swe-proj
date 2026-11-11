"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
/** Keep credential controls disabled until React owns form submission. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
