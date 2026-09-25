import type { ReactNode } from "react";

interface Props {
  readonly title: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Panel({ title, actions, children, className }: Props) {
  return (
    <section aria-label={title} className={`flex min-h-0 flex-col bg-panel ${className ?? ""}`}>
      <header className="flex h-8 shrink-0 items-center justify-between border-b border-line-subtle pr-1 pl-3">
        <h2 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">{title}</h2>
        <div className="flex items-center gap-0.5">{actions}</div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}
