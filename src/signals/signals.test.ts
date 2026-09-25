import { describe, expect, it, vi } from "vitest";
import { CompositeDisposable, Signal, SignalValue } from ".";

describe("Signal", () => {
  it("delivers payloads until the connection is disposed", () => {
    const signal = new Signal<number>();
    const listener = vi.fn();
    const connection = signal.connect(listener);
    signal.emit(1);
    connection.dispose();
    signal.emit(2);
    expect(listener.mock.calls).toEqual([[1]]);
  });

  it("lets a listener disconnect itself mid-emit without skipping others", () => {
    const signal = new Signal();
    const second = vi.fn();
    const first = signal.connect(() => first.dispose());
    signal.connect(second);
    signal.emit();
    expect(second).toHaveBeenCalledOnce();
  });
});

describe("SignalValue", () => {
  it("emits only on change", () => {
    const value = new SignalValue("a");
    const listener = vi.fn();
    value.connect(listener);
    value.set("a");
    value.set("b");
    expect(listener.mock.calls).toEqual([["b"]]);
    expect(value.value).toBe("b");
  });
});

describe("CompositeDisposable", () => {
  it("disposes children in reverse order and immediately after disposal", () => {
    const order: number[] = [];
    const composite = new CompositeDisposable();
    composite.add({ dispose: () => order.push(1) }, { dispose: () => order.push(2) });
    composite.dispose();
    composite.add({ dispose: () => order.push(3) });
    expect(order).toEqual([2, 1, 3]);
  });
});
