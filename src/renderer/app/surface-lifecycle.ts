import { type MutableRefObject, useEffect, useRef } from "react";
import { useWorkspaceStore } from "../store";

export interface SurfaceController {
  setVisible(visible: boolean): void;
  remeasure(): void;
  focus(): void;
  dispose(): void;
}

export interface UseSurfaceLifecycleArgs<C extends SurfaceController> {
  paneId: string;
  isVisible: boolean;
  mountKey: string;
  create: (signal: AbortSignal) => C | Promise<C>;
  canFocus?: () => boolean;
}

export function useSurfaceLifecycle<C extends SurfaceController>(
  args: UseSurfaceLifecycleArgs<C>,
): MutableRefObject<C | null> {
  const { paneId, isVisible, mountKey, create, canFocus } = args;
  const controllerRef = useRef<C | null>(null);
  const createRef = useRef(create);
  createRef.current = create;
  const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: create is read via ref to keep mountKey the sole remount trigger
  useEffect(() => {
    const abort = new AbortController();
    Promise.resolve(createRef.current(abort.signal))
      .then((controller) => {
        if (abort.signal.aborted) {
          controller.dispose();
          return;
        }
        controllerRef.current = controller;
      })
      .catch(() => {});
    return () => {
      abort.abort();
      if (controllerRef.current) {
        controllerRef.current.dispose();
        controllerRef.current = null;
      }
    };
  }, [mountKey]);

  useEffect(() => {
    controllerRef.current?.setVisible(isVisible);
  }, [isVisible]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: paneId change reparents the slot; remeasure to follow
  useEffect(() => {
    if (!isVisible) return;
    const handle = requestAnimationFrame(() =>
      controllerRef.current?.remeasure(),
    );
    return () => cancelAnimationFrame(handle);
  }, [isVisible, paneId]);

  useEffect(() => {
    if (!isVisible || focusedPaneId !== paneId) return;
    if (canFocus && !canFocus()) return;
    const handle = requestAnimationFrame(() => controllerRef.current?.focus());
    return () => cancelAnimationFrame(handle);
  }, [isVisible, focusedPaneId, paneId, canFocus]);

  return controllerRef;
}
