import type { DrawingDocument, Selection } from "../document";
import type { Geometry, Plane, Vec3 } from "../geometry";
import { t } from "../i18n/strings";
import { CompositeDisposable, SignalValue } from "../signals";
import type { PointRequest, ViewportInput } from "../viewport";
import {
  type ActionId,
  COMMANDS,
  type CommandId,
  findCommand,
  isToolId,
  TOOL_FACTORIES,
} from "./commands";
import { parseInput } from "./input";
import type { LogTone, Tool, ToolHost } from "./Tool";

export interface LogLine {
  readonly id: number;
  readonly text: string;
  readonly tone: LogTone;
}

const HISTORY_LIMIT = 300;

export class ToolManager implements ViewportInput {
  readonly active = new SignalValue<Tool | null>(null);
  readonly activeId = new SignalValue<CommandId | null>(null);
  readonly prompt = new SignalValue(t("prompt.idle"));
  readonly pointRequest = new SignalValue<PointRequest | null>(null);
  readonly preview = new SignalValue<readonly Geometry[]>([]);
  readonly toolActive = new SignalValue(false);
  readonly history = new SignalValue<readonly LogLine[]>([]);
  private toolConnections = new CompositeDisposable();
  private lastCommand: CommandId | null = null;
  private nextLine = 1;

  constructor(
    private readonly doc: DrawingDocument,
    private readonly selection: Selection,
    private readonly plane: () => Plane,
    private readonly actions: Record<ActionId, () => void>,
  ) {}

  log(text: string, tone: LogTone = "info"): void {
    const lines = [...this.history.value, { id: this.nextLine++, text, tone }];
    this.history.set(lines.slice(-HISTORY_LIMIT));
  }

  run(id: CommandId): void {
    this.cancelActive(false);
    const info = COMMANDS.find((c) => c.id === id);
    if (!isToolId(id)) {
      this.actions[id as ActionId]();
      return;
    }
    this.lastCommand = id;
    this.log(t("log.command", { name: info?.label ?? id }), "command");
    const host: ToolHost = {
      doc: this.doc,
      selection: this.selection,
      plane: this.plane,
      log: (text, tone) => this.log(text, tone),
      finish: () => this.finish(tool),
    };
    const tool = TOOL_FACTORIES[id](host);
    this.active.set(tool);
    this.activeId.set(id);
    this.toolActive.set(true);
    this.toolConnections = new CompositeDisposable();
    this.toolConnections.add(
      tool.prompt.connect((p) => this.prompt.set(p)),
      tool.request.connect((r) => this.pointRequest.set(r)),
      tool.preview.connect((g) => this.preview.set(g)),
    );
    tool.start();
    if (this.active.value === tool) {
      this.prompt.set(tool.prompt.value);
      this.pointRequest.set(tool.request.value);
    }
  }

  /** Handles a line typed into the Command Prompt. */
  submit(text: string): void {
    const tool = this.active.value;
    const parsed = parseInput(text, this.plane(), tool?.anchor ?? null);
    if (tool && text.trim() !== "") this.log(`${this.prompt.value}: ${text.trim()}`, "command");
    if (!tool) {
      if (parsed.kind === "empty") {
        if (this.lastCommand) this.run(this.lastCommand);
        return;
      }
      const command = parsed.kind === "word" ? findCommand(parsed.value) : undefined;
      if (command) this.run(command.id);
      else this.log(t("error.unknownCommand", { text: text.trim() }), "error");
      return;
    }
    switch (parsed.kind) {
      case "empty":
        tool.enter();
        return;
      case "point":
        if (!tool.request.value) {
          this.log(t("error.noPointHere"), "error");
          return;
        }
        this.pick(parsed.point);
        return;
      case "number":
        if (!tool.number(parsed.value)) this.log(t("error.noNumberHere"), "error");
        return;
      case "word":
        if (!tool.word(parsed.value))
          this.log(t("error.notAnOption", { text: text.trim() }), "error");
        return;
      case "error":
        this.log(parsed.message, "error");
        return;
    }
  }

  enter(): void {
    this.submit("");
  }

  /** Returns true if there was a tool to cancel. */
  escape(): boolean {
    return this.cancelActive(true);
  }

  hover(point: Vec3 | null): void {
    this.active.value?.hover(point);
  }

  pick(point: Vec3): void {
    const tool = this.active.value;
    if (!tool?.request.value) return;
    tool.pick(point);
  }

  /** A cancelled tool may finish itself (Copy keeps the copies it made); finish() is a no-op then. */
  private cancelActive(announce: boolean): boolean {
    const tool = this.active.value;
    if (!tool) return false;
    if (announce) tool.cancel();
    this.finish(tool);
    return true;
  }

  private finish(tool: Tool): void {
    if (this.active.value !== tool) return;
    this.toolConnections.dispose();
    this.active.set(null);
    this.activeId.set(null);
    this.toolActive.set(false);
    this.prompt.set(t("prompt.idle"));
    this.pointRequest.set(null);
    this.preview.set([]);
  }
}
