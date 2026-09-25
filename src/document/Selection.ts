import { SignalValue } from "../signals";

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((id) => b.has(id));

export class Selection {
  readonly ids = new SignalValue<ReadonlySet<string>>(new Set(), sameSet);

  get size(): number {
    return this.ids.value.size;
  }

  has(id: string): boolean {
    return this.ids.value.has(id);
  }

  set(ids: Iterable<string>): void {
    this.ids.set(new Set(ids));
  }

  add(ids: Iterable<string>): void {
    this.ids.set(new Set([...this.ids.value, ...ids]));
  }

  remove(ids: Iterable<string>): void {
    const drop = new Set(ids);
    this.ids.set(new Set([...this.ids.value].filter((id) => !drop.has(id))));
  }

  clear(): void {
    this.ids.set(new Set());
  }
}
