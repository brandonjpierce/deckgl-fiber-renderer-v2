import type { DeckProps, View } from "@deck.gl/core";
import type { ReactNode } from "react";
import type { Store } from "./store";

export type Type = string;

export type Container = { store: Store };

export type Props = Record<string, unknown>;

export type HostContext = { store: Store };

// TODO: figure out a better return type for `node`
export type Instance = { node: any; children: Instance[] };

export type ChildSet = Instance[];

export type TimeoutHandle = number;

export type UpdatePayload = null;

export type CanvasElement = HTMLCanvasElement;

export type ViewOrViews = View | View[] | null;

export type DeckGLProps<ViewsT extends ViewOrViews = null> = Omit<
  DeckProps<ViewsT>,
  "width" | "height" | "gl" | "parent" | "canvas" | "_customRender"
> & {
  width?: string | number;
  height?: string | number;
  children?: ReactNode;
};

export type ReconcilerRoot = {
  render: (element: ReactNode) => void;
  configure: (props: DeckGLProps) => void;
  unmount: () => void;
};
