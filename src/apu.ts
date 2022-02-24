import MBC from "./mbc.ts";
import { Reg, toHex, toI8, U16, U8 } from "./utils.ts";

export default class APU {
  m: MBC;
  buffer: number[];

  constructor(m: MBC) {
    this.m = m;
    this.buffer = new Array(256);
  }

  execute() {
    for (let i = 0; i <= 0xf; i++) {
      let a = this.m.ram[Reg.WPR + i] >> 4 & 0xf;
      let b = this.m.ram[Reg.WPR + i] & 0xf;
      this.buffer.push(a,b);
    }
  }
}


