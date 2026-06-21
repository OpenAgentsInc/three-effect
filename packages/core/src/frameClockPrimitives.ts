export type ManagedFrameClockMode = "always" | "demand" | "manual";

export type ManagedFrameClockFrame = Readonly<{
  delta: number;
  frame: number;
  time: number;
}>;

export type ManagedFrameClockCallback = (
  frame: ManagedFrameClockFrame,
) => void;

export type ManagedFrameClockSubscriptionOptions = Readonly<{
  priority?: number;
}>;

export type ManagedFrameClockOptions = Readonly<{
  cancelFrame?: (frame: number) => void;
  mode?: ManagedFrameClockMode;
  now?: () => number;
  requestFrame?: (callback: FrameRequestCallback) => number;
}>;

export type ManagedFrameClockHandle = Readonly<{
  dispose: () => void;
  invalidate: (frames?: number) => void;
  mode: () => ManagedFrameClockMode;
  running: () => boolean;
  start: () => void;
  stop: () => void;
  subscribe: (
    callback: ManagedFrameClockCallback,
    options?: ManagedFrameClockSubscriptionOptions,
  ) => () => void;
  subscriberCount: () => number;
  tick: (time?: number) => void;
}>;

type ManagedFrameClockSubscription = {
  callback: ManagedFrameClockCallback;
  id: number;
  priority: number;
};

const defaultRequestFrame = (callback: FrameRequestCallback): number =>
  requestAnimationFrame(callback);

const defaultCancelFrame = (frame: number): void => {
  cancelAnimationFrame(frame);
};

const defaultNow = (): number => performance.now();

export const createManagedFrameClock = (
  options: ManagedFrameClockOptions = {},
): ManagedFrameClockHandle => {
  const mode = options.mode ?? "always";
  const requestFrame = options.requestFrame ?? defaultRequestFrame;
  const cancelFrame = options.cancelFrame ?? defaultCancelFrame;
  const now = options.now ?? defaultNow;
  const subscriptions: ManagedFrameClockSubscription[] = [];

  let disposed = false;
  let running = false;
  let scheduledFrame: number | null = null;
  let lastTime = 0;
  let frame = 0;
  let nextSubscriptionId = 0;
  let invalidatedFrames = 0;

  const orderedSubscriptions = (): readonly ManagedFrameClockSubscription[] =>
    [...subscriptions].sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      return left.id - right.id;
    });

  const runFrame = (time: number): void => {
    if (disposed) return;
    const delta = lastTime === 0 ? 0 : (time - lastTime) / 1000;
    lastTime = time;
    frame += 1;
    const frameState = { delta, frame, time };
    for (const subscription of orderedSubscriptions()) {
      subscription.callback(frameState);
    }
  };

  const shouldSchedule = (): boolean =>
    running &&
    !disposed &&
    mode !== "manual" &&
    scheduledFrame === null &&
    (mode === "always" || invalidatedFrames > 0);

  const schedule = (): void => {
    if (!shouldSchedule()) return;
    scheduledFrame = requestFrame((time) => {
      scheduledFrame = null;
      runFrame(time);
      if (mode === "demand" && invalidatedFrames > 0) {
        invalidatedFrames -= 1;
      }
      schedule();
    });
  };

  const stop = (): void => {
    running = false;
    lastTime = 0;
    if (scheduledFrame !== null) {
      cancelFrame(scheduledFrame);
      scheduledFrame = null;
    }
  };

  const subscribe = (
    callback: ManagedFrameClockCallback,
    subscriptionOptions: ManagedFrameClockSubscriptionOptions = {},
  ): (() => void) => {
    if (disposed) return () => undefined;
    const subscription = {
      callback,
      id: nextSubscriptionId,
      priority: subscriptionOptions.priority ?? 0,
    };
    nextSubscriptionId += 1;
    subscriptions.push(subscription);
    return () => {
      const index = subscriptions.indexOf(subscription);
      if (index >= 0) subscriptions.splice(index, 1);
    };
  };

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      stop();
      subscriptions.splice(0);
    },
    invalidate: (frames = 1) => {
      if (disposed || mode === "manual") return;
      invalidatedFrames = Math.max(
        invalidatedFrames,
        Math.max(1, Math.floor(frames)),
      );
      schedule();
    },
    mode: () => mode,
    running: () => running,
    start: () => {
      if (disposed || running) return;
      running = true;
      lastTime = 0;
      schedule();
    },
    stop,
    subscribe,
    subscriberCount: () => subscriptions.length,
    tick: (time = now()) => {
      if (disposed) return;
      runFrame(time);
    },
  };
};
