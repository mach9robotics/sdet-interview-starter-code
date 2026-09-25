import { type Disposable, disposable } from "./Disposable";

export type Listener<T> = (payload: T) => void;

export interface ReadonlySignal<T> {
  connect(listener: Listener<T>): Disposable;
}

export class Signal<T = void> implements ReadonlySignal<T> {
  private listeners: Listener<T>[] = [];

  connect(listener: Listener<T>): Disposable {
    this.listeners = [...this.listeners, listener];
    return disposable(() => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    });
  }

  emit(payload: T): void {
    for (const listener of this.listeners) listener(payload);
  }
}
