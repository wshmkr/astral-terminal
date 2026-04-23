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
    const kept = node.children
      .map((c) => pruneNode(c, targetId))
      .filter((c): c is PaneNode => c !== null);
    if (kept.length === 0) return null;
    if (kept.length === 1) return kept[0] ?? null;
    return { ...node, children: kept };
  }
  return node;
}

export function findLeafPane(node: PaneNode, paneId: string): LeafPane | null {
  if (node.kind === "leaf") return node.id === paneId ? node : null;
  for (const child of node.children) {
    const found = findLeafPane(child, paneId);
    if (found) return found;
  }
  return null;
}

export function findFirstLeaf(node: PaneNode): string {
  if (node.kind === "leaf") return node.id;
  const [first] = node.children;
  if (!first) throw new Error(`Split pane ${node.id} has no children`);
  return findFirstLeaf(first);
}

function mapLeaves(node: PaneNode, fn: (leaf: LeafPane) => LeafPane): PaneNode {
  if (node.kind === "leaf") {
    const updated = fn(node);
    return updated === node ? node : updated;
  }
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
