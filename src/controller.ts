import { Reg, U8 } from "./utils.ts";
import MBC from "./mbc.ts";

export default class Controller {
  m: MBC;
  constructor(m: MBC) {
    this.m = m;
    this.m.ram[Reg.JOYP] = 0;
  }

  release(c: string) {
    let ok = false;
    switch (c) {
      case "w":
        //this.releaseAll();
        this.up = 1;
        //this.matrix_select_arrow = 1;
        //this.matrix_select_action = 0;
        ok = true;
        break;
      case "s":
        //this.releaseAll();
        this.down = 1;
        //this.matrix_select_arrow = 1;
        //this.matrix_select_action = 0;
        ok = true;
        break;
      case "a":
        //this.releaseAll();
        this.left = 1;
        //this.matrix_select_arrow = 1;
        //this.matrix_select_action = 0;
        ok = true;
        break;
      case "d":
        //this.releaseAll();
        this.right = 1;
        //this.matrix_select_arrow = 1;
        //this.matrix_select_action = 0;
        ok = true;
        break;
      case "k":
        //this.releaseAll();
        this.a = 1;
        //this.matrix_select_action = 1;
        //this.matrix_select_arrow = 0;
        ok = true;
        break;
      case "j":
        //this.releaseAll();
        this.b = 1;
        //this.matrix_select_action = 1;
        //this.matrix_select_arrow = 0;
        ok = true;
        break;
      case "x":
        //this.releaseAll();
        this.start = 1;
        //this.matrix_select_action = 1;
        //this.matrix_select_arrow = 0;
        ok = true;
        break;
      case "z":
        //this.releaseAll();
        this.select = 1;
        //this.matrix_select_action = 1;
        //this.matrix_select_arrow = 0;
        ok = true;
        break;
 
    }
    if (ok) {
      this.m.ram[Reg.IF] |= 0b10000;
      //this.m.ram[Reg.IE] |= 0b10000;
    }
  }

  press(c: string) {
    let ok = false;
    switch (c) {
     case "w":
        //this.pressAll();
        this.up = 0;
        //this.matrix_select_arrow = 0;
        //this.matrix_select_arrow = 0;
        //this.matrix_select_action = 1;
        ok = true;
        break;
      case "s":
        //this.pressAll();
        this.down = 0;
        //this.matrix_select_arrow = 0;
        //this.matrix_select_arrow = 0;
        //this.matrix_select_action = 1;
        ok = true;
        break;
      case "a":
        //this.pressAll();
        this.left = 0;
        //this.matrix_select_arrow = 0;
        //this.matrix_select_arrow = 0;
        //this.matrix_select_action = 1;
        ok = true;
        break;
      case "d":
        //this.pressAll();
        this.right = 0;
        //this.matrix_select_arrow = 0;
        //this.matrix_select_arrow = 0;
        //this.matrix_select_action = 1;
        ok = true;
        break;
      case "k":
        //this.pressAll();
        this.a = 0;
        //this.matrix_select_action = 0;
        //this.matrix_select_action = 0;
        //this.matrix_select_arrow = 1;
        ok = true;
        break;
      case "j":
        //this.pressAll();
        this.b = 0;
        //this.matrix_select_action = 0;
        //this.matrix_select_action = 0;
        //this.matrix_select_arrow = 1;
        ok = true;
        break;
      case "x":
        //this.pressAll();
        this.start = 0;
        //this.matrix_select_action = 0;
        //this.matrix_select_action = 0;
        //this.matrix_select_arrow = 1;
        ok = true;
        break;
      case "z":
        //this.pressAll();
        this.select = 0;
        //this.matrix_select_action = 0;
        //this.matrix_select_action = 0;
        //this.matrix_select_arrow = 1;
        ok = true;
        break;
 
    }
    if (ok) {
      this.m.ram[Reg.IF] |= 0b10000;
      //this.m.ram[Reg.IE] |= 0b10000;
    }
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
