import type { Key } from "react-aria-components";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

interface Props<T extends string> {
  readonly label: string;
  readonly options: readonly Option<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys: Set<Key>) => {
        const [next] = [...keys];
        if (next !== undefined) onChange(next as T);
      }}
      className="flex rounded-md bg-app/80 p-0.5 shadow-elevation-200 backdrop-blur"
    >
      {options.map((option) => (
        <ToggleButton
          key={option.id}
          id={option.id}
          className="rounded px-2 py-0.5 text-xs text-fg-muted outline-none data-[focus-visible]:ring-1 data-[focus-visible]:ring-line-focus data-[hovered]:text-fg data-[selected]:bg-raised data-[selected]:text-fg"
        >
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
