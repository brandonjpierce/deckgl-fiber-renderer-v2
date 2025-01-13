import {
  FirstPersonView,
  _GlobeView as GlobeView,
  MapView,
  OrthographicView,
  OrbitView,
} from "@deck.gl/core";
import {
  S2Layer,
  QuadkeyLayer,
  TileLayer,
  TripsLayer,
  H3ClusterLayer,
  H3HexagonLayer,
  Tile3DLayer,
  TerrainLayer,
  MVTLayer,
  GeohashLayer,
} from "@deck.gl/geo-layers";
import {
  ArcLayer,
  BitmapLayer,
  IconLayer,
  LineLayer,
  PointCloudLayer,
  ScatterplotLayer,
  ColumnLayer,
  GridCellLayer,
  PathLayer,
  PolygonLayer,
  GeoJsonLayer,
  TextLayer,
  SolidPolygonLayer,
} from "@deck.gl/layers";
import { ScenegraphLayer, SimpleMeshLayer } from "@deck.gl/mesh-layers";
import {
  DefaultEventPriority,
  ContinuousEventPriority,
  DiscreteEventPriority,
} from "react-reconciler/constants";
import { LogLayer, ConsoleTransport, type ILogLayer } from "loglayer";
import { toPascal, flattenTree, organizeList } from "./utils";
import type { Fiber } from "react-reconciler";
import type {
  ChildSet,
  Container,
  HostContext,
  Instance,
  LayerFactoryProps,
  Props,
  Type,
  UpdatePayload,
} from "./types";

// Quick hack for TS sake
interface CustomLogLayer extends ILogLayer {
  info(...messages: any[]): void;
  debug(...messages: any[]): void;
}

const log: CustomLogLayer = new LogLayer({
  transport: new ConsoleTransport({
    logger: console,
  }),
  enabled: true,
});

/**
 * Host API execution order
 *
 * 1. resolveUpdatePriority
 * 2. scheduleMicrotask
 * 3. getRootHostContext
 * 4. ---> per returned jsx element
 *    getChildHostContext
 *    shouldSetTextContent
 *    ---> if children are found, this is deferred until after children have been created
 *    createInstance/cloneInstance
 *    ---
 *    ---> if children are found, called per child
 *    appendInitialChildren
 *    ---
 *    finalizeInitialChildren
 *    maySuspendCommit
 * 5. createContainerChildSet
 * 6. ---> per returned root level jsx element in the tree
 *    appendChildToContainerChildSet
 *    ---
 * 7. finalizeContainerChildren
 * 8. ---> per returned jsx element
 *    getCurrentUpdatePriority
 *    setCurrentUpdatePriority
 *    ---
 *
 * 9. prepareForCommit
 * 10. replaceContainerChildren
 * 11. resetAfterCommit
 * 12. setCurrentUpdatePriority
 * 13. ---> per deleted jsx element
 *     detatchDeletedInstances
 *     ---
 */

let currentUpdatePriority = DefaultEventPriority;
// NOTE: in some Meta host configs this is mutated
const currentEventPriority = DefaultEventPriority;

/**
 * The reconciler has two modes: mutation mode and persistent mode. You must specify one of them.
 *
 * If your target platform has immutable trees, you'll want the **persistent mode** instead.
 * In that mode, existing nodes are never mutated, and instead every change clones the parent
 * tree and then replaces the whole parent tree at the root. This is the node used by the new
 * React Native renderer, codenamed "Fabric".
 *
 * Depending on the mode, the reconciler will call different methods on your host config.
 */
export const supportsMutation = false;
export const supportsPersistence = true;

/**
 * You can optionally implement hydration to "attach" to the existing tree during the initial
 * render instead of creating it from scratch. For example, the DOM renderer uses this to
 * attach to an HTML markup.
 */
export const supportsHydration = false;

/**
 * This is a property (not a function) that should be set to something that can never be a
 * valid timeout ID. For example, you can set it to `-1`.
 */
export const noTimeout = -1;

/**
 * Set this to `true` to indicate that your renderer supports `scheduleMicrotask`.
 * We use microtasks as part of our discrete event implementation in React DOM.
 * If you're not sure if your renderer should support this, you probably should.
 * The option to not implement `scheduleMicrotask` exists so that platforms with more
 * control over user events, like React Native, can choose to use a different mechanism.
 */
export const supportsMicrotasks = true;

/**
 * This is a property (not a function) that should be set to `true` if your renderer
 * is the main one on the page. For example, if you're writing a renderer for the
 * Terminal, it makes sense to set it to `true`, but if your renderer is used *on top of*
 * React DOM or some other existing renderer, set it to `false`.
 */
