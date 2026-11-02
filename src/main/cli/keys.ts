const FIXED_KEYS: ReadonlyMap<string, string> = new Map([
  ["enter", "\r"],
  ["tab", "\t"],
  ["escape", "\x1b"],
  ["backspace", "\x7f"],
  ["delete", "\x1b[3~"],
  ["pageup", "\x1b[5~"],
  ["pagedown", "\x1b[6~"],
  ["f1", "\x1bOP"],
  ["f2", "\x1bOQ"],
  ["f3", "\x1bOR"],
  ["f4", "\x1bOS"],
  ["f5", "\x1b[15~"],
  ["f6", "\x1b[17~"],
  ["f7", "\x1b[18~"],
  ["f8", "\x1b[19~"],
  ["f9", "\x1b[20~"],
  ["f10", "\x1b[21~"],
  ["f11", "\x1b[23~"],
  ["f12", "\x1b[24~"],
]);

const CURSOR_KEYS: ReadonlyMap<string, string> = new Map([
  ["up", "A"],
  ["down", "B"],
  ["right", "C"],
  ["left", "D"],
  ["home", "H"],
  ["end", "F"],
]);

const CTRL_KEY = /^ctrl-([a-z])$/;
const ALT_KEY = /^alt-([\x21-\x7e])$/;
const CTRL_OFFSET = 0x60;

export function keySequence(
  name: string,
  applicationCursorKeys: boolean,
): string | null {
  const fixed = FIXED_KEYS.get(name);
  if (fixed !== undefined) return fixed;
  const cursor = CURSOR_KEYS.get(name);
  if (cursor !== undefined) {
    return `${applicationCursorKeys ? "\x1bO" : "\x1b["}${cursor}`;
  }
  const ctrl = CTRL_KEY.exec(name)?.[1];
  if (ctrl !== undefined) {
    return String.fromCharCode((ctrl.codePointAt(0) as number) - CTRL_OFFSET);
  }
  const alt = ALT_KEY.exec(name)?.[1];
  if (alt !== undefined) return `\x1b${alt}`;
  return null;
}
