import * as React from "react";
import { cn } from "@/lib/utils";

type GridProps = React.HTMLAttributes<HTMLDivElement> & {
  columns?: "1" | "2" | "3" | "4" | { initial?: string; sm?: string; md?: string; lg?: string };
  gap?: "1" | "2" | "3" | "4" | "5" | "6";
};

export function Grid({ columns = "1", gap, className, children, ...props }: GridProps) {
  const gapClasses = {
    "1": "gap-1",
    "2": "gap-2",
    "3": "gap-3",
    "4": "gap-4",
    "5": "gap-5",
    "6": "gap-6",
  };

  let columnsClasses = "";
  if (typeof columns === "object") {
    if (columns.initial) columnsClasses += `grid-cols-${columns.initial} `;
    if (columns.sm) columnsClasses += `sm:grid-cols-${columns.sm} `;
    if (columns.md) columnsClasses += `md:grid-cols-${columns.md} `;
    if (columns.lg) columnsClasses += `lg:grid-cols-${columns.lg}`;
  } else {
    columnsClasses = `grid-cols-${columns}`;
  }

  return (
    <div
      className={cn(
        "grid",
        columnsClasses,
        gap && gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
