import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { PaneNode, Surface, Workspace } from "../../../shared/types";
import { isTerminalSurface } from "../../../shared/types";
import { forEachLeaf } from "../Layout/pane-tree";
import { useSurfaceBody } from "./SurfaceBodyRegistry";
import { TerminalPane } from "./TerminalPane";

interface SurfaceLocation {
  surface: Surface;
  paneId: string;
  isVisible: boolean;
}

function collectSurfaces(node: PaneNode): SurfaceLocation[] {
  const result: SurfaceLocation[] = [];
  forEachLeaf(node, (leaf) => {
    for (const surface of leaf.surfaces) {
      result.push({
        surface,
        paneId: leaf.id,
        isVisible: leaf.activeSurfaceId === surface.id,
      });
    }
  });
  return result;
}

interface PortalProps {
  workspaceId: string;
  surface: Surface;
  paneId: string;
  isVisible: boolean;
  slot: HTMLDivElement;
}

function TerminalPortal({
  workspaceId,
  surface,
  paneId,
  isVisible,
  slot,
}: PortalProps) {
  const surfaceBody = useSurfaceBody(paneId);

  useLayoutEffect(() => {
    if (!surfaceBody) return;
    if (slot.parentElement !== surfaceBody) {
      surfaceBody.appendChild(slot);
    }
  }, [surfaceBody, slot]);

  useLayoutEffect(() => {
    slot.style.display = isVisible ? "flex" : "none";
  }, [isVisible, slot]);

  if (!isTerminalSurface(surface)) return null;
  return createPortal(
    <TerminalPane
      workspaceId={workspaceId}
      paneId={paneId}
      surface={surface}
      isVisible={isVisible}
    />,
    slot,
  );
}

interface Props {
  workspace: Workspace;
}

export function WorkspaceTerminalHost({ workspace }: Props) {
  const items = useMemo(
    () => collectSurfaces(workspace.layout),
    [workspace.layout],
  );
  const slotsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // After each render, drop slot DOM nodes for surfaces no longer present
  useEffect(() => {
    const slots = slotsRef.current;
    const live = new Set(items.map(({ surface }) => surface.id));
    for (const [id, el] of slots) {
      if (!live.has(id)) {
        el.remove();
        slots.delete(id);
      }
    }
  }, [items]);

  // Tear all slots down when the host unmounts (workspace closed)
  useEffect(() => {
    const slots = slotsRef.current;
    return () => {
      for (const el of slots.values()) el.remove();
      slots.clear();
    };
  }, []);

  return (
    <>
      {items.map(({ surface, paneId, isVisible }) => {
        let slot = slotsRef.current.get(surface.id);
        if (!slot) {
          slot = document.createElement("div");
          slot.style.width = "100%";
          slot.style.height = "100%";
          slot.style.display = isVisible ? "flex" : "none";
          slotsRef.current.set(surface.id, slot);
        }
        return (
          <TerminalPortal
            key={surface.id}
            workspaceId={workspace.id}
            surface={surface}
            paneId={paneId}
            isVisible={isVisible}
            slot={slot}
          />
        );
      })}
    </>
  );
}
