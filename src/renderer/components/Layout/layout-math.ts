import type { LeafPane, PaneNode, SplitDirection } from "../../../shared/types";
import {
  MIN_PANE_SIZE_PX,
  PANE_SPLIT_GAP_PX,
  RESIZE_HANDLE_SIZE_PX,
} from "./layout-constants";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LeafRect {
  pane: LeafPane;
  rect: Rect;
}

export interface HandleInfo {
  id: string;
  splitNodeId: string;
  childIndex: number;
  direction: SplitDirection;
  hitRect: Rect;
}

export interface SplitInfo {
  sizes: number[];
  availableSpace: number;
}

export interface ComputedLayout {
  leaves: LeafRect[];
  handles: HandleInfo[];
  splits: Map<string, SplitInfo>;
}

export interface MinSize {
  width: number;
  height: number;
}

// Smallest box a node can occupy: a leaf is MIN_PANE_SIZE_PX square; a split
// sums its children along its own axis (plus gaps) and takes their max across.
export function paneMinSize(node: PaneNode): MinSize {
  if (node.kind === "leaf") {
    return { width: MIN_PANE_SIZE_PX, height: MIN_PANE_SIZE_PX };
  }
  const childMins = node.children.map(paneMinSize);
  const totalGaps = (node.children.length - 1) * PANE_SPLIT_GAP_PX;
  if (node.direction === "vertical") {
    return {
      width: childMins.reduce((sum, m) => sum + m.width, 0) + totalGaps,
      height: Math.max(...childMins.map((m) => m.height)),
    };
  }
  return {
    width: Math.max(...childMins.map((m) => m.width)),
    height: childMins.reduce((sum, m) => sum + m.height, 0) + totalGaps,
  };
}

// Distribute `available` px across children by fraction, but never below each
// child's minimum. When the minimums don't fit, every child still gets its min
// and the surplus is clipped by the container (overflow: hidden).
function distributeWithMin(
  available: number,
  fractions: number[],
  mins: number[],
): number[] {
  const n = fractions.length;
  const sizes = new Array<number>(n).fill(0);
  const locked = new Array<boolean>(n).fill(false);
  let freeSpace = available;
  let freeFraction = fractions.reduce((sum, f) => sum + f, 0);

  // Repeatedly pin any child whose proportional share is below its min, then
  // redistribute the remaining space among the rest until nothing else pins.
  for (;;) {
    let unlockedCount = 0;
    for (let i = 0; i < n; i++) if (!locked[i]) unlockedCount++;
    if (unlockedCount === 0) break;

    let pinnedAny = false;
    for (let i = 0; i < n; i++) {
      if (locked[i]) continue;
      const share =
        freeFraction > 0
          ? freeSpace * ((fractions[i] ?? 0) / freeFraction)
          : freeSpace / unlockedCount;
      if (share < (mins[i] ?? 0)) {
        locked[i] = true;
        sizes[i] = mins[i] ?? 0;
        freeSpace -= mins[i] ?? 0;
        freeFraction -= fractions[i] ?? 0;
        pinnedAny = true;
      }
    }
    if (!pinnedAny) {
      for (let i = 0; i < n; i++) {
        if (locked[i]) continue;
        sizes[i] =
          freeFraction > 0
            ? freeSpace * ((fractions[i] ?? 0) / freeFraction)
            : freeSpace / unlockedCount;
      }
      break;
    }
  }
  return sizes;
}

export function computeLayout(root: PaneNode, bounds: Rect): ComputedLayout {
  const out: ComputedLayout = { leaves: [], handles: [], splits: new Map() };
  walk(root, bounds, out);
  return out;
}

function walk(node: PaneNode, bounds: Rect, out: ComputedLayout): void {
  if (node.kind === "leaf") {
    out.leaves.push({ pane: node, rect: bounds });
    return;
  }

  const { direction, children, sizes } = node;
  const isVertical = direction === "vertical";
  const totalSpace = isVertical ? bounds.width : bounds.height;
  const totalGaps = (children.length - 1) * PANE_SPLIT_GAP_PX;
  const available = totalSpace - totalGaps;

  const fractions = normalizeFractions(sizes, children.length);
  out.splits.set(node.id, { sizes: fractions, availableSpace: available });

  const childMins = children.map((child) => {
    const m = paneMinSize(child);
    return isVertical ? m.width : m.height;
  });
  const childSizes = distributeWithMin(available, fractions, childMins);

  let offset = isVertical ? bounds.left : bounds.top;
  for (const [i, child] of children.entries()) {
    const childSize = childSizes[i] ?? available / children.length;
    const childBounds: Rect = isVertical
      ? {
          left: offset,
          top: bounds.top,
          width: childSize,
          height: bounds.height,
        }
      : {
          left: bounds.left,
          top: offset,
          width: bounds.width,
          height: childSize,
        };

    walk(child, childBounds, out);
    offset += childSize;

    if (i < children.length - 1) {
      const handleRect: Rect = isVertical
        ? {
            left: offset + PANE_SPLIT_GAP_PX / 2,
            top: bounds.top,
            width: 0,
            height: bounds.height,
          }
        : {
            left: bounds.left,
            top: offset + PANE_SPLIT_GAP_PX / 2,
            width: bounds.width,
            height: 0,
          };
      out.handles.push({
        id: `${node.id}:${i}`,
        splitNodeId: node.id,
        childIndex: i,
        direction,
        hitRect: handleHitRect(handleRect, direction),
      });
      offset += PANE_SPLIT_GAP_PX;
    }
  }
}

function handleHitRect(rect: Rect, direction: SplitDirection): Rect {
  return direction === "vertical"
    ? {
        left: rect.left - RESIZE_HANDLE_SIZE_PX / 2,
        top: rect.top,
        width: RESIZE_HANDLE_SIZE_PX,
        height: rect.height,
      }
    : {
        left: rect.left,
        top: rect.top - RESIZE_HANDLE_SIZE_PX / 2,
        width: rect.width,
        height: RESIZE_HANDLE_SIZE_PX,
      };
}

function normalizeFractions(
  sizes: number[] | undefined,
  count: number,
): number[] {
  if (sizes && sizes.length === count) {
    const sum = sizes.reduce((a, b) => a + b, 0);
    if (sum > 0) return sizes.map((s) => s / sum);
  }
  if (sizes && sizes.length !== count && import.meta.env.DEV) {
    console.warn(
      `normalizeFractions: sizes.length=${sizes.length} != count=${count}; using equal fractions`,
    );
  }
  return Array.from({ length: count }, () => 1 / count);
}

export function resizeSiblings(
  sizes: number[],
  childIndex: number,
  deltaFrac: number,
  minLeftFrac: number,
  minRightFrac: number,
): number[] {
  const origLeft = sizes[childIndex] ?? 0;
  const origRight = sizes[childIndex + 1] ?? 0;
  const clamped = Math.max(
    -(origLeft - minLeftFrac),
    Math.min(origRight - minRightFrac, deltaFrac),
  );
  const next = [...sizes];
  next[childIndex] = origLeft + clamped;
  next[childIndex + 1] = origRight - clamped;
  return next;
}
