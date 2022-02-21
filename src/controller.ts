import { Reg, U8 } from "./utils.ts";
import MBC from "./mbc.ts";

export default class Controller {
  m: MBC;

  down: U8;
  up: U8;
  right: U8;
  left: U8;
  start: U8;
  select: U8;
  b: U8;
  a: U8;

  constructor(m: MBC) {
    this.m = m;
    this.down = 1;
    this.up = 1;
    this.left = 1;
    this.right = 1;
    this.start = 1;
    this.select = 1;
    this.b = 1;
    this.a = 1;
  }

  execute() {
    let jm = this.m.ram[Reg.JOYP] >> 4 & 0b11;
    if (jm == 0b01) {
      this.m.ram[Reg.JOYP] = 
        0b00010000 | (this.start << 3) | (this.select << 2) | (this.b << 1) | this.a;
    }
    else if (jm == 0b10) {
      this.m.ram[Reg.JOYP] = 
        0b00100000 | (this.down << 3) | (this.up << 2) | (this.left << 1) | this.right;
    }
    else {
      this.m.ram[Reg.JOYP] |= 0b1111; 
    }
  }

  release(c: string) {
    switch (c) {
      case "w":
        this.up = 1;
        break;
      case "s":
        this.down = 1;
        break;
      case "a":
        this.left = 1;
        break;
      case "d":
        this.right = 1;
        break;
      case "k":
        this.a = 1;
        break;
      case "j":
        this.b = 1;
        break;
      case "x":
        this.start = 1;
        break;
      case "z":
        this.select = 1;
        break;
      default:
        return;
    }
  }

  press(c: string) {
    switch (c) {
     case "w":
        this.up = 0;
        break;
      case "s":
        this.down = 0;
        break;
      case "a":
        this.left = 0;
        break;
      case "d":
        this.right = 0;
        break;
      case "k":
        this.a = 0;
        break;
      case "j":
        this.b = 0;
        break;
      case "x":
        this.start = 0;
        break;
      case "z":
        this.select = 0;
        break;
      default:
        return;
    }
  }

  toggle(c: string) {
    switch (c) {
      case "z":
        this.start ? this.press(c) : this.release(c);
        break;
      case "x":
        this.select ? this.press(c) : this.release(c);
        break;
      case "w":
        this.up ? this.press(c) : this.release(c);
        break;
      case "s":
        this.down ? this.press(c) : this.release(c);
        break;
      case "a":
        this.left ? this.press(c) : this.release(c);
        break;
      case "d":
        this.right ? this.press(c) : this.release(c);
        break;
      case "j":
        this.a ? this.press(c) : this.release(c);
        break;
      case "k":
        this.b ? this.press(c) : this.release(c);
        break;
    }
  }
}
