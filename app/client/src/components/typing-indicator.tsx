import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  users: string[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return ".";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (users.length === 0) return null;

  const displayText = 
    users.length === 1 
      ? `${users[0]} sta scrivendo` 
      : users.length === 2
      ? `${users[0]} e ${users[1]} stanno scrivendo`
      : `${users.length} persone stanno scrivendo`;

  return (
    <div 
      className="px-4 py-2 text-sm italic text-muted-foreground"
      data-testid="typing-indicator"
    >
      {displayText}{dots}
    </div>
  );
}