export const isPrimaryRenderer = false;

/**
 * You can proxy this to `setTimeout` or its equivalent in your environment.
 */
export const scheduleTimeout = setTimeout;

/**
 * You can proxy this to `clearTimeout` or its equivalent in your environment.
 */
export const cancelTimeout = clearTimeout;

/**
 * You can proxy this to `queueMicrotask` or its equivalent in your environment.
 */
export const scheduleMicrotask = queueMicrotask;

class LayerFactory {
  constructor(props: LayerFactoryProps) {
    return new props.layer(props.props)
  }
}

const catalogue = {
  // @deck.gl/core
  MapView,
  OrthographicView,
  OrbitView,
  FirstPersonView,
  GlobeView,

  // @deck.gl/layers
  ArcLayer,
  BitmapLayer,
  IconLayer,
  LineLayer,
  PointCloudLayer,
  ScatterplotLayer,
  ColumnLayer,
  GridCellLayer,
  PathLayer,
  PolygonLayer,
  GeoJsonLayer,
  TextLayer,
  SolidPolygonLayer,

  // @deck.gl/geo-layers
  S2Layer,
  QuadkeyLayer,
  TileLayer,
  TripsLayer,
  H3ClusterLayer,
  H3HexagonLayer,
  Tile3DLayer,
  TerrainLayer,
  MVTLayer,
  GeohashLayer,

  // @deck.gl/mesh-layers
  ScenegraphLayer,
  SimpleMeshLayer,

  //
  LayerFactory
}

/**
 * Since the creation of a Deckgl layer is the same regardless if we are instantiating
 * for the first time or cloning after a change in the tree, we reuse the same logic
 * for both host APIs.
 *
 * If there is a case for more in depth prop diffing or similar, then we can shift this
 * logic to each of the respective host APIs.
 */
function createDeckglObject(type: Type, props: Props): Instance {
  const name = toPascal(type) as keyof typeof catalogue;
  const layer = catalogue[name] as new (props: Props) => Instance['node'];

  if (!layer) {
    throw new Error(`Unsupported element type: ${type}`);
  }

  return {
    node: new layer(props),
    children: [],
  };
}

/**
 * This method should return a newly created node. For example, the DOM renderer
 * would call `document.createElement(type)` here and then set the properties from `props`.
 *
 * You can use `rootContainer` to access the root container associated with that tree.
 * For example, in the DOM renderer, this is useful to get the correct `document` reference
 * that the root belongs to.
 *
 * The `hostContext` parameter lets you keep track of some information about your current
 * place in the tree. To learn more about it, see `getChildHostContext` below.
 *
 * This method happens **in the render phase**. It can (and usually should) mutate the node
 * it has just created before returning it, but it must not modify any other nodes. It must
 * not register any event handlers on the parent tree. This is because an instance being
 * created doesn't guarantee it would be placed in the tree — it could be left unused and
 * later collected by GC. If you need to do something when an instance is definitely in the
 * tree, look at `commitMount` instead.
 */
export function createInstance(
  type: Type,
  props: Props,
  rootContainerInfo: Container,
  hostContext: HostContext,
  fiber: Fiber
): Instance {
  log.info("λ createInstance");
  log.debug("\ttype:", type);
  log.debug("\tprops:", props);
  log.debug("\trootContainerInfo:", rootContainerInfo);
  log.debug("\thostContext:", hostContext);
  log.debug("\tfiber:", fiber);
  log.info("\n");

  return createDeckglObject(type, props);
}

/**
 * Same as `createInstance`, but for text nodes.
 * If your renderer doesn't support text nodes, you can throw here.
 */
export function createTextInstance() {
  log.info("λ createTextInstance");
  log.info("\n");

  throw new Error("Text nodes are not supported");
}

/**
 * This functions somewhat equivelent to createInstance but gives you
 * an opportunity to compare props before "cloning" the new object.
 * Unsure as to what `keepChildren` does or how to change it.
 *
 * Undocumented and incorrectly typed
 */
export function cloneInstance(
  instance: Instance,
  type: Type,
  oldProps: Props,
  newProps: Props,
  keepChildren: boolean,
  newChildSet?: ChildSet
): Instance {
  log.info("λ cloneInstance");
  log.debug("\tinstance:", instance);
  log.debug("\ttype:", type);
  log.debug("\toldProps:", oldProps);
  log.debug("\tnewProps:", newProps);
  log.debug("\tkeepChildren:", keepChildren);
  log.debug("\tnewChildSet:", newChildSet);
  log.info("\n");

  return createDeckglObject(type, newProps);
}

