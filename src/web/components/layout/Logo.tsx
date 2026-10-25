import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        inverted ? "bg-white text-primary" : "bg-primary text-primary-foreground",
        className,
      )}
    >
      <Wrench className="size-4.5" />
    </span>
  );
}

/** `inverted` is for dark/colored backgrounds such as the login brand panel. */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark inverted={inverted} />
      <span className={cn("text-lg font-semibold tracking-tight", inverted ? "text-white" : "text-mono")}>RepairME</span>
    </span>
  );
}
