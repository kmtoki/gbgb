import { Reg, U8 } from "./utils.ts";
import MBC from "./mbc.ts";

export default class Controller {
  m: MBC;
  buffer: U8;

  constructor(m: MBC) {
    this.m = m;
    this.buffer = 0;
  }

  execute() {
    let jm = this.m.ram[Reg.JOYP] >> 4 & 0b11;
    let bm = this.buffer >> 4 & 0b11;

    if (jm == bm) {
      this.m.ram[Reg.JOYP] = this.buffer;
      // selected action
      //if (jm == 0b01) {
      //  this.m.ram[Reg.JOYP] = this.buffer;
      //}
      //// selected direction
      //else if (jm == 0b10) {
      //  this.m.ram[Reg.JOYP] = this.buffer;
      //}
      //else {
      //  this.m.ram[Reg.JOYP] = this.buffer;
      //  //this.buffer = this.m.ram[Reg.JOYP];
      //}
    }
    else {
      this.m.ram[Reg.JOYP] |= 0b1111; 
    }
  }

  release(c: string) {
    switch (c) {
      case "w":
        this.up = 1;
        this.matrix_select_arrow = 1;
        break;
      case "s":
        this.down = 1;
        this.matrix_select_arrow = 1;
        break;
      case "a":
        this.left = 1;
        this.matrix_select_arrow = 1;
        break;
      case "d":
        this.right = 1;
        this.matrix_select_arrow = 1;
        break;
      case "k":
        this.a = 1;
        this.matrix_select_action = 1;
        break;
      case "j":
        this.b = 1;
        this.matrix_select_action = 1;
        break;
      case "x":
        this.start = 1;
        this.matrix_select_action = 1;
        break;
      case "z":
        this.select = 1;
        this.matrix_select_action = 1;
        break;
      default:
        return;
    }

    this.m.ram[Reg.IF] |= 0b10000;
  }

  press(c: string) {
    switch (c) {
     case "w":
        this.up = 0;
        this.matrix_select_arrow = 0;
        //this.matrix_select_action = 1;
        break;
      case "s":
        this.down = 0;
        this.matrix_select_arrow = 0;
        //this.matrix_select_action = 1;
        break;
      case "a":
        this.left = 0;
        this.matrix_select_arrow = 0;
        //this.matrix_select_action = 1;
        break;
      case "d":
        this.right = 0;
        this.matrix_select_arrow = 0;
        //this.matrix_select_action = 1;
        break;
      case "k":
        this.a = 0;
        this.matrix_select_action = 0;
        //this.matrix_select_arrow = 1;
        break;
      case "j":
        this.b = 0;
        this.matrix_select_action = 0;
        //this.matrix_select_arrow = 1;
        break;
      case "x":
        this.start = 0;
        this.matrix_select_action = 0;
        //this.matrix_select_arrow = 1;
        break;
      case "z":
        this.select = 0;
        this.matrix_select_action = 0;
        //this.matrix_select_arrow = 1;
        break;
      default:
        return;
    }

    this.m.ram[Reg.IF] |= 0b10000;
  }

  releaseAll() {
    this.buffer |= 0b111111;
    //this.m.ram[Reg.IF] |= 0b10000;
  }

  pressAll() {
    this.buffer &= ~0b1111;
    //this.m.ram[Reg.IF] |= 0b10000;
  }

  set matrix_select_action(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00100000;
    } else {
      this.buffer |=  0b00100000;
    }
  }

  set matrix_select_arrow(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00010000;
    } else {
      this.buffer |=  0b00010000;
    }
  }

  get start() {
    return (this.buffer >> 5 & 1) |
      (this.buffer >> 3 & 1);
  }
  set start(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00001000;
    } else {
      this.buffer |= 0b00001000;
    }
  }

  get select() {
    return (this.buffer >> 5 & 1) |
      (this.buffer >> 2 & 1);
  }
  set select(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00000100;
    } else {
      this.buffer |= 0b00000100;
    }
  }

  get b() {
    return (this.buffer >> 5 & 1) |
      (this.buffer >> 1 & 1);
  }
  set b(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00000010;
    } else {
      this.buffer |= 0b00000010;
    }
  }

  get a() {
    return (this.buffer >> 5 & 1) |
      (this.buffer & 1);
  }
  set a(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00000001;
    } else {
      this.buffer |= 0b00000001;
    }
  }

  get down() {
    return (this.buffer >> 4 & 1) |
      (this.buffer >> 3 & 1);
  }
  set down(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00001000;
    } else {
      this.buffer |= 0b00001000;
    }
  }

  get up() {
    return (this.buffer >> 4 & 1) |
      (this.buffer >> 2 & 1);
  }
  set up(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00000100;
    } else {
      this.buffer |= 0b00000100;
    }
  }

  get left() {
    return (this.buffer >> 4 & 1) |
      (this.buffer >> 1 & 1);
  }
  set left(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00000010;
    } else {
      this.buffer |= 0b00000010;
    }
  }

  get right() {
    return (this.buffer >> 4 & 1) |
      (this.buffer & 1);
  }
  set right(u: U8) {
    if (u == 0) {
      this.buffer &= ~0b00000001;
    } else {
      this.buffer |= 0b00000001;
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