/**
 * This return value is created each time the tree is changed, meaning we are
 * rebuilding the layer list from scratch removing the need to maintain the
 * array mutations in other host APIs.
 *
 * Undocumented
 */
export function createContainerChildSet(): ChildSet {
  log.info("λ createContainerChildSet");
  log.info("\n");

  return [];
}

/**
 * This is called after a instance has been generated either by `createInstance`
 * or `cloneInstance` **and** the child in question is at the root of the tree.
 * It utilizes the `childSet` created in `createContainerChildSet`.
 *
 * Undocumented
 */
export function appendChildToContainerChildSet(
  childSet: ChildSet,
  child: Instance
): void {
  log.info("λ appendChildToContainerChildSet");
  log.debug("\tchildSet:", childSet);
  log.debug("\tchild:", child);
  log.info("\n");

  childSet.push(child);
}

/**
 * This is potentially similar to `finalizeInitialChildren` in that it allows you to
 * perform any final mutations on the new instances before being connected to the
 * tree on the screen. Possible candidate for any deckgl.setProps()
 * calls or other behaviors.
 *
 * Undocumented
 */
export function finalizeContainerChildren(
  container: Container,
  newChildren: ChildSet
): void {
  // log.group("finalizeContainerChildren");
  // log.info("container: %O", container);
  // log.info("newChildren: %O", newChildren);

  log.info("λ finalizeContainerChildren");
  log.debug("\tcontainer:", container);
  log.debug("\tnewChildren:", newChildren);

  const state = container.store.getState();
  const { deckgl } = state;

  // NOTE: takes our infinitely nestable tree of layers/views and flattens them
  const list = flattenTree(newChildren);

  // NOTE: splits views and layers into separate arrays
  const types = organizeList(list);

  log.debug("\tflattened list:", list);
  log.debug("\tsplit types:", types);
  log.info("\n");

  deckgl.setProps({ layers: types.layers, views: types.views });
}

/**
 * This is potentially similar to `resetAfterCommit` in that it allows you to do something
 * after the tree has been connected to the screen. Possible candidate for any deckgl.setProps()
 * calls or other behaviors.
 *
 * Undocumented
 */
export function replaceContainerChildren(
  container: Container,
  newChildren: ChildSet
): void {
  log.info("λ replaceContainerChildren");
  log.debug("\tcontainer:", container);
  log.debug("\tnewChildren:", newChildren);
  log.info("\n");

  // const state = container.store.getState();
  // const { deckgl } = state;
  // const list = flattenTree(newChildren);
  // const types = organizeList(list);
  // deckgl.setProps({ layers: types.layers, views: types.views });
}

/**
 * This method should mutate the `parentInstance` and add the child to its list of children.
 * For example, in the DOM this would translate to a `parentInstance.appendChild(child)` call.
 *
 * This method happens **in the render phase**. It can mutate `parentInstance` and `child`,
 * but it must not modify any other nodes. It's called while the tree is still being built up
 * and not connected to the actual tree on the screen.
 */
export function appendInitialChild(
  parentInstance: Instance,
  child: Instance
): void {
  log.info("λ appendInitialChild");
  log.debug("\tparentInstance:", parentInstance);
  log.debug("\tchild:", child);
  log.info("\n");

  parentInstance.children.push(child);
}

/**
 * In this method, you can perform some final mutations on the `instance`.
 * Unlike with `createInstance`, by the time `finalizeInitialChildren` is called, all the
 * initial children have already been added to the `instance`, but the instance itself has
 * not yet been connected to the tree on the screen.
 *
 * This method happens **in the render phase**. It can mutate `instance`, but it must not
 * modify any other nodes. It's called while the tree is still being built up and not connected
 * to the actual tree on the screen.
 *
 * There is a second purpose to this method. It lets you specify whether there is some work that
 * needs to happen when the node is connected to the tree on the screen. If you return `true`,
 * the instance will receive a `commitMount` call later. See its documentation below.
 *
 * If you don't want to do anything here, you should return `false`.
 */
export function finalizeInitialChildren(
  instance: Instance,
  type: Type,
  props: Props,
  rootContainer: Container,
  hostContext: HostContext
): boolean {
  log.info("λ finalizeInitialChildren");
  log.debug("\tinstance:", instance);
  log.debug("\ttype:", type);
  log.debug("\tprops:", props);
  log.debug("\trootContainer:", rootContainer);
  log.debug("\thostContext:", hostContext);
  log.info("\n");

  return false;
}

