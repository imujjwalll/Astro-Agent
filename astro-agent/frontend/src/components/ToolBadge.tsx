import { clsx } from "clsx";

const TOOL_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  geocode_city: {
    icon: "🌍",
    label: "Locating City Coordinates",
    color: "from-sky-500/20 to-sky-600/20 border-sky-500/30 text-sky-300",
  },
  compute_birth_chart: {
    icon: "🔭",
    label: "Calculating Planetary Positions",
    color: "from-nebula-500/20 to-nebula-600/20 border-nebula-500/30 text-nebula-300",
  },
};

const DEFAULT_TOOL = {
  icon: "⚙️",
  label: "Executing Tool",
  color: "from-cosmos-500/20 to-cosmos-600/20 border-cosmos-500/30 text-cosmos-300",
};

interface ToolBadgeProps {
  toolName: string;
  isActive?: boolean;
  isComplete?: boolean;
  success?: boolean;
}

export function ToolBadge({ toolName, isActive = false, isComplete = false, success = true }: ToolBadgeProps) {
  const config = TOOL_LABELS[toolName] ?? DEFAULT_TOOL;

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        "bg-gradient-to-r border backdrop-blur-sm",
        "transition-all duration-300",
        config.color,
        isActive && "tool-badge-active",
        isComplete && !success && "opacity-50"
      )}
    >
      <span className={clsx("text-sm", isActive && "animate-spin-slow")} role="img" aria-label={config.label}>
        {isComplete ? (success ? "✅" : "❌") : config.icon}
      </span>
      <span>{config.label}</span>
      {isActive && (
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-current animate-[typing_1.2s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
          <span className="w-1 h-1 rounded-full bg-current animate-[typing_1.2s_ease-in-out_infinite]" style={{ animationDelay: "200ms" }} />
          <span className="w-1 h-1 rounded-full bg-current animate-[typing_1.2s_ease-in-out_infinite]" style={{ animationDelay: "400ms" }} />
        </span>
      )}
    </div>
  );
}
