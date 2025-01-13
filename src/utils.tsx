import { MapView } from "@deck.gl/core";
import type { Instance } from "./types";

export function noop(): void {}

export function isDefined(value: unknown) {
  return typeof value !== "undefined";
}

export function isFn(a: unknown): a is typeof Function {
  return typeof a === "function";
}

export function toPascal(str: string) {
  return `${str[0].toUpperCase()}${str.slice(1)}`;
}

export function isView(instance: Instance) {
  return instance instanceof MapView;
}

export function flattenTree(arr) {
  return arr.flatMap((val) => {
    if (val.children.length > 0) {
      return [val.node, ...flattenTree(val.children)];
    }

    return val.node;
  });
}

export function organizeList(list) {
  return list.reduce(
    (acc, curr) => {
      isView(curr) ? acc.views.push(curr) : acc.layers.push(curr);

      return acc;
    },
    { views: [], layers: [] }
  );
}
