import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  isTerminalSurface,
  type PaneNode,
  type Surface,
  type Workspace,
} from "../../../shared/types";
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
}

function createSlot(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "width:100%;height:100%";
  return el;
}

function TerminalPortal({
  workspaceId,
  surface,
  paneId,
  isVisible,
}: PortalProps) {
  const [slot] = useState(createSlot);
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

  useEffect(() => () => slot.remove(), [slot]);

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

  return (
    <>
      {items.map(({ surface, paneId, isVisible }) => (
        <TerminalPortal
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
