import { useRef, memo, useEffect } from "react";
import { useIsomorphicLayoutEffect } from "./hooks";
import { createRoot } from "./renderer";
import type { CanvasElement, ReconcilerRoot, DeckGLProps } from "./types";
import "./jsx";

function DeckglComponent(props: DeckGLProps) {
  const { children, ...etc } = props;

  const wrapper = useRef<HTMLDivElement>(null!);
  const canvas = useRef<CanvasElement>(null!);
  const root = useRef<ReconcilerRoot>(null!);

  useIsomorphicLayoutEffect(() => {
    if (!root.current) {
      root.current = createRoot(canvas.current);
      root.current.configure({
        ...etc,
        canvas: canvas.current,
        parent: wrapper.current,
      });
    }

    // NOTE: this is called every "render" of this component
    root.current?.render(children);
  });

  useEffect(() => {
    return () => {
      if (root.current) {
        // FIXME: fires twice in StrictMode
        // root.current.unmount();
      }
    };
  }, []);

  // NOTE: interleaved prop is a hint that we are utilizing an external renderer such as Mapbox/Maplibre
  // so we want to avoid rendering another container / canvas element
  if (props.interleaved) {
    return null;
  }

  return (
    <div ref={wrapper} id="deckgl-fiber-wrapper">
      <canvas ref={canvas} id="deckgl-fiber-canvas" />
    </div>
  );
}

export const Deckgl = memo(DeckglComponent);
