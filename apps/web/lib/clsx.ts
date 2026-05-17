type ClassValue = string | number | false | null | undefined;

export function clsx(...args: ClassValue[]): string {
  let out = '';
  for (const a of args) {
    if (!a && a !== 0) continue;
    if (out) out += ' ';
    out += a;
  }
  return out;
}
