// Tiny app-wide event bus for things that live outside navigation (e.g. the Kiongozi AI sheet).
type Handler = (payload?: any) => void;
const handlers: Record<string, Set<Handler>> = {};

export function onAppEvent(name: string, fn: Handler) {
  (handlers[name] ||= new Set()).add(fn);
  return () => { handlers[name]?.delete(fn); };
}

export function emitAppEvent(name: string, payload?: any) {
  handlers[name]?.forEach(fn => { try { fn(payload); } catch {} });
}
