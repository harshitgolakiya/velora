import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MotionReveal({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("motion-reveal", className)}>{children}</div>;
}
