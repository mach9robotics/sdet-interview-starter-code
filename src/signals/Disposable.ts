export interface Disposable {
  dispose(): void;
}

export class CompositeDisposable implements Disposable {
  private items: Disposable[] = [];
  private disposed = false;

  add(...items: Disposable[]): void {
    if (this.disposed) {
      for (const item of items) item.dispose();
      return;
    }
    this.items.push(...items);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const items = this.items;
    this.items = [];
    for (const item of items.reverse()) item.dispose();
  }
}

export function disposable(dispose: () => void): Disposable {
  let done = false;
  return {
    dispose() {
      if (done) return;
      done = true;
      dispose();
    },
  };
}
