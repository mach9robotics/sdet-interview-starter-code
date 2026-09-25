import { t } from "../i18n/strings";
import { CommandPrompt } from "./CommandPrompt";
import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { StatusBar } from "./StatusBar";
import { Toolbar } from "./Toolbar";
import { ViewportPane } from "./ViewportPane";

export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-line-subtle bg-app px-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className="text-fg-brand"
        >
          <path d="M2 13V5h12v8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M1 5h14" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        <h1 className="text-sm font-semibold text-fg">Lintel</h1>
        <span className="text-sm text-fg-faint">{t("app.untitled")}</span>
      </header>
      <div className="flex min-h-0 flex-1">
        <Toolbar />
        <main className="flex min-w-0 flex-1 flex-col">
          <ViewportPane />
          <CommandPrompt />
        </main>
        <aside className="flex w-[292px] shrink-0 flex-col gap-px border-l border-line-subtle bg-line-subtle">
          <LayersPanel />
          <PropertiesPanel />
        </aside>
      </div>
      <StatusBar />
    </div>
  );
}
