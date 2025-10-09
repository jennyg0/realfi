import * as React from "react";
import { cn } from "@/lib/utils";

type CalloutProps = React.HTMLAttributes<HTMLDivElement> & {
  color?: "red" | "blue" | "green" | "yellow";
};

function CalloutRoot({ color = "blue", className, children, ...props }: CalloutProps) {
  const colorClasses = {
    red: "bg-red-50 border-red-200 text-red-900",
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-lg border",
        colorClasses[color],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CalloutIcon({ children }: { children: React.ReactNode }) {
  return <div className="flex-shrink-0">{children}</div>;
}

function CalloutText({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 text-sm">{children}</div>;
}

export const Callout = {
  Root: CalloutRoot,
  Icon: CalloutIcon,
  Text: CalloutText,
};
