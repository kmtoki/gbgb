import { Reg, U8 } from "./utils.ts";
import MBC from "./mbc.ts";

export default class Controller {
  m: MBC;
  constructor(m: MBC) {
    this.m = m;
    this.m.ram[Reg.JOYP] = 0xff;
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

  press(c: string) {
    this.releaseAll();
    switch (c) {
      case "z":
        this.start = 0;
        this.matrix_select_action = 0;
        break;
      case "x":
        this.select = 0;
        this.matrix_select_action = 0;
        break;
      case "w":
        this.up = 0;
        this.matrix_select_arrow = 0;
        break;
      case "s":
        this.down = 0;
        this.matrix_select_arrow = 0;
        break;
      case "a":
        this.left = 0;
        this.matrix_select_arrow = 0;
        break;
      case "d":
        this.right = 0;
        this.matrix_select_arrow = 0;
        break;
      case "j":
        this.a = 0;
        this.matrix_select_action = 0;
        break;
      case "k":
        this.b = 0;
        this.matrix_select_action = 0;
        break;
    }
    if ((this.m.ram[Reg.JOYP] & 0b00110000) > 0) {
      this.m.ram[Reg.IF] |= 0b10000;
    }
  }

  release(c: string) {
    this.pressAll();
    switch (c) {
      case "z":
        this.start = 1;
        this.matrix_select_action = 1;
        break;
      case "x":
        this.select = 1;
        this.matrix_select_action = 1;
        break;
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
      case "j":
        this.a = 1;
        this.matrix_select_action = 1;
        break;
      case "k":
        this.b = 1;
        this.matrix_select_action = 1;
        break;
    }
    this.m.ram[Reg.IF] |= 0b10000;
  }

  releaseAll() {
    this.m.ram[Reg.JOYP] |= 0b111111;
    //this.m.ram[Reg.IF] |= 0b10000;
  }

  pressAll() {
    this.m.ram[Reg.JOYP] &= ~0b1111;
    //this.m.ram[Reg.IF] |= 0b10000;
  }

  set matrix_select_action(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00100000;
    } else {
      this.m.ram[Reg.JOYP] |=  0b00100000;
    }
  }

  set matrix_select_arrow(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00010000;
    } else {
      this.m.ram[Reg.JOYP] |=  0b00010000;
    }
  }

  get start() {
    return (this.m.ram[Reg.JOYP] >> 5 & 1) |
      (this.m.ram[Reg.JOYP] >> 3 & 1);
  }
  set start(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00001000;
    } else {
      this.m.ram[Reg.JOYP] |= 0b00001000;
    }
  }

  get select() {
    return (this.m.ram[Reg.JOYP] >> 5 & 1) |
      (this.m.ram[Reg.JOYP] >> 2 & 1);
  }
  set select(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00000100;
    } else {
      this.m.ram[Reg.JOYP] |= 0b00000100;
    }
  }

  get b() {
    return (this.m.ram[Reg.JOYP] >> 5 & 1) |
      (this.m.ram[Reg.JOYP] >> 1 & 1);
  }
  set b(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00000010;
    } else {
      this.m.ram[Reg.JOYP] |= 0b00000010;
    }
  }

  get a() {
    return (this.m.ram[Reg.JOYP] >> 5 & 1) |
      (this.m.ram[Reg.JOYP] & 1);
  }
  set a(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00000001;
    } else {
      this.m.ram[Reg.JOYP] |= 0b00000001;
    }
  }

  get down() {
    return (this.m.ram[Reg.JOYP] >> 4 & 1) |
      (this.m.ram[Reg.JOYP] >> 3 & 1);
  }
  set down(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00001000;
    } else {
      this.m.ram[Reg.JOYP] |= 0b00001000;
    }
  }

  get up() {
    return (this.m.ram[Reg.JOYP] >> 4 & 1) |
      (this.m.ram[Reg.JOYP] >> 2 & 1);
  }
  set up(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00000100;
    } else {
      this.m.ram[Reg.JOYP] |= 0b00000100;
    }
  }

  get left() {
    return (this.m.ram[Reg.JOYP] >> 4 & 1) |
      (this.m.ram[Reg.JOYP] >> 1 & 1);
  }
  set left(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00000010;
    } else {
      this.m.ram[Reg.JOYP] |= 0b00000010;
    }
  }

  get right() {
    return (this.m.ram[Reg.JOYP] >> 4 & 1) |
      (this.m.ram[Reg.JOYP] & 1);
  }
  set right(u: U8) {
    if (u == 0) {
      this.m.ram[Reg.JOYP] &= ~0b00000001;
    } else {
      this.m.ram[Reg.JOYP] |= 0b00000001;
    }
  }
}
