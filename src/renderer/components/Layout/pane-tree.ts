import type { LeafPane, PaneNode, Surface } from "../../../shared/types";

export function mapNode(
  node: PaneNode,
  targetId: string,
  fn: (n: PaneNode) => PaneNode,
): PaneNode {
  if (node.id === targetId) return fn(node);
  if (node.kind === "split") {
    const children = node.children.map((c) => mapNode(c, targetId, fn));
    if (children.every((c, i) => c === node.children[i])) return node;
    return { ...node, children };
  }
  return node;
}

export function pruneNode(node: PaneNode, targetId: string): PaneNode | null {
  if (node.id === targetId) return null;
  if (node.kind === "split") {
    const kept: PaneNode[] = [];
    const keptSizes: number[] = [];
    node.children.forEach((child, i) => {
      const pruned = pruneNode(child, targetId);
      if (pruned === null) return;
      kept.push(pruned);
      const size = node.sizes?.[i];
      if (size !== undefined) keptSizes.push(size);
    });
    if (kept.length === 0) return null;
    if (kept.length === 1) return kept[0] ?? null;
    return {
      ...node,
      children: kept,
      sizes: keptSizes.length === kept.length ? keptSizes : undefined,
    };
  }
  return node;
}

export function findNode(node: PaneNode, id: string): PaneNode | null {
  if (node.id === id) return node;
  if (node.kind === "split") {
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function findLeafWhere(
  node: PaneNode,
  predicate: (leaf: LeafPane) => boolean,
): LeafPane | null {
  if (node.kind === "leaf") return predicate(node) ? node : null;
  for (const child of node.children) {
    const found = findLeafWhere(child, predicate);
    if (found) return found;
  }
  return null;
}

export function findLeafPane(node: PaneNode, paneId: string): LeafPane | null {
  return findLeafWhere(node, (leaf) => leaf.id === paneId);
}

export function findFirstLeaf(node: PaneNode): string {
  if (node.kind === "leaf") return node.id;
  const [first] = node.children;
  if (!first) throw new Error(`Split pane ${node.id} has no children`);
  return findFirstLeaf(first);
}

function mapLeaves(node: PaneNode, fn: (leaf: LeafPane) => LeafPane): PaneNode {
  if (node.kind === "leaf") return fn(node);
  const children = node.children.map((c) => mapLeaves(c, fn));
  if (children.every((c, i) => c === node.children[i])) return node;
  return { ...node, children };
}

export function forEachLeaf(
  node: PaneNode,
  fn: (leaf: LeafPane) => void,
): void {
  if (node.kind === "leaf") {
    fn(node);
    return;
  }
  for (const child of node.children) forEachLeaf(child, fn);
}

export function collectSurfaceIds(node: PaneNode): string[] {
  const ids: string[] = [];
  forEachLeaf(node, (leaf) => {
    for (const s of leaf.surfaces) ids.push(s.id);
  });
  return ids;
}

export function updateLeafInLayout(
  layout: PaneNode,
  paneId: string,
  updater: (leaf: LeafPane) => LeafPane,
): PaneNode {
  return mapLeaves(layout, (leaf) =>
    leaf.id === paneId ? updater(leaf) : leaf,
  );
}

export function getActiveSurface(leaf: LeafPane): Surface | undefined {
  return leaf.surfaces.find((s) => s.id === leaf.activeSurfaceId);
}
