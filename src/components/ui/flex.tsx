import * as React from "react";
import { cn } from "@/lib/utils";

type FlexProps = React.HTMLAttributes<HTMLDivElement> & {
  direction?: "row" | "column";
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  gap?: "1" | "2" | "3" | "4" | "5" | "6";
  wrap?: "wrap" | "nowrap";
};

export function Flex({
  direction = "row",
  align,
  justify,
  gap,
  wrap,
  className,
  children,
  ...props
}: FlexProps) {
  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  };

  const gapClasses = {
    "1": "gap-1",
    "2": "gap-2",
    "3": "gap-3",
    "4": "gap-4",
    "5": "gap-5",
    "6": "gap-6",
  };

  return (
    <div
      className={cn(
        "flex",
        direction === "column" && "flex-col",
        align && alignClasses[align],
        justify && justifyClasses[justify],
        gap && gapClasses[gap],
        wrap === "wrap" && "flex-wrap",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
