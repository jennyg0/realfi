import * as React from "react";
import { cn } from "@/lib/utils";

// Heading component
type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  size?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
};

export function Heading({ size = "4", as, className, children, ...props }: HeadingProps) {
  const sizeClasses = {
    "1": "text-xs",
    "2": "text-sm",
    "3": "text-base",
    "4": "text-lg",
    "5": "text-xl",
    "6": "text-2xl",
    "7": "text-3xl",
    "8": "text-4xl",
    "9": "text-5xl",
  };

  const Component = as || (size === "9" || size === "8" ? "h1" : size === "7" || size === "6" ? "h2" : "h3");

  return (
    <Component
      className={cn("font-bold tracking-tight", sizeClasses[size], className)}
      {...props}
    >
      {children}
    </Component>
  );
}

// Text component
type TextProps = React.HTMLAttributes<HTMLSpanElement> & {
  size?: "1" | "2" | "3" | "4" | "5" | "6";
  weight?: "light" | "regular" | "medium" | "bold";
  color?: "gray" | "red" | "blue" | "green";
  as?: "p" | "span" | "div";
};

export function Text({ size = "2", weight = "regular", color, as = "span", className, children, ...props }: TextProps) {
  const sizeClasses = {
    "1": "text-xs",
    "2": "text-sm",
    "3": "text-base",
    "4": "text-lg",
    "5": "text-xl",
    "6": "text-2xl",
  };

  const weightClasses = {
    light: "font-light",
    regular: "font-normal",
    medium: "font-medium",
    bold: "font-bold",
  };

  const colorClasses = {
    gray: "text-muted-foreground",
    red: "text-red-600",
    blue: "text-blue-600",
    green: "text-green-600",
  };

  const Component = as;

  return (
    <Component
      className={cn(
        sizeClasses[size],
        weightClasses[weight],
        color && colorClasses[color],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
