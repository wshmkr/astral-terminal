import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

type Listener = () => void;

interface RegistryAPI {
  register: (paneId: string, el: HTMLElement | null) => void;
  subscribe: (paneId: string, listener: Listener) => () => void;
  get: (paneId: string) => HTMLElement | null;
}

const RegistryContext = createContext<RegistryAPI | null>(null);

export function SurfaceBodyRegistryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const bodiesRef = useRef<Map<string, HTMLElement>>(new Map());
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  const register = useCallback((paneId: string, el: HTMLElement | null) => {
    const bodies = bodiesRef.current;
    const prev = bodies.get(paneId) ?? null;
    if (el === prev) return;
    if (el) bodies.set(paneId, el);
    else bodies.delete(paneId);
    const ls = listenersRef.current.get(paneId);
    if (ls) for (const l of ls) l();
  }, []);

  const subscribe = useCallback((paneId: string, listener: Listener) => {
    let set = listenersRef.current.get(paneId);
    if (!set) {
      set = new Set();
      listenersRef.current.set(paneId, set);
    }
    set.add(listener);
    return () => {
      const s = listenersRef.current.get(paneId);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) listenersRef.current.delete(paneId);
    };
  }, []);

  const get = useCallback(
    (paneId: string) => bodiesRef.current.get(paneId) ?? null,
    [],
  );

  const api = useMemo<RegistryAPI>(
    () => ({ register, subscribe, get }),
    [register, subscribe, get],
  );

  return (
    <RegistryContext.Provider value={api}>{children}</RegistryContext.Provider>
  );
}

function useRegistry(): RegistryAPI {
  const api = useContext(RegistryContext);
  if (!api) {
    throw new Error(
      "SurfaceBodyRegistry hooks must be used within SurfaceBodyRegistryProvider",
    );
  }
  return api;
}

export function useSurfaceBodyRegister() {
  return useRegistry().register;
}

export function useSurfaceBody(paneId: string): HTMLElement | null {
  const { subscribe, get } = useRegistry();
  return useSyncExternalStore(
    useCallback((cb) => subscribe(paneId, cb), [subscribe, paneId]),
    useCallback(() => get(paneId), [get, paneId]),
  );
}
