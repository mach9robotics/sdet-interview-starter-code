import type { LucideIcon } from "lucide-react";
import {
  Button,
  type ButtonProps,
  ToggleButton,
  type ToggleButtonProps,
} from "react-aria-components";
import { Tooltip } from "./Tooltip";

type Size = "sm" | "md";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "size-6 rounded",
  md: "size-8 rounded-md",
};

const ICON_SIZE: Record<Size, number> = { sm: 14, md: 18 };

const base =
  "inline-flex shrink-0 items-center justify-center text-icon outline-none transition-colors " +
  "data-[hovered]:bg-hover data-[pressed]:bg-pressed data-[focus-visible]:ring-1 data-[focus-visible]:ring-line-focus " +
  "data-[disabled]:opacity-35";

interface CommonProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly size?: Size;
  readonly tooltip?: string | false;
  readonly tooltipPlacement?: "top" | "bottom" | "left" | "right";
}

export function IconButton({
  icon: Icon,
  label,
  size = "sm",
  tooltip,
  tooltipPlacement,
  className,
  ...props
}: CommonProps & Omit<ButtonProps, "children" | "className"> & { className?: string }) {
  const button = (
    <Button
      aria-label={label}
      className={`${base} ${SIZE_CLASSES[size]} ${className ?? ""}`}
      {...props}
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={1.75} aria-hidden />
    </Button>
  );
  if (tooltip === false) return button;
  return (
    <Tooltip content={tooltip ?? label} placement={tooltipPlacement}>
      {button}
    </Tooltip>
  );
}

export function ToggleIconButton({
  icon: Icon,
  label,
  size = "sm",
  tooltip,
  tooltipPlacement,
  className,
  ...props
}: CommonProps & Omit<ToggleButtonProps, "children" | "className"> & { className?: string }) {
  const button = (
    <ToggleButton
      aria-label={label}
      className={`${base} ${SIZE_CLASSES[size]} data-[selected]:bg-selected data-[selected]:text-fg-brand ${className ?? ""}`}
      {...props}
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={1.75} aria-hidden />
    </ToggleButton>
  );
  if (tooltip === false) return button;
  return (
    <Tooltip content={tooltip ?? label} placement={tooltipPlacement}>
      {button}
    </Tooltip>
  );
}
