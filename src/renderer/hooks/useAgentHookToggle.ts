import { useState } from "react";
import type { AgentName } from "../../shared/agent-hooks";
import { setAgentHook } from "../store";

export function useAgentHookToggle() {
  const [errors, setErrors] = useState<Partial<Record<AgentName, string>>>({});
  const [pending, setPending] = useState<Partial<Record<AgentName, boolean>>>(
    {},
  );

  async function toggle(name: AgentName, enabled: boolean) {
    setPending((p) => ({ ...p, [name]: true }));
    setErrors((e) => {
      const { [name]: _, ...rest } = e;
      return rest;
    });
    try {
      const result = await setAgentHook(name, enabled);
      if (result.status === "error") {
        setErrors((e) => ({ ...e, [name]: result.message }));
      }
    } catch (err) {
      setErrors((e) => ({ ...e, [name]: String(err) }));
    } finally {
      setPending((p) => {
        const { [name]: _, ...rest } = p;
        return rest;
      });
    }
  }

  return { toggle, pending, errors };
}
