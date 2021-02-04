//export type Memory = Uint8Array;
export type I8 = number;
export type U8 = number;
export type U16 = number;

export enum Reg {
  // Joypad
  JOYP = 0xff00,

  // Serial
  SB = 0xff01,
  SC = 0xff02,

  // PPU
  LCDC = 0xff40,
  STAT = 0xff41,
  SCY = 0xff42,
  SCX = 0xff43,
  LY = 0xff44,
  LYC = 0xff45,
  WY = 0xff4a,
  WX = 0xff4b,
  BGP = 0xff47,
  OBP0 = 0xff48,
  OBP1 = 0xff49,
  BCPS = 0xff68,
  BCPD = 0xff69,
  OCPS = 0xff6a,
  DMA = 0xff46,
  HDMA1 = 0xff51,
  HDMA2 = 0xff52,
  HDMA3 = 0xff53,
  HDMA4 = 0xff54,
  HDMA5 = 0xff55,
  VBK = 0xff4f,

  // Timer
  DIV = 0xff04,
  TIMA = 0xff05,
  TMA = 0xff06,
  TAC = 0xff07,

  // Interrupt
  IF = 0xff0f,
  IE = 0xffff,
}

export function toHex(n: number, f?: number): string {
  if (n == undefined) {
    return "???";
    //throw `toHex undefined`;
  }

  let h = n.toString(16).toUpperCase();
  const hl = h.length;
  const len = f ? 4 : hl > 2 ? 4 : 2;
  for (let i = 0; i < len - hl; i++) {
    h = "0" + h;
  }
  return `$${h}`;
}

export function toU16(a: U8, b: U8): U16 {
  return (a << 8 | b);
}

export function toI8(u: U8): I8 {
  return (u >> 7 & 1) == 1 ? -(128 - (u & 0b1111111)) : (u & 0b1111111);
}

export function showI8(u: U8): string {
  let o = (u & 0b1111111);
  let s = "";
  return ((u >> 7 & 1) == 1) ? "-" + toHex(128 - o) : "+" + toHex(o);
}

export function isZero(a: number): U8 {
  return a == 0 ? 1 : 0;
}

export function bitReset(r: number, n: number): number {
  return r & ~(1 << n);
}

export function toBin(n: number) {
  return n.toString(2);
}
