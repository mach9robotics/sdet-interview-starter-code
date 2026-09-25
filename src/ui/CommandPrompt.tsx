import { useEffect, useRef, useState } from "react";
import { Input, Label, TextField } from "react-aria-components";
import { t } from "../i18n/strings";
import { useApp, useSignalValue } from "./hooks";

const TONES = {
  command: "text-fg-muted",
  info: "text-fg",
  error: "text-fg-danger",
} as const;

export function CommandPrompt() {
  const app = useApp();
  const prompt = useSignalValue(app.tools.prompt);
  const history = useSignalValue(app.tools.history);
  const [text, setText] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    app.promptInput = input.current;
    return () => {
      app.promptInput = null;
    };
  }, [app]);

  useEffect(() => {
    if (history.length > 0) log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [history]);

  useEffect(() => {
    const connection = app.tools.toolActive.connect((active) => {
      if (!active && document.activeElement === input.current) input.current?.blur();
    });
    return () => connection.dispose();
  }, [app]);

  return (
    <section
      aria-label={t("prompt.region")}
      className="flex shrink-0 flex-col border-t border-line-subtle bg-panel"
    >
      <div
        ref={log}
        role="log"
        aria-label={t("prompt.history")}
        className="h-[76px] overflow-y-auto px-3 pt-1.5 font-mono text-xs select-text"
      >
        {history.map((line) => (
          <div key={line.id} className={TONES[line.tone]}>
            {line.text}
          </div>
        ))}
      </div>
      <form
        className="flex h-8 items-center gap-2 border-t border-line-subtle px-3"
        onSubmit={(e) => {
          e.preventDefault();
          const submitted = text;
          setText("");
          app.tools.submit(submitted);
          if (!app.tools.toolActive.value) input.current?.blur();
        }}
      >
        <TextField value={text} onChange={setText} className="flex flex-1 items-center gap-2">
          <Label className="shrink-0 font-mono text-sm whitespace-nowrap text-fg-brand">
            {prompt}:
          </Label>
          <Input
            ref={input}
            autoComplete="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setText("");
                if (!app.tools.escape()) app.selection.clear();
                e.currentTarget.blur();
              }
            }}
            className="h-6 min-w-0 flex-1 bg-transparent font-mono text-sm text-fg outline-none placeholder:text-fg-faint"
            placeholder={
              prompt === t("prompt.idle")
                ? t("prompt.idlePlaceholder")
                : t("prompt.activePlaceholder")
            }
          />
        </TextField>
      </form>
    </section>
  );
}