/**
 * React calls this method so that you can compare the previous and the next props, and decide
 * whether you need to update the underlying instance or not. If you don't need to update it,
 * return `null`. If you need to update it, you can return an arbitrary object representing the
 * changes that need to happen. Then in `commitUpdate` you would need to apply those changes
 * to the instance.
 *
 * This method happens **in the render phase**. It should only *calculate* the update — but not
 * apply it! For example, the DOM renderer returns an array that looks like
 * `[prop1, value1, prop2, value2, ...]` for all props that have actually changed.
 * And only in `commitUpdate` it applies those changes. You should calculate as much as you
 * can in `prepareUpdate` so that `commitUpdate` can be very fast and straightforward.
 *
 * See the meaning of `rootContainer` and `hostContext` in the `createInstance` documentation.
 *
 * This is seemingly not called if you are persistence mode.
 */
export function prepareUpdate(
  instance: Instance,
  type: Type,
  oldProps: Props,
  newProps: Props,
  rootContainer: Container,
  hostContext: HostContext
): UpdatePayload | null {
  log.info("λ prepareUpdate");
  log.debug("\tinstance:", instance);
  log.debug("\ttype:", type);
  log.debug("\toldProps:", oldProps);
  log.debug("\tnewProps:", newProps);
  log.debug("\trootContainer:", rootContainer);
  log.debug("\thostContext:", hostContext);
  log.info("\n");

  return null;
}

/**
 * This method lets you store some information before React starts making changes
 * to the tree on the screen. For example, the DOM renderer stores the current text
 * selection so that it can later restore it. This method is mirrored by `resetAfterCommit`.
 *
 * Even if you don't want to do anything here, you need to return `null` from it.
 */
export function prepareForCommit(
  container: Container
): Record<string, unknown> | null {
  // log.group("prepareForCommit");
  // log.info("container: %O", container);
  // log.groupEnd();

  return null;
}

/**
 * This method is called right after React has performed the tree mutations. You can use
 * it to restore something you've stored in `prepareForCommit` — for example, text selection.
 *
 * You can leave it empty.
 */
export function resetAfterCommit(container: Container): void {
  // log.group("resetAfterCommit");
  // log.info("container: %O", container);
  // log.groupEnd();
}

/**
 * This method is called for a container that's used as a portal target.
 *
 * You can leave it empty.
 */
export function preparePortalMount(): void {
  // log.group("preparePortalMount");
  // log.groupEnd();
}

/**
 * Some target platforms support setting an instance's text content without manually creating
 * a text node. For example, in the DOM, you can set `node.textContent` instead of creating a
 * text node and appending it.
 *
 * If you return `true` from this method, React will assume that this node's children are
 * text, and will not create nodes for them. It will instead rely on you to have filled that
 * text during `createInstance`. This is a performance optimization. For example, the DOM
 * renderer returns `true` only if `type` is a known text-only parent (like `'textarea'`) or
 * if `props.children` has a `'string'` type. If you return `true`, you will need to implement
 * `resetTextContent` too.
 *
 * If you don't want to do anything here, you should return `false`.
 *
 * This method happens **in the render phase**. Do not mutate the tree from it.
 */
export function shouldSetTextContent(type: Type, props: Props): boolean {
  // log.group("shouldSetTextContent");
  // log.info("type: %s", type);
  // log.info("props: %O", props);
  // log.groupEnd();

  return false;
}

/**
 * This method lets you return the initial host context from the root of the tree.
 * See `getChildHostContext` for the explanation of host context. The value of
 * `rootContainer` is whatever you passed in to the first argument of `createContainer`
 * from the reconciler instance.
 *
 * This method happens **in the render phase**. Do not mutate the tree from it.
 */
export function getRootHostContext(rootContainer: Container): HostContext {
  // log.group("getRootHostContext");
  // log.info("rootContainer: %O", rootContainer);
  // log.groupEnd();

  return rootContainer;
}

/**
 * Host context lets you track some information about where you are in the tree so that it's available
 * inside `createInstance` as the `hostContext` parameter. For example, the DOM renderer uses it to
 * track whether it's inside an HTML or an SVG tree, because `createInstance` implementation needs to
 * be different for them.
 *
 * If the node of this `type` does not influence the context you want to pass down, you can return
 * `parentHostContext`. Alternatively, you can return any custom object representing the information
 * you want to pass down.
 *
 * If you don't want to do anything here, return `parentHostContext`.
 *
 * This method happens **in the render phase**. Do not mutate the tree from it.
 */
