import type { ReactElement, ReactNode } from "react";
import { Tooltip as AriaTooltip, TooltipTrigger } from "react-aria-components";

interface Props {
  readonly content: ReactNode;
  readonly placement?: "top" | "bottom" | "left" | "right";
  readonly children: ReactElement;
}

export function Tooltip({ content, placement = "right", children }: Props) {
  return (
    <TooltipTrigger delay={450} closeDelay={0}>
      {children}
      <AriaTooltip
        placement={placement}
        offset={6}
        className="rounded-md bg-tooltip px-2 py-1 text-xs text-fg shadow-elevation-200"
      >
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
}
