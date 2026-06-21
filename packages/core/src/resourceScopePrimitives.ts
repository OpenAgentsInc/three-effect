export type SceneResourceFinalizer = () => void;

export type SceneResourceScope = Readonly<{
  add: (finalizer: SceneResourceFinalizer) => SceneResourceFinalizer;
  child: () => SceneResourceScope;
  dispose: () => void;
  disposed: () => boolean;
  size: () => number;
}>;

export const createSceneResourceScope = (): SceneResourceScope => {
  let closed = false;
  const finalizers: SceneResourceFinalizer[] = [];

  const add = (finalizer: SceneResourceFinalizer): SceneResourceFinalizer => {
    if (closed) {
      finalizer();
      return () => undefined;
    }

    let active = true;
    const wrapped = () => {
      if (!active) return;
      active = false;
      finalizer();
    };
    finalizers.push(wrapped);

    return () => {
      if (!active) return;
      active = false;
      const index = finalizers.indexOf(wrapped);
      if (index >= 0) finalizers.splice(index, 1);
    };
  };

  const dispose = () => {
    if (closed) return;
    closed = true;
    const errors: unknown[] = [];
    for (const finalizer of finalizers.splice(0).reverse()) {
      try {
        finalizer();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "Scene resource scope disposal failed");
    }
  };

  const child = (): SceneResourceScope => {
    const scope = createSceneResourceScope();
    add(scope.dispose);
    return scope;
  };

  return {
    add,
    child,
    dispose,
    disposed: () => closed,
    size: () => finalizers.length,
  };
};

export const addScopedEventListener = (
  scope: SceneResourceScope,
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions | boolean,
): SceneResourceFinalizer => {
  target.addEventListener(type, listener, options);
  return scope.add(() => target.removeEventListener(type, listener, options));
};