export function getChildHostContext(
  parentHostContext: HostContext,
  type: Type
): HostContext {
  // log.group("getChildHostContext");
  // log.info("parentHostContext: %O", parentHostContext);
  // log.info("type: %s", type);
  // log.groupEnd();

  // IDEA: detect if we are inside of a View instance
  // let context = { ...parentHostContext };
  // if (type.toLowerCase().includes("view")) {
  //   context.insideView = true;
  // }
  // return context;

  return parentHostContext;
}

/**
 * Determines what object gets exposed as a ref. You'll likely want to return the `instance` itself.
 * But in some cases it might make sense to only expose some part of it.
 *
 * If you don't want to do anything here, return `instance`.
 */
export function getPublicInstance(instance: Instance): Instance {
  // log.group("getPublicInstance");
  // log.info("instance: %O", instance);
  // log.groupEnd();

  return instance;
}

/**
 * Possibly explicitly cleanup layer here?
 *
 * Undocumented
 */
export function detachDeletedInstance(instance: Instance): void {
  // log.group("detachDeletedInstance");
  // log.info("instance: %O", instance);
  // log.groupEnd();
}

/**
 * The constant you return depends on which event, if any, is being handled right now. (In the browser,
 * you can check this using `window.event && window.event.type`).
 *
 * - **Discrete events**: If the active event is directly caused by the user (such as mouse and keyboard events)
 * and each event in a sequence is intentional (e.g. click), return DiscreteEventPriority. This tells React
 * that they should interrupt any background work and cannot be batched across time.
 *
 * - **Continuous events**: If the active event is directly caused by the user but the user can't distinguish
 * between individual events in a sequence (e.g. mouseover), return ContinuousEventPriority. This tells React
 * they should interrupt any background work but can be batched across time.
 *
 * - **Other events / No active event**: In all other cases, return DefaultEventPriority. This tells React that
 * this event is considered background work, and interactive events will be prioritized over it.
 */
export function getCurrentEventPriority(): number {
  // log.group("getCurrentEventPriority");
  // log.groupEnd();

  // TODO: check to see if we can hoist this out of function
  const globalScope =
    (typeof self !== "undefined" && self) ||
    (typeof window !== "undefined" && window);

  if (!globalScope) {
    return DefaultEventPriority;
  }

  // NOTE: window.event is technically deprecated but React does not pass the event
  // to this host function for some reason so we have to use it.
  switch (globalScope.event?.type) {
    case "click":
    case "contextmenu":
    case "dblclick":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
      return DiscreteEventPriority;
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "pointerenter":
    case "pointerleave":
    case "wheel":
      return ContinuousEventPriority;
    default:
      return DefaultEventPriority;
  }
}

/**
 * Undocumented and untyped
 */
export function setCurrentUpdatePriority(newPriority: number): void {
  // log.group("setCurrentUpdatePriority");
  // log.groupEnd();

  currentUpdatePriority = newPriority;
}

/**
 * Undocumented and untyped
 */
export function getCurrentUpdatePriority() {
  // log.group("getCurrentUpdatePriority");
  // log.groupEnd();

  return currentUpdatePriority;
}

/**
 * Undocumented and untyped
 */
export function resolveUpdatePriority() {
  // log.group("resolveUpdatePriority");
  // log.groupEnd();

  if (currentUpdatePriority !== DefaultEventPriority) {
    return currentUpdatePriority;
  }

  return currentEventPriority;
}

/**
 * Undocumented and untyped
 */
export function maySuspendCommit(type: Type, props: Props) {
  // log.group("maySuspendCommit");
  // log.groupEnd();

  return false;
}

/**
 * Undocumented
 */
export function getInstanceFromNode(node: any): Fiber | null | undefined {
  // log.group("getInstanceFromNode");
  // log.groupEnd();

  return null;
}

/**
 * Undocumented
 */
export function beforeActiveInstanceBlur(): void {
  // log.group("beforeActiveInstanceBlur");
  // log.groupEnd();
}

/**
 * Undocumented
 */
export function afterActiveInstanceBlur(): void {
  // log.group("afterActiveInstanceBlur");
  // log.groupEnd();
}

/**
 * Undocumented
 */
export function getInstanceFromScope(scopeInstance: any): null | Instance {
  // log.group("getInstanceFromScope");
  // log.groupEnd();

  return null;
}

/**
 * Undocumented
 */
export function prepareScopeUpdate(scopeInstance: any, instance: any): void {
  // log.group("prepareScopeUpdate");
  // log.groupEnd();
}
