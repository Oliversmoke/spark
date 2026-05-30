let counter = 0;

export function nanoid(size = 12): string {
  counter += 1;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2);
  const c = counter.toString(36);
  return `${ts}${rand}${c}`.slice(0, size);
}
