import { useRef, memo } from "react";
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
    if (canvas.current && !root.current) {
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

  useIsomorphicLayoutEffect(() => {
    return () => {
      if (root.current) {
        // FIXME: fires twice in StrictMode
        // root.current.unmount();
      }
    };
  }, []);

  return (
    <div ref={wrapper}>
      <canvas ref={canvas} id="deckgl-fiber-canvas" />
    </div>
  );
}

export const Deckgl = memo(DeckglComponent);
