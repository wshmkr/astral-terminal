import Checkbox from "@mui/material/Checkbox";
import type { IconType } from "react-icons";
import { SiClaude, SiOpenai } from "react-icons/si";
import {
  type AgentHookProvider,
  type AgentHookStatus,
  type AgentName,
  agentProviders,
  isAgentHookInstalled,
} from "../../../shared/agent-hooks";
import {
  type SetAgentHookFn,
  useAgentHookToggle,
} from "../../hooks/useAgentHookToggle";
import { SettingRow } from "./shared";

const CHECKBOX_SX = { p: 0.5 } as const;

const PROVIDER_ICONS: Record<AgentName, { icon: IconType; color: string }> = {
  Claude: { icon: SiClaude, color: "#D97757" },
  Codex: { icon: SiOpenai, color: "#FFFFFF" },
};

function trustNote(provider: AgentHookProvider, installed: boolean) {
  if (!installed || !provider.requiresHookTrust) return undefined;
  return `${provider.name} asks you to trust new hooks the next time it starts.`;
}

interface Props {
  hookStatuses: Partial<Record<AgentName, AgentHookStatus>>;
  setAgentHook: SetAgentHookFn;
}

export function AgentHookRows({ hookStatuses, setAgentHook }: Props) {
  const { toggle, pending, errors } = useAgentHookToggle(setAgentHook);

  return agentProviders.map((p) => {
    const { icon: Icon, color } = PROVIDER_ICONS[p.name];
    const error = errors[p.name];
    const installed = isAgentHookInstalled(hookStatuses[p.name]);
    return (
      <SettingRow
        key={p.name}
        title={p.name}
        icon={<Icon size={16} color={color} />}
        description={error ?? trustNote(p, installed)}
        descriptionTone={error ? "error" : "default"}
        control={
          <Checkbox
            size="small"
            sx={CHECKBOX_SX}
            checked={installed}
            disabled={!!pending[p.name]}
            onChange={(_, checked) => toggle(p.name, checked)}
          />
        }
      />
    );
  });
}
