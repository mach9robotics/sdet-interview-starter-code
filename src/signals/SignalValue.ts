import type { Disposable } from "./Disposable";
import { type Listener, type ReadonlySignal, Signal } from "./Signal";

export interface ReadonlySignalValue<T> extends ReadonlySignal<T> {
  readonly value: T;
}

export class SignalValue<T> implements ReadonlySignalValue<T> {
  private readonly changed = new Signal<T>();
  private current: T;

  constructor(
    initial: T,
    private readonly equals: (a: T, b: T) => boolean = Object.is,
  ) {
    this.current = initial;
  }

  get value(): T {
    return this.current;
  }

  set(next: T): void {
    if (this.equals(this.current, next)) return;
    this.current = next;
    this.changed.emit(next);
  }

  connect(listener: Listener<T>): Disposable {
    return this.changed.connect(listener);
  }
}
