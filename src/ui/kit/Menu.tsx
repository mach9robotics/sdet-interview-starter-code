import type { ReactNode } from "react";
import { Menu, MenuItem, type MenuItemProps, Popover } from "react-aria-components";

export function MenuPopover({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Popover
      placement="bottom end"
      offset={4}
      className="min-w-44 rounded-md bg-menu p-1 shadow-elevation-300 outline-none"
    >
      <Menu aria-label={label} className="outline-none">
        {children}
      </Menu>
    </Popover>
  );
}

export function MenuRow({
  children,
  danger,
  ...props
}: MenuItemProps & { children: ReactNode; danger?: boolean }) {
  return (
    <MenuItem
      {...props}
      className={`flex cursor-default items-center gap-2 rounded px-2 py-1 text-sm outline-none data-[disabled]:opacity-40 data-[focused]:bg-hover ${danger ? "text-fg-danger" : "text-fg"}`}
    >
      {children}
    </MenuItem>
  );
}
