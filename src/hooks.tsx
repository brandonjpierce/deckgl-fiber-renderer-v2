import {
  useEffect,
  useLayoutEffect,
  type DependencyList,
  type EffectCallback,
} from "react";
import { isDefined } from "./utils";
import { selectors, useStore } from "./store";

export function useIsomorphicLayoutEffect(
  fn: EffectCallback,
  deps?: DependencyList
) {
  return isDefined(globalThis.document)
    ? useLayoutEffect(fn, deps)
    : useEffect(fn, deps);
}

export function useDeckgl() {
  return useStore(selectors.deckgl);
}
