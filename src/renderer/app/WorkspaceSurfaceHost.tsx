import { useDroppable } from "@dnd-kit/core";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { PaneNode, Surface, Workspace } from "../../shared/types";
import { forEachLeaf } from "../components/Layout/pane-tree";
import { TerminalPane } from "../components/Terminal/TerminalPane";
import { useSurfaceBody } from "./SurfaceBodyRegistry";

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

interface SurfaceViewProps {
  workspaceId: string;
  paneId: string;
  surface: Surface;
  isVisible: boolean;
}

function SurfaceView({
  workspaceId,
  paneId,
  surface,
  isVisible,
}: SurfaceViewProps) {
  switch (surface.type) {
    case "terminal":
      return (
        <TerminalPane
          workspaceId={workspaceId}
          paneId={paneId}
          surface={surface}
          isVisible={isVisible}
        />
      );
  }
}

function applySlotStyles(slot: HTMLDivElement, isVisible: boolean) {
  slot.style.cssText = `width:100%;height:100%;display:${isVisible ? "flex" : "none"}`;
}

function createSlot(): HTMLDivElement {
  const el = document.createElement("div");
  applySlotStyles(el, false);
  return el;
}

function SurfacePortal({
  workspaceId,
  surface,
  paneId,
  isVisible,
}: SurfaceViewProps) {
  const [slot] = useState(createSlot);
  const surfaceBody = useSurfaceBody(paneId);
  const { setNodeRef: setDropRef } = useDroppable({
    id: `surface-drop:${surface.id}`,
    data: { type: "pane", paneId },
    disabled: !isVisible,
  });

  useLayoutEffect(() => {
    if (!surfaceBody) return;
    if (slot.parentElement !== surfaceBody) {
      surfaceBody.appendChild(slot);
    }
  }, [surfaceBody, slot]);

  useLayoutEffect(() => {
    applySlotStyles(slot, isVisible);
  }, [isVisible, slot]);

  useLayoutEffect(() => {
    setDropRef(slot);
    return () => setDropRef(null);
  }, [setDropRef, slot]);

  useEffect(() => () => slot.remove(), [slot]);

  return createPortal(
    <SurfaceView
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

export function WorkspaceSurfaceHost({ workspace }: Props) {
  const items = useMemo(
    () => collectSurfaces(workspace.layout),
    [workspace.layout],
  );

  return (
    <>
      {items.map(({ surface, paneId, isVisible }) => (
        <SurfacePortal
          key={surface.id}
          workspaceId={workspace.id}
          surface={surface}
          paneId={paneId}
          isVisible={isVisible}
        />
      ))}
    </>
  );
}
