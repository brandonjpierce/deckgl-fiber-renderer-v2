import { ConcurrentRoot } from "react-reconciler/constants";
import { useStore as storeInstance } from "./store";
import { Deck } from "@deck.gl/core";
import { MapboxOverlay } from "@deck.gl/mapbox";
import reactReconciler from "react-reconciler";
import * as config from "./config";
import type { CanvasElement, ReconcilerRoot, HostContext } from "./types";

export const renderer = reactReconciler(config);

const roots = new Map();

function unmountAtNode(node: CanvasElement) {
  const root = roots.get(node);
  const state = root.store.getState();

  renderer.updateContainer(null, root.container, null, () => {
    state.deckgl.finalize();
    roots.delete(node);
    state.setDeckgl(undefined);
  });
}

function noop(): void {}

export function createRoot<TCanvas extends CanvasElement>(
  node: TCanvas
): ReconcilerRoot {
  const root = roots.get(node);

  const store = root?.store ?? storeInstance;

  const container =
    root?.container ??
    renderer.createContainer(
      { store },
      ConcurrentRoot,
      null,
      false,
      null,
      "",
      reportError,
      null
    );

  if (!root) {
    roots.set(node, { container, store });
  }

  return {
    configure({ onConfigure, ...props }) {
      const state = store.getState();

      // NOTE: interleaved prop is a hint that we are utilizing an external renderer such as Mapbox/Maplibre
      const deckgl = props.interleaved
        ? new MapboxOverlay(props)
        : new Deck(props);

      state.setDeckgl(deckgl);

      if (onConfigure) {
        onConfigure({
          // TODO: is passing props here useful given you should have access to them already?
          props,
          deckgl,
        });
      }
    },
    render(children) {
      renderer.updateContainer(children, container, null, noop);
    },
    unmount() {
      unmountAtNode(node);
    },
  };
}
