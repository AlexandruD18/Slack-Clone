interface PresenceIndicatorProps {
  status: "online" | "away" | "busy" | "offline";
  size?: "sm" | "md" | "lg";
  showRing?: boolean;
}

export function PresenceIndicator({ 
  status, 
  size = "md", 
  showRing = true 
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const statusColors = {
    online: "bg-status-online",
    away: "bg-status-away",
    busy: "bg-status-busy",
    offline: "bg-status-offline",
  };

  return (
    <span
      className={`
        ${sizeClasses[size]} 
        ${statusColors[status]} 
        rounded-full 
        absolute 
        bottom-0 
        right-0
        ${showRing ? "ring-2 ring-background" : ""}
      `}
      data-testid={`presence-indicator-${status}`}
    />
  );
}
