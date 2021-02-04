import MBC from "./mbc.ts";
import { bitReset, isZero, Reg, toHex, toU16, U16, U8, I8, toI8, showI8, toBin } from "./utils.ts";

type Operand =
  | "A"
  | "F"
  | "B"
  | "C"
  | "D"
  | "E"
  | "H"
  | "L"
  | "AF"
  | "BC"
  | "DE"
  | "HL"
  | "PC"
  | "SP"
  | "NZ"
  | "Z"
  | "NC"
  | "C"
  | "_";

export type CPULog = {
  _execute_counter: number;
  bank: number;
  code: string;
  a: U8;
  f: U8;
  b: U8;
  c: U8;
  d: U8;
  e: U8;
  h: U8;
  l: U8;
  zero: U8;
  negative: U8;
  half: U8;
  carry: U8;
  sp: U16;
  pc: U16;
};

export default class CPU {
  m: MBC;
  a: U8;
  f: U8;
  b: U8;
  c: U8;
  d: U8;
  e: U8;
  h: U8;
  l: U8;
  //zero: U8;
  //negative: U8;
  //half: U8;
  //carry: U8;
  sp: U16;
  pc: U16;
  ime: number;
  clock: number;
  _halt: U8;
  _stop: U8;
  _clock_frequency: number;
  _execute_counter: number;
  _timer_div_counter: number;
  _timer_control_counter: number;
  _timer_div_prev: number;
  _serial_counter: number;
  _log: CPULog[];
  _log_limit: number;
  _serial: number[][];

  constructor(m: MBC) {
    this.m = m;
    this.a = 0;
    this.f = 0;
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;
    this.sp = 0xfffe;
    this.pc = 0;
    this.ime = 0;
    this.clock = 0;
    this._halt = 0;
    this._stop = 0;
    this._clock_frequency = 4194304;
    this._execute_counter = 0;
    this._timer_div_counter = 0;
    this._timer_div_prev = 0;
    this._timer_control_counter = 0;
    this._serial_counter = 0;
    this._serial = [[]];
    this._log = [];
    this._log_limit = 0xfff;
  }

  get zero(): U8 {
    return this.f >> 7 & 1;
  }
  set zero(a: U8) {
    if (a == 0) {
      this.f &= ~(1 << 7);
    } else {
      this.f |= 1 << 7;
    }
  }

  get negative(): U8 {
    return this.f >> 6 & 1;
  }
  set negative(a: U8) {
    if (a == 0) {
      this.f &= ~(1 << 6);
    } else {
      this.f |= 1 << 6;
    }
  }

  get half(): U8 {
    return this.f >> 5 & 1;
  }
  set half(a: U8) {
    if (a == 0) {
      this.f &= ~(1 << 5);
    } else {
      this.f |= 1 << 5;
    }
  }

  get carry(): U8 {
    return this.f >> 4 & 1;
  }
  set carry(a: U8) {
    if (a == 0) {
      this.f &= ~(1 << 4);
    } else {
      this.f |= 1 << 4;
    }
  }

  get af() {
    return toU16(this.a, this.f);
  }
  set af(x: U16) {
    this.a = x >> 8;
    this.f = x & 0xf0;
  }

  get bc() {
    return toU16(this.b, this.c);
  }
  set bc(x: U16) {
    this.b = x >> 8;
    this.c = x & 0xff;
  }

  get de() {
    return toU16(this.d, this.e);
  }
  set de(x: U16) {
    this.d = x >> 8;
    this.e = x & 0xff;
  }

  get hl() {
    return toU16(this.h, this.l);
  }
  set hl(x: U16) {
    this.h = x >> 8;
    this.l = x & 0xff;
  }

  log(instr: string) {
    const data = {
      _execute_counter: this._execute_counter,
      bank: this.m.bank,
      code: instr,
      zero: this.zero,
      negative: this.negative,
      half: this.half,
      carry: this.carry,
      a: this.a,
      f: this.f,
      b: this.b,
      c: this.c,
      d: this.d,
      e: this.e,
      h: this.h,
      l: this.l,
      pc: this.pc,
      sp: this.sp,
    };

    if (this._log.length >= this._log_limit) {
      this._log.shift();
    }
    this._log.push(data);
  }

  reset() {
    this.a = 0;
    this.f = 0;
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;
    this.sp = 0xfffe;
    this.pc = 0;
    this.ime = 0;
    this.clock = 0;
    this._halt = 0;
    this._stop = 0;
    this._clock_frequency = 4194304;
    this._execute_counter = 0;
    this._timer_div_counter = 0;
    this._timer_div_prev = 0;
    this._timer_control_counter = 0;
    this._serial_counter = 0;
    this._serial = [[]];
    this.log("CPU RESET");
    //this._log = [];
    //this._log_limit = 0xfff;
  }

  execute() {
    //this.clock = 0;
    this._execute_counter++;
    this._timer_div_prev = this.m.ram[Reg.DIV];
    if (this._halt == 1) {
      this.log(`NOP`);
      //this.pc += 1;
      this.clock = 4;
    } else {
      this.dispatch();
    }
    this.serial();
    this.timer();
    this.interrupt();
  }

  serial() {
    if ((this.m.ram[Reg.SC] >> 7 & 1) == 1) {
      this._serial_counter += this.clock; 
      const serial_clock = [512,256,16,8]; // 8192, 16384, 262144, 524288
      const sc = this.m.ram[Reg.SC] & 0b11;
      if (sc == 0b01 && this._serial_counter >= serial_clock[0]) {
        this._serial_counter = 0; 
        if (this.m.ram[Reg.SB] != 0xff) {
          this._serial[this._serial.length - 1].push(this.m.ram[Reg.SB]);
          this.m.ram[Reg.SC] &= ~0b10000000;
          this.m.ram[Reg.IF] |= 0b01000;
        } else {
          this._serial.push([]);
          this.m.ram[Reg.IF] |= 0b01000;
        }
      }
    }
  }

  timer() {
    for (let i = 0; i <= this.clock; i += 4) {
      this._timer_div_counter += 4;//this.clock;
      this.m.ram[Reg.DIV] = this._timer_div_counter >> 8 & 0xff;

      if (this._timer_div_prev != this.m.ram[Reg.DIV]) {
        this._timer_div_counter = 0;
        this._timer_control_counter = 0;
        this.m.ram[Reg.DIV] = 0;
        this.m.ram[Reg.TIMA] = 0; //this.m.ram[Reg.TMA];
        if ((this.m.ram[Reg.TAC] >> 2 & 1) == 1) {
          this.m.ram[Reg.TIMA] += 1;
        }
      }

      if (this._timer_div_counter >= 0xffff) {
        this._timer_div_counter -= 0xffff;
        //this.m.ram[Reg.DIV] += 1;
        //if (this.m.ram[Reg.DIV] == 0xff) {
        //  this.m.ram[Reg.DIV] = 0;
        //}
      }

      if ((this.m.ram[Reg.TAC] >> 2 & 1) == 1) {
        //this._timer_control_counter += 4;//this.clock;
        const tac_clock = [1024, 16, 64, 256];
        const tac_select_clock = tac_clock[this.m.ram[Reg.TAC] & 0b11];
        if (this._timer_div_counter >= tac_select_clock) {
          //this._timer_control_counter -= tac_select_clock;
          this.m.ram[Reg.TIMA] += 1;
          if (this.m.ram[Reg.TIMA] >= 0xff) {
            this.m.ram[Reg.TIMA] = this.m.ram[Reg.TMA];
            this.m.ram[Reg.IF] |= 0b100;
            this._halt = 0;
            this.log(`TIMER IF ON ${this.m.ram[Reg.TAC]}`);
          }
        }
      }
    }
  }

  interrupt() {
    if (this.ime == 1) {
      const request = this.m.ram[Reg.IF];
      const enable = this.m.ram[Reg.IE];
      if (request != 0 && enable != 0) {
        let go = false;
        let pc = 0;
        let mask = 0;
        if ((request & 1) == 1 && (enable & 1) == 1) {
          this.log(`INTERRUPT V-Blank`);
          //console.log(1, this._execute_counter, "INTERRUPT V-Blank");
          go = true;
          pc = 0x40;
          mask = 0b11110;
        } else if ((request & 0b10) == 0b10 && (enable & 0b10) == 0b10) {
          this.log(`INTERRUPT LCD STAT`);
          //console.log(2, this._execute_counter, "INTERRUPT LCD STAT");
          go = true;
          pc = 0x48;
          mask = 0b11101;
        } else if ((request & 0b100) == 0b100 && (enable & 0b100) == 0b100) {
          this.log(`INTERRUPT Timer`);
          //console.log(3, this._execute_counter, "INTERRUPT TIMER STAT");
          go = true;
          pc = 0x50;
          mask = 0b11011;
        } else if (
          (request & 0b1000) == 0b1000 && (enable & 0b1000) == 0b1000
        ) {
          this.log(`INTERRUPT Serial`);
          //console.log(4, this._execute_counter, "INTERRUPT Serial");
          go = true;
          pc = 0x58;
          mask = 0b10111;
        } else if (
          (request & 0b10000) == 0b10000 && (enable & 0b10000) == 0b10000
        ) {
          this.log(`INTERRUPT Joypad`);
          //console.log(5, this._execute_counter, "INTERRUPT Joypad");
          go = true;
          pc = 0x60;
          mask = 0b01111;
        } else {
          //this.log(`ERROR interrupt request`);
          //throw "interrupt request";
        }

        if (go) {
          this.m.write(this.sp - 2, this.pc & 0xff);
          this.m.write(this.sp - 1, this.pc >> 8 & 0xff);
          this.sp -= 2;
          this.ime = 0;
          this._halt = 0;
          this.pc = pc;
          this.m.write(Reg.IF, this.m.ram[Reg.IF] & mask);
          this.clock += 20;
        }
      }
    }
  }

  dispatch() {
    const instr = this.m.read(this.pc);
    const op1 = this.m.read(this.pc + 1);
    const op2 = this.m.read(this.pc + 2);
    const op16 = toU16(op2, op1);
    switch (instr) {
      case 0x3e:
        this.ld_r_u8("A", op1);
        break;
      case 0x06:
        this.ld_r_u8("B", op1);
        break;
      case 0x0e:
        this.ld_r_u8("C", op1);
        break;
      case 0x16:
        this.ld_r_u8("D", op1);
        break;
      case 0x1e:
        this.ld_r_u8("E", op1);
        break;
      case 0x26:
        this.ld_r_u8("H", op1);
        break;
      case 0x2e:
        this.ld_r_u8("L", op1);
        break;
      case 0x7f:
        this.ld_r_r("A", this.a, "A");
        break;
      case 0x78:
        this.ld_r_r("A", this.b, "B");
        break;
      case 0x79:
        this.ld_r_r("A", this.c, "C");
        break;
      case 0x7a:
        this.ld_r_r("A", this.d, "D");
        break;
      case 0x7b:
        this.ld_r_r("A", this.e, "E");
        break;
      case 0x7c:
        this.ld_r_r("A", this.h, "H");
        break;
      case 0x7d:
        this.ld_r_r("A", this.l, "L");
        break;
      case 0x7e:
        this.ld_r_m("A", this.hl, "HL");
        break;
      case 0x47:
        this.ld_r_r("B", this.a, "A");
        break;
      case 0x40:
        this.ld_r_r("B", this.b, "B");
        break;
      case 0x41:
        this.ld_r_r("B", this.c, "C");
        break;
      case 0x42:
        this.ld_r_r("B", this.d, "D");
        break;
      case 0x43:
        this.ld_r_r("B", this.e, "E");
        break;
      case 0x44:
        this.ld_r_r("B", this.h, "H");
        break;
      case 0x45:
        this.ld_r_r("B", this.l, "L");
        break;
      case 0x46:
        this.ld_r_m("B", this.hl, "HL");
        break;
      case 0x4f:
        this.ld_r_r("C", this.a, "A");
        break;
      case 0x48:
        this.ld_r_r("C", this.b, "B");
        break;
      case 0x49:
        this.ld_r_r("C", this.c, "C");
        break;
      case 0x4a:
        this.ld_r_r("C", this.d, "D");
        break;
      case 0x4b:
        this.ld_r_r("C", this.e, "E");
        break;
      case 0x4c:
        this.ld_r_r("C", this.h, "H");
        break;
      case 0x4d:
        this.ld_r_r("C", this.l, "L");
        break;
      case 0x4e:
        this.ld_r_m("C", this.hl, "HL");
        break;
      case 0x57:
        this.ld_r_r("D", this.a, "A");
        break;
      case 0x50:
        this.ld_r_r("D", this.b, "B");
        break;
      case 0x51:
        this.ld_r_r("D", this.c, "C");
        break;
      case 0x52:
        this.ld_r_r("D", this.d, "D");
        break;
      case 0x53:
        this.ld_r_r("D", this.e, "E");
        break;
      case 0x54:
        this.ld_r_r("D", this.h, "H");
        break;
      case 0x55:
        this.ld_r_r("D", this.l, "L");
        break;
      case 0x56:
        this.ld_r_m("D", this.hl, "HL");
        break;
      case 0x5f:
        this.ld_r_r("E", this.a, "A");
        break;
      case 0x58:
        this.ld_r_r("E", this.b, "B");
        break;
      case 0x59:
        this.ld_r_r("E", this.c, "C");
        break;
      case 0x5a:
        this.ld_r_r("E", this.d, "D");
        break;
      case 0x5b:
        this.ld_r_r("E", this.e, "E");
        break;
      case 0x5c:
        this.ld_r_r("E", this.h, "H");
        break;
      case 0x5d:
        this.ld_r_r("E", this.l, "L");
        break;
      case 0x5e:
        this.ld_r_m("E", this.hl, "HL");
        break;
      case 0x67:
        this.ld_r_r("H", this.a, "A");
        break;
      case 0x60:
        this.ld_r_r("H", this.b, "B");
        break;
      case 0x61:
        this.ld_r_r("H", this.c, "C");
        break;
      case 0x62:
        this.ld_r_r("H", this.d, "D");
        break;
      case 0x63:
        this.ld_r_r("H", this.e, "E");
        break;
      case 0x64:
        this.ld_r_r("H", this.h, "H");
        break;
      case 0x65:
        this.ld_r_r("H", this.l, "L");
        break;
      case 0x66:
        this.ld_r_m("H", this.hl, "HL");
        break;
      case 0x6f:
        this.ld_r_r("L", this.a, "A");
        break;
      case 0x68:
        this.ld_r_r("L", this.b, "B");
        break;
      case 0x69:
        this.ld_r_r("L", this.c, "C");
        break;
      case 0x6a:
        this.ld_r_r("L", this.d, "D");
        break;
      case 0x6b:
        this.ld_r_r("L", this.e, "E");
        break;
      case 0x6c:
        this.ld_r_r("L", this.h, "H");
        break;
      case 0x6d:
        this.ld_r_r("L", this.l, "L");
        break;
      case 0x6e:
        this.ld_r_m("L", this.hl, "HL");
        break;
      case 0x70:
        this.ld_m_r(this.hl, this.b, "HL", "B");
        break;
      case 0x71:
        this.ld_m_r(this.hl, this.c, "HL", "C");
        break;
      case 0x72:
        this.ld_m_r(this.hl, this.d, "HL", "D");
        break;
      case 0x73:
        this.ld_m_r(this.hl, this.e, "HL", "E");
        break;
      case 0x74:
        this.ld_m_r(this.hl, this.h, "HL", "H");
        break;
      case 0x75:
        this.ld_m_r(this.hl, this.l, "HL", "L");
        break;
      case 0x36:
        this.ld_m_u8(this.hl, op1, "HL");
        break;
      case 0x0a:
        this.ld_r_m("A", this.bc, "BC");
        break;
      case 0x1a:
        this.ld_r_m("A", this.de, "DE");
        break;
      case 0xfa:
        this.ld_r_m_i16("A", op16);
        break;
      case 0x02:
        this.ld_m_r(this.bc, this.a, "BC", "A");
        break;
      case 0x12:
        this.ld_m_r(this.de, this.a, "DE", "A");
        break;
      case 0x77:
        this.ld_m_r(this.hl, this.a, "HL", "A");
        break;
      case 0xea:
        this.ld_m_i16_r(op16, this.a, "A");
        break;
      case 0xf2:
        this.ld_r_m("A", 0xFF00 + this.c, `$FF00+C`);
        break;
      case 0xe2:
        this.ld_m_r(0xFF00 + this.c, this.a, `$FF00+C`, "A");
        break;
      case 0x3a:
        this.ldd_a_m_hl();
        break;
      case 0x32:
        this.ldd_m_hl_a();
        break;

      case 0x2a:
        this.ldi_a_m_hl();
        break;
      case 0x22:
        this.ldi_m_hl_a();
        break;

      case 0xe0:
        this.ldh_m_r(op1, this.a, "A");
        break;
      case 0xf0:
        this.ldh_r_m("A", op1);
        break;

      case 0x01:
        this.ld_rr_i16("BC", op16);
        break;
      case 0x11:
        this.ld_rr_i16("DE", op16);
        break;
      case 0x21:
        this.ld_rr_i16("HL", op16);
        break;
      case 0x31:
        this.ld_rr_i16("SP", op16);
        break;

      case 0xf9:
        this.ld_sp_hl();
        break;
      case 0xf8:
        this.ld_hl_sp_i8(op1);
        break;
      case 0x08:
        this.ld_m_i16_sp(op16);
        break;

      case 0xf5:
        this.push_rr(this.a, this.f, "AF");
        break;
      case 0xc5:
        this.push_rr(this.b, this.c, "BC");
        break;
      case 0xd5:
        this.push_rr(this.d, this.e, "DE");
        break;
      case 0xe5:
        this.push_rr(this.h, this.l, "HL");
        break;

      case 0xf1:
        this.pop_rr("AF");
        break;
      case 0xc1:
        this.pop_rr("BC");
        break;
      case 0xd1:
        this.pop_rr("DE");
        break;
      case 0xe1:
        this.pop_rr("HL");
        break;

      case 0x87:
        this.add_a_r(this.a, "A");
        break;
      case 0x80:
        this.add_a_r(this.b, "B");
        break;
      case 0x81:
        this.add_a_r(this.c, "C");
        break;
      case 0x82:
        this.add_a_r(this.d, "D");
        break;
      case 0x83:
        this.add_a_r(this.e, "E");
        break;
      case 0x84:
        this.add_a_r(this.h, "H");
        break;
      case 0x85:
        this.add_a_r(this.l, "L");
        break;
      case 0x86:
        this.add_a_m_hl();
        break;
      case 0xc6:
        this.add_a_u8(op1);
        break;

      case 0x8f:
        this.adc_a_r(this.a, "A");
        break;
      case 0x88:
        this.adc_a_r(this.b, "B");
        break;
      case 0x89:
        this.adc_a_r(this.c, "C");
        break;
      case 0x8a:
        this.adc_a_r(this.d, "D");
        break;
      case 0x8b:
        this.adc_a_r(this.e, "E");
        break;
      case 0x8c:
        this.adc_a_r(this.h, "H");
        break;
      case 0x8d:
        this.adc_a_r(this.l, "L");
        break;
      case 0x8e:
        this.adc_a_m_hl();
        break;
      case 0xce:
        this.adc_a_u8(op1);
        break;

      case 0x97:
        this.sub_a_r(this.a, "A");
        break;
      case 0x90:
        this.sub_a_r(this.b, "B");
        break;
      case 0x91:
        this.sub_a_r(this.c, "C");
        break;
      case 0x92:
        this.sub_a_r(this.d, "D");
        break;
      case 0x93:
        this.sub_a_r(this.e, "E");
        break;
      case 0x94:
        this.sub_a_r(this.h, "H");
        break;
      case 0x95:
        this.sub_a_r(this.l, "L");
        break;
      case 0x96:
        this.sub_a_m_hl();
        break;
      case 0xd6:
        this.sub_a_u8(op1);
        break;

      case 0x9f:
        this.sbc_a_r(this.a, "A");
        break;
      case 0x98:
        this.sbc_a_r(this.b, "B");
        break;
      case 0x99:
        this.sbc_a_r(this.c, "C");
        break;
      case 0x9a:
        this.sbc_a_r(this.d, "D");
        break;
      case 0x9b:
        this.sbc_a_r(this.e, "E");
        break;
      case 0x9c:
        this.sbc_a_r(this.h, "H");
        break;
      case 0x9d:
        this.sbc_a_r(this.l, "L");
        break;
      case 0x9e:
        this.sbc_a_m_hl();
        break;
      case 0xde:
        this.sbc_a_u8(op1);
        break;

      case 0xa7:
        this.and_a_r(this.a, "A");
        break;
      case 0xa0:
        this.and_a_r(this.b, "B");
        break;
      case 0xa1:
        this.and_a_r(this.c, "C");
        break;
      case 0xa2:
        this.and_a_r(this.d, "D");
        break;
      case 0xa3:
        this.and_a_r(this.e, "E");
        break;
      case 0xa4:
        this.and_a_r(this.h, "H");
        break;
      case 0xa5:
        this.and_a_r(this.l, "L");
        break;
      case 0xa6:
        this.and_a_m_hl();
        break;
      case 0xe6:
        this.and_a_u8(op1);
        break;

      case 0xb7:
        this.or_a_r(this.a, "A");
        break;
      case 0xb0:
        this.or_a_r(this.b, "B");
        break;
      case 0xb1:
        this.or_a_r(this.c, "C");
        break;
      case 0xb2:
        this.or_a_r(this.d, "D");
        break;
      case 0xb3:
        this.or_a_r(this.e, "E");
        break;
      case 0xb4:
        this.or_a_r(this.h, "H");
        break;
      case 0xb5:
        this.or_a_r(this.l, "L");
        break;
      case 0xb6:
        this.or_a_m_hl();
        break;
      case 0xf6:
        this.or_a_u8(op1);
        break;

      case 0xaf:
        this.xor_a_r(this.a, "A");
        break;
      case 0xa8:
        this.xor_a_r(this.b, "B");
        break;
      case 0xa9:
        this.xor_a_r(this.c, "C");
        break;
      case 0xaa:
        this.xor_a_r(this.d, "D");
        break;
      case 0xab:
        this.xor_a_r(this.e, "E");
        break;
      case 0xac:
        this.xor_a_r(this.h, "H");
        break;
      case 0xad:
        this.xor_a_r(this.l, "L");
        break;
      case 0xae:
        this.xor_a_m_hl();
        break;
      case 0xee:
        this.xor_a_u8(op1);
        break;

      case 0xbf:
        this.cp_a_r(this.a, "A");
        break;
      case 0xb8:
        this.cp_a_r(this.b, "B");
        break;
      case 0xb9:
        this.cp_a_r(this.c, "C");
        break;
      case 0xba:
        this.cp_a_r(this.d, "D");
        break;
      case 0xbb:
        this.cp_a_r(this.e, "E");
        break;
      case 0xbc:
        this.cp_a_r(this.h, "H");
        break;
      case 0xbd:
        this.cp_a_r(this.l, "L");
        break;
      case 0xbe:
        this.cp_a_m_hl();
        break;
      case 0xfe:
        this.cp_a_u8(op1);
        break;

      case 0x3c:
        this.inc_r("A");
        break;
      case 0x04:
        this.inc_r("B");
        break;
      case 0x0c:
        this.inc_r("C");
        break;
      case 0x14:
        this.inc_r("D");
        break;
      case 0x1c:
        this.inc_r("E");
        break;
      case 0x24:
        this.inc_r("H");
        break;
      case 0x2c:
        this.inc_r("L");
        break;
      case 0x34:
        this.inc_m_hl();
        break;

      case 0x3d:
        this.dec_r("A");
        break;
      case 0x05:
        this.dec_r("B");
        break;
      case 0x0d:
        this.dec_r("C");
        break;
      case 0x15:
        this.dec_r("D");
        break;
      case 0x1d:
        this.dec_r("E");
        break;
      case 0x25:
        this.dec_r("H");
        break;
      case 0x2d:
        this.dec_r("L");
        break;
      case 0x35:
        this.dec_m_hl();
        break;

      case 0x09:
        this.add_hl_rr(this.bc, "BC");
        break;
      case 0x19:
        this.add_hl_rr(this.de, "DE");
        break;
      case 0x29:
        this.add_hl_rr(this.hl, "HL");
        break;
      case 0x39:
        this.add_hl_rr(this.sp, "SP");
        break;

      case 0xe8:
        this.add_sp_i8(op1);
        break;

      case 0x03:
        this.inc_rr("BC");
        break;
      case 0x13:
        this.inc_rr("DE");
        break;
      case 0x23:
        this.inc_rr("HL");
        break;
      case 0x33:
        this.inc_rr("SP");
        break;

      case 0x0b:
        this.dec_rr("BC");
        break;
      case 0x1b:
        this.dec_rr("DE");
        break;
      case 0x2b:
        this.dec_rr("HL");
        break;
      case 0x3b:
        this.dec_rr("SP");
        break;

      case 0x27:
        this.daa();
        break;
      case 0x2f:
        this.cpl();
        break;
      case 0x3f:
        this.ccf();
        break;
      case 0x37:
        this.scf();
        break;
      case 0x00:
        this.nop();
        break;
      case 0x76:
        this.halt();
        break;

      case 0xf3:
        this.di();
        break;
      case 0xfb:
        this.ei();
        break;

      case 0x07:
        this.rlca();
        break;
      case 0x17:
        this.rla();
        break;
      case 0x0f:
        this.rrca();
        break;
      case 0x1f:
        this.rra();
        break;

      case 0xc3:
        this.jp_i16("_", op16);
        break;

      case 0xc2:
        this.jp_f_i16("NZ", op16);
        break;
      case 0xca:
        this.jp_f_i16("Z", op16);
        break;
      case 0xd2:
        this.jp_f_i16("NC", op16);
        break;
      case 0xda:
        this.jp_f_i16("C", op16);
        break;
      case 0xe9:
        this.jp_hl();
        break;

      case 0x18:
        this.jr_i8("_", op1);
        break;
      case 0x20:
        this.jr_f_i8("NZ", op1);
        break;
      case 0x28:
        this.jr_f_i8("Z", op1);
        break;
      case 0x30:
        this.jr_f_i8("NC", op1);
        break;
      case 0x38:
        this.jr_f_i8("C", op1);
        break;

      case 0xcd:
        this.call_i16("_", op16);
        break;
      case 0xc4:
        this.call_f_i16("NZ", op16);
        break;
      case 0xcc:
        this.call_f_i16("Z", op16);
        break;
      case 0xd4:
        this.call_f_i16("NC", op16);
        break;
      case 0xdc:
        this.call_f_i16("C", op16);
        break;

      case 0xc7:
        this.rst_n(0x00);
        break;
      case 0xcf:
        this.rst_n(0x08);
        break;
      case 0xd7:
        this.rst_n(0x10);
        break;
      case 0xdf:
        this.rst_n(0x18);
        break;
      case 0xe7:
        this.rst_n(0x20);
        break;
      case 0xef:
        this.rst_n(0x28);
        break;
      case 0xf7:
        this.rst_n(0x30);
        break;
      case 0xff:
        this.rst_n(0x38);
        break;

      case 0xc9:
        this.ret("_");
        break;
      case 0xc0:
        this.ret_f("NZ");
        break;
      case 0xc8:
        this.ret_f("Z");
        break;
      case 0xd0:
        this.ret_f("NC");
        break;
      case 0xd8:
        this.ret_f("C");
        break;

      case 0xd9:
        this.reti();
        break;

      case 0x10:
        switch (op1) {
          case 0x00:
            this.stop();
            break;
          default:
            this.log(
              `ERROR ${toHex(instr)} ${toHex(op1)} ${toHex(op2)} / ${
                toHex(op16)
              }`,
            );
            throw `dispatch 0x10 ${toHex(op1)}`;
            this.pc += 2;
            break;
        }
        break;

      case 0xcb:
        switch (op1) {
          case 0x37:
            this.swap_r("A");
            break;
          case 0x30:
            this.swap_r("B");
            break;
          case 0x31:
            this.swap_r("C");
            break;
          case 0x32:
            this.swap_r("D");
            break;
          case 0x33:
            this.swap_r("E");
            break;
          case 0x34:
            this.swap_r("H");
            break;
          case 0x35:
            this.swap_r("L");
            break;
          case 0x36:
            this.swap_m_hl();
            break;

          case 0x07:
            this.rlc_r("A");
            break;
          case 0x00:
            this.rlc_r("B");
            break;
          case 0x01:
            this.rlc_r("C");
            break;
          case 0x02:
            this.rlc_r("D");
            break;
          case 0x03:
            this.rlc_r("E");
            break;
          case 0x04:
            this.rlc_r("H");
            break;
          case 0x05:
            this.rlc_r("L");
            break;
          case 0x06:
            this.rlc_m_hl();
            break;

          case 0x17:
            this.rl_r("A");
            break;
          case 0x10:
            this.rl_r("B");
            break;
          case 0x11:
            this.rl_r("C");
            break;
          case 0x12:
            this.rl_r("D");
            break;
          case 0x13:
            this.rl_r("E");
            break;
          case 0x14:
            this.rl_r("H");
            break;
          case 0x15:
            this.rl_r("L");
            break;
          case 0x16:
            this.rl_m_hl();
            break;

          case 0x0f:
            this.rrc_r("A");
            break;
          case 0x08:
            this.rrc_r("B");
            break;
          case 0x09:
            this.rrc_r("C");
            break;
          case 0x0a:
            this.rrc_r("D");
            break;
          case 0x0b:
            this.rrc_r("E");
            break;
          case 0x0c:
            this.rrc_r("H");
            break;
          case 0x0d:
            this.rrc_r("L");
            break;
          case 0x0e:
            this.rrc_m_hl();
            break;

          case 0x1f:
            this.rr_r("A");
            break;
          case 0x18:
            this.rr_r("B");
            break;
          case 0x19:
            this.rr_r("C");
            break;
          case 0x1a:
            this.rr_r("D");
            break;
          case 0x1b:
            this.rr_r("E");
            break;
          case 0x1c:
            this.rr_r("H");
            break;
          case 0x1d:
            this.rr_r("L");
            break;
          case 0x1e:
            this.rr_m_hl();
            break;

          case 0x27:
            this.sla_r("A");
            break;
          case 0x20:
            this.sla_r("B");
            break;
          case 0x21:
            this.sla_r("C");
            break;
          case 0x22:
            this.sla_r("D");
            break;
          case 0x23:
            this.sla_r("E");
            break;
          case 0x24:
            this.sla_r("H");
            break;
          case 0x25:
            this.sla_r("L");
            break;
          case 0x26:
            this.sla_m_hl();
            break;

          case 0x2f:
            this.sra_r("A");
            break;
          case 0x28:
            this.sra_r("B");
            break;
          case 0x29:
            this.sra_r("C");
            break;
          case 0x2a:
            this.sra_r("D");
            break;
          case 0x2b:
            this.sra_r("E");
            break;
          case 0x2c:
            this.sra_r("H");
            break;
          case 0x2d:
            this.sra_r("L");
            break;
          case 0x2e:
            this.sra_m_hl();
            break;

          case 0x3f:
            this.srl_r("A");
            break;
          case 0x38:
            this.srl_r("B");
            break;
          case 0x39:
            this.srl_r("C");
            break;
          case 0x3a:
            this.srl_r("D");
            break;
          case 0x3b:
            this.srl_r("E");
            break;
          case 0x3c:
            this.srl_r("H");
            break;
          case 0x3d:
            this.srl_r("L");
            break;
          case 0x3e:
            this.srl_m_hl();
            break;

          case 0x47:
            this.bit_b_r(0, "A");
            break;
          case 0x40:
            this.bit_b_r(0, "B");
            break;
          case 0x41:
            this.bit_b_r(0, "C");
            break;
          case 0x42:
            this.bit_b_r(0, "D");
            break;
          case 0x43:
            this.bit_b_r(0, "E");
            break;
          case 0x44:
            this.bit_b_r(0, "H");
            break;
          case 0x45:
            this.bit_b_r(0, "L");
            break;
          case 0x46:
            this.bit_b_m_hl(0);
            break;
          case 0x4f:
            this.bit_b_r(1, "A");
            break;
          case 0x48:
            this.bit_b_r(1, "B");
            break;
          case 0x49:
            this.bit_b_r(1, "C");
            break;
          case 0x4a:
            this.bit_b_r(1, "D");
            break;
          case 0x4b:
            this.bit_b_r(1, "E");
            break;
          case 0x4c:
            this.bit_b_r(1, "H");
            break;
          case 0x4d:
            this.bit_b_r(1, "L");
            break;
          case 0x4e:
            this.bit_b_m_hl(1);
            break;
          case 0x57:
            this.bit_b_r(2, "A");
            break;
          case 0x50:
            this.bit_b_r(2, "B");
            break;
          case 0x51:
            this.bit_b_r(2, "C");
            break;
          case 0x52:
            this.bit_b_r(2, "D");
            break;
          case 0x53:
            this.bit_b_r(2, "E");
            break;
          case 0x54:
            this.bit_b_r(2, "H");
            break;
          case 0x55:
            this.bit_b_r(2, "L");
            break;
          case 0x56:
            this.bit_b_m_hl(2);
            break;
          case 0x5f:
            this.bit_b_r(3, "A");
            break;
          case 0x58:
            this.bit_b_r(3, "B");
            break;
          case 0x59:
            this.bit_b_r(3, "C");
            break;
          case 0x5a:
            this.bit_b_r(3, "D");
            break;
          case 0x5b:
            this.bit_b_r(3, "E");
            break;
          case 0x5c:
            this.bit_b_r(3, "H");
            break;
          case 0x5d:
            this.bit_b_r(3, "L");
            break;
          case 0x5e:
            this.bit_b_m_hl(3);
            break;
          case 0x67:
            this.bit_b_r(4, "A");
            break;
          case 0x60:
            this.bit_b_r(4, "B");
            break;
          case 0x61:
            this.bit_b_r(4, "C");
            break;
          case 0x62:
            this.bit_b_r(4, "D");
            break;
          case 0x63:
            this.bit_b_r(4, "E");
            break;
          case 0x64:
            this.bit_b_r(4, "H");
            break;
          case 0x65:
            this.bit_b_r(4, "L");
            break;
          case 0x66:
            this.bit_b_m_hl(4);
            break;
          case 0x6f:
            this.bit_b_r(5, "A");
            break;
          case 0x68:
            this.bit_b_r(5, "B");
            break;
          case 0x69:
            this.bit_b_r(5, "C");
            break;
          case 0x6a:
            this.bit_b_r(5, "D");
            break;
          case 0x6b:
            this.bit_b_r(5, "E");
            break;
          case 0x6c:
            this.bit_b_r(5, "H");
            break;
          case 0x6d:
            this.bit_b_r(5, "L");
            break;
          case 0x6e:
            this.bit_b_m_hl(5);
            break;
          case 0x77:
            this.bit_b_r(6, "A");
            break;
          case 0x70:
            this.bit_b_r(6, "B");
            break;
          case 0x71:
            this.bit_b_r(6, "C");
            break;
          case 0x72:
            this.bit_b_r(6, "D");
            break;
          case 0x73:
            this.bit_b_r(6, "E");
            break;
          case 0x74:
            this.bit_b_r(6, "H");
            break;
          case 0x75:
            this.bit_b_r(6, "L");
            break;
          case 0x76:
            this.bit_b_m_hl(6);
            break;
          case 0x7f:
            this.bit_b_r(7, "A");
            break;
          case 0x78:
            this.bit_b_r(7, "B");
            break;
          case 0x79:
            this.bit_b_r(7, "C");
            break;
          case 0x7a:
            this.bit_b_r(7, "D");
            break;
          case 0x7b:
            this.bit_b_r(7, "E");
            break;
          case 0x7c:
            this.bit_b_r(7, "H");
            break;
          case 0x7d:
            this.bit_b_r(7, "L");
            break;
          case 0x7e:
            this.bit_b_m_hl(7);
            break;

          case 0xc7:
            this.set_b_r(0, "A");
            break;
          case 0xc0:
            this.set_b_r(0, "B");
            break;
          case 0xc1:
            this.set_b_r(0, "C");
            break;
          case 0xc2:
            this.set_b_r(0, "D");
            break;
          case 0xc3:
            this.set_b_r(0, "E");
            break;
          case 0xc4:
            this.set_b_r(0, "H");
            break;
          case 0xc5:
            this.set_b_r(0, "L");
            break;
          case 0xc6:
            this.set_b_m_hl(0);
            break;
          case 0xcf:
            this.set_b_r(1, "A");
            break;
          case 0xc8:
            this.set_b_r(1, "B");
            break;
          case 0xc9:
            this.set_b_r(1, "C");
            break;
          case 0xca:
            this.set_b_r(1, "D");
            break;
          case 0xcb:
            this.set_b_r(1, "E");
            break;
          case 0xcc:
            this.set_b_r(1, "H");
            break;
          case 0xcd:
            this.set_b_r(1, "L");
            break;
          case 0xce:
            this.set_b_m_hl(1);
            break;
          case 0xd7:
            this.set_b_r(2, "A");
            break;
          case 0xd0:
            this.set_b_r(2, "B");
            break;
          case 0xd1:
            this.set_b_r(2, "C");
            break;
          case 0xd2:
            this.set_b_r(2, "D");
            break;
          case 0xd3:
            this.set_b_r(2, "E");
            break;
          case 0xd4:
            this.set_b_r(2, "H");
            break;
          case 0xd5:
            this.set_b_r(2, "L");
            break;
          case 0xd6:
            this.set_b_m_hl(2);
            break;
          case 0xdf:
            this.set_b_r(3, "A");
            break;
          case 0xd8:
            this.set_b_r(3, "B");
            break;
          case 0xd9:
            this.set_b_r(3, "C");
            break;
          case 0xda:
            this.set_b_r(3, "D");
            break;
          case 0xdb:
            this.set_b_r(3, "E");
            break;
          case 0xdc:
            this.set_b_r(3, "H");
            break;
          case 0xdd:
            this.set_b_r(3, "L");
            break;
          case 0xde:
            this.set_b_m_hl(3);
            break;
          case 0xe7:
            this.set_b_r(4, "A");
            break;
          case 0xe0:
            this.set_b_r(4, "B");
            break;
          case 0xe1:
            this.set_b_r(4, "C");
            break;
          case 0xe2:
            this.set_b_r(4, "D");
            break;
          case 0xe3:
            this.set_b_r(4, "E");
            break;
          case 0xe4:
            this.set_b_r(4, "H");
            break;
          case 0xe5:
            this.set_b_r(4, "L");
            break;
          case 0xe6:
            this.set_b_m_hl(4);
            break;
          case 0xef:
            this.set_b_r(5, "A");
            break;
          case 0xe8:
            this.set_b_r(5, "B");
            break;
          case 0xe9:
            this.set_b_r(5, "C");
            break;
          case 0xea:
            this.set_b_r(5, "D");
            break;
          case 0xeb:
            this.set_b_r(5, "E");
            break;
          case 0xec:
            this.set_b_r(5, "H");
            break;
          case 0xed:
            this.set_b_r(5, "L");
            break;
          case 0xee:
            this.set_b_m_hl(5);
            break;
          case 0xf7:
            this.set_b_r(6, "A");
            break;
          case 0xf0:
            this.set_b_r(6, "B");
            break;
          case 0xf1:
            this.set_b_r(6, "C");
            break;
          case 0xf2:
            this.set_b_r(6, "D");
            break;
          case 0xf3:
            this.set_b_r(6, "E");
            break;
          case 0xf4:
            this.set_b_r(6, "H");
            break;
          case 0xf5:
            this.set_b_r(6, "L");
            break;
          case 0xf6:
            this.set_b_m_hl(6);
            break;
          case 0xff:
            this.set_b_r(7, "A");
            break;
          case 0xf8:
            this.set_b_r(7, "B");
            break;
          case 0xf9:
            this.set_b_r(7, "C");
            break;
          case 0xfa:
            this.set_b_r(7, "D");
            break;
          case 0xfb:
            this.set_b_r(7, "E");
            break;
          case 0xfc:
            this.set_b_r(7, "H");
            break;
          case 0xfd:
            this.set_b_r(7, "L");
            break;
          case 0xfe:
            this.set_b_m_hl(7);
            break;

          case 0x87:
            this.res_b_r(0, "A");
            break;
          case 0x80:
            this.res_b_r(0, "B");
            break;
          case 0x81:
            this.res_b_r(0, "C");
            break;
          case 0x82:
            this.res_b_r(0, "D");
            break;
          case 0x83:
            this.res_b_r(0, "E");
            break;
          case 0x84:
            this.res_b_r(0, "H");
            break;
          case 0x85:
            this.res_b_r(0, "L");
            break;
          case 0x86:
            this.res_b_m_hl(0);
            break;
          case 0x8f:
            this.res_b_r(1, "A");
            break;
          case 0x88:
            this.res_b_r(1, "B");
            break;
          case 0x89:
            this.res_b_r(1, "C");
            break;
          case 0x8a:
            this.res_b_r(1, "D");
            break;
          case 0x8b:
            this.res_b_r(1, "E");
            break;
          case 0x8c:
            this.res_b_r(1, "H");
            break;
          case 0x8d:
            this.res_b_r(1, "L");
            break;
          case 0x8e:
            this.res_b_m_hl(1);
            break;
          case 0x97:
            this.res_b_r(2, "A");
            break;
          case 0x90:
            this.res_b_r(2, "B");
            break;
          case 0x91:
            this.res_b_r(2, "C");
            break;
          case 0x92:
            this.res_b_r(2, "D");
            break;
          case 0x93:
            this.res_b_r(2, "E");
            break;
          case 0x94:
            this.res_b_r(2, "H");
            break;
          case 0x95:
            this.res_b_r(2, "L");
            break;
          case 0x96:
            this.res_b_m_hl(2);
            break;
          case 0x9f:
            this.res_b_r(3, "A");
            break;
          case 0x98:
            this.res_b_r(3, "B");
            break;
          case 0x99:
            this.res_b_r(3, "C");
            break;
          case 0x9a:
            this.res_b_r(3, "D");
            break;
          case 0x9b:
            this.res_b_r(3, "E");
            break;
          case 0x9c:
            this.res_b_r(3, "H");
            break;
          case 0x9d:
            this.res_b_r(3, "L");
            break;
          case 0x9e:
            this.res_b_m_hl(3);
            break;
          case 0xa7:
            this.res_b_r(4, "A");
            break;
          case 0xa0:
            this.res_b_r(4, "B");
            break;
          case 0xa1:
            this.res_b_r(4, "C");
            break;
          case 0xa2:
            this.res_b_r(4, "D");
            break;
          case 0xa3:
            this.res_b_r(4, "E");
            break;
          case 0xa4:
            this.res_b_r(4, "H");
            break;
          case 0xa5:
            this.res_b_r(4, "L");
            break;
          case 0xa6:
            this.res_b_m_hl(4);
            break;
          case 0xaf:
            this.res_b_r(5, "A");
            break;
          case 0xa8:
            this.res_b_r(5, "B");
            break;
          case 0xa9:
            this.res_b_r(5, "C");
            break;
          case 0xaa:
            this.res_b_r(5, "D");
            break;
          case 0xab:
            this.res_b_r(5, "E");
            break;
          case 0xac:
            this.res_b_r(5, "H");
            break;
          case 0xad:
            this.res_b_r(5, "L");
            break;
          case 0xae:
            this.res_b_m_hl(5);
            break;
          case 0xb7:
            this.res_b_r(6, "A");
            break;
          case 0xb0:
            this.res_b_r(6, "B");
            break;
          case 0xb1:
            this.res_b_r(6, "C");
            break;
          case 0xb2:
            this.res_b_r(6, "D");
            break;
          case 0xb3:
            this.res_b_r(6, "E");
            break;
          case 0xb4:
            this.res_b_r(6, "H");
            break;
          case 0xb5:
            this.res_b_r(6, "L");
            break;
          case 0xb6:
            this.res_b_m_hl(6);
            break;
          case 0xbf:
            this.res_b_r(7, "A");
            break;
          case 0xb8:
            this.res_b_r(7, "B");
            break;
          case 0xb9:
            this.res_b_r(7, "C");
            break;
          case 0xba:
            this.res_b_r(7, "D");
            break;
          case 0xbb:
            this.res_b_r(7, "E");
            break;
          case 0xbc:
            this.res_b_r(7, "H");
            break;
          case 0xbd:
            this.res_b_r(7, "L");
            break;
          case 0xbe:
            this.res_b_m_hl(7);
            break;

          default:
            this.log(
              `ERROR ${toHex(instr)} ${toHex(op1)} ${toHex(op2)} / ${
                toHex(op16)
              }`,
            );
            throw `dispatch 0xcb ${toHex(op1)}`;
            this.pc += 2;
            break;
        }
        break;

      default:
        this.log(
          `ERROR ${toHex(instr)} ${toHex(op1)} ${toHex(op2)} / ${toHex(op16)}`,
        );
        throw `dispatch ${toHex(instr)}`;
        this.pc += 1;
        break;
    }
  }

  _add_u8(a: U8, b: U8): U8 {
    let c = a + b;
    if (((a & 0xf) + (b & 0xf)) > 0xf) {
      this.half = 1;
    } else {
      this.half = 0;
    }
    if (c > 0xff) {
      this.carry = 1;
      return c - 0x100;
    } else {
      this.carry = 0;
    }
    if (c < 0) {
      this.carry = 1;
      return 0x100 + c;
    }
    return c;
  }

  _add_u16(a: U16, b: U16): U16 {
    let c = a + b;
    if ((a & 0x7ff) + (b & 0x7ff) > 0x7ff) {
      this.half = 1;
    }
    if (c > 0xffff) {
      this.carry = 1;
      return c - 0x10000;
    }
    if (c < 0) {
      this.carry = 1;
      return 0x10000 + c;
    }
    return c;
  }

  _sub_u8(a: U8, b: U8): U8 {
    let c = a - b;
    if ((a & 0xf) - (b & 0xf) < 0) {
      this.half = 1;
    } else {
      this.half = 0;
    }
    if (c < 0) {
      this.carry = 1;
      return 0x100 + c;
    } else {
      this.carry = 0;
    }
    if (c > 0xff) {
      this.carry = 1;
      return c - 0x100;
    }
    return c;
  }

  _sub_u16(a: U16, b: U16): U16 {
    let c = a - b;
    if ((a & 0x7ff) - (b & 0x7ff) < 0) {
      this.half = 1;
    }
    if (c < 0) {
      this.carry = 1;
      return 0x10000 + c;
    }
    if (c > 0xffff) {
      this.carry = 1;
      return c - 0x10000;
    }
    return c;
  }

  ld_r_u8(r: Operand, u: U8) {
    this.log(`LD ${r} ${toHex(u)}`);
    switch (r) {
      case "A":
        this.a = u;
        break;
      case "B":
        this.b = u;
        break;
      case "C":
        this.c = u;
        break;
      case "D":
        this.d = u;
        break;
      case "E":
        this.e = u;
        break;
      case "H":
        this.h = u;
        break;
      case "L":
        this.l = u;
        break;
      default:
        throw "ld_r_u8 ${r} ${u}";
        break;
    }
    this.pc += 2;
    this.clock = 8;
  }

  ld_r_r(r1: Operand, u: U8, t: string) {
    this.log(`LD ${r1} ${t}:${toHex(u)}`);
    switch (r1) {
      case "A":
        this.a = u;
        break;
      case "B":
        this.b = u;
        break;
      case "C":
        this.c = u;
        break;
      case "D":
        this.d = u;
        break;
      case "E":
        this.e = u;
        break;
      case "H":
        this.h = u;
        break;
      case "L":
        this.l = u;
        break;
      default:
        throw "ld_r_r ${r1}";
    }

    this.pc += 1;
    this.clock = 4;
  }

  ld_r_m(r: Operand, m: U16, t: string) {
    this.log(`LD ${r} (${t}:${toHex(m)})`);
    switch (r) {
      case "A":
        this.a = this.m.read(m);
        break;
      case "B":
        this.b = this.m.read(m);
        break;
      case "C":
        this.c = this.m.read(m);
        break;
      case "D":
        this.d = this.m.read(m);
        break;
      case "E":
        this.e = this.m.read(m);
        break;
      case "H":
        this.h = this.m.read(m);
        break;
      case "L":
        this.l = this.m.read(m);
        break;
      default:
        throw "ld_r_m";
    }
    this.pc += 1;
    this.clock = 8;
  }

  ld_m_r(m: U16, r: U16, t1: string, t2: string) {
    this.log(`LD (${t1}:${toHex(m)}) ${t2}:${toHex(r)}`);
    this.m.write(m, r);
    this.pc += 1;
    this.clock = 8;
  }

  ld_m_i16_r(m: U16, r: U8, t: string) {
    this.log(`LD (${toHex(m)}) ${t}:${toHex(r)}`);
    this.m.write(m, r);
    this.pc += 3;
    this.clock = 8;
  }

  ld_m_u8(m: U16, u: U8, t: string) {
    this.log(`LD (${t}:${toHex(m)}) ${toHex(u)}`);
    this.m.write(m, u);
    this.pc += 2;
    this.clock = 12;
  }

  ld_r_m_i16(r: Operand, m: U16) {
    this.log(`LD ${r} (${toHex(m)})`);
    switch (r) {
      case "A":
        this.a = this.m.read(m);
        break;
      default:
        throw "ld_r_m_i16";
    }
    this.pc += 3;
    this.clock = 16;
  }

  ldd_a_m_hl() {
    this.log(`LDD A (HL:${toHex(this.hl)})`);
    this.a = this.m.read(this.hl);
    this.hl = this._sub_u16(this.hl, 1);
    this.pc += 1;
    this.clock = 8;
  }

  ldd_m_hl_a() {
    this.log(`LDD (HL:${toHex(this.hl)}) A:${toHex(this.a)}`);
    this.m.write(this.hl, this.a);
    this.hl = this.hl - 1;
    this.pc += 1;
    this.clock = 8;
  }

  ldi_a_m_hl() {
    this.log(`LDI A (HL:${toHex(this.hl)})`);
    this.a = this.m.read(this.hl);
    this.hl = this._add_u16(this.hl, 1);
    this.pc += 1;
    this.clock = 8;
  }

  ldi_m_hl_a() {
    this.log(`LDI (HL:${toHex(this.hl)}) A:${toHex(this.a)}`);
    this.m.write(this.hl, this.a);
    this.hl = this._add_u16(this.hl, 1);
    this.pc += 1;
    this.clock = 8;
  }

  ldh_m_r(m: U16, r: U8, t: string) {
    this.log(`LDH ($FF00+${toHex(m)}) ${t}:${toHex(r)}`);
    this.m.write(0xFF00 + m, r);
    this.pc += 2;
    this.clock = 12;
  }

  ldh_r_m(r: Operand, m: U8) {
    this.log(`LDH ${r} ($FF00+${toHex(m)})`);
    switch (r) {
      case "A":
        this.a = this.m.read(0xFF00 + m);
        break;
      default:
        throw "ldh_r_m";
    }
    this.pc += 2;
    this.clock = 12;
  }

  ld_rr_i16(r: Operand, u: U16) {
    this.log(`LD ${r} ${toHex(u)}`);
    switch (r) {
      case "BC":
        this.bc = u;
        break;
      case "DE":
        this.de = u;
        break;
      case "HL":
        this.hl = u;
        break;
      case "SP":
        this.sp = u;
        break;
      default:
        throw "ld_rr_i16";
    }
    this.pc += 3;
    this.clock = 12;
  }

  ld_sp_hl() {
    this.log(`LD SP HL:${toHex(this.hl)}`);
    this.sp = this.hl;
    this.pc += 1;
    this.clock = 8;
  }

  ld_hl_sp_i8(u: U8) {
    let i = toI8(u);
    this.log(`LD HL SP${showI8(i)}`);
    const offset = u << 24 >> 24;
    const tmp = this.sp + offset;
    this.carry = (this.sp & 0xff) + (offset & 0xff) > 0xff ? 1 : 0;
    this.half = (this.sp & 0xf) + (offset & 0xf) > 0xf ? 1 : 0;
    if (tmp > 0xffff) {
      this.hl = tmp - 0x10000;
    } else if (tmp < 0) {
      this.hl = tmp + 0x10000;
    } else {
      this.hl = tmp;
    }
    this.zero = 0;
    this.negative = 0;
    this.pc += 2;
    this.clock = 12;
  }

  ld_m_i16_sp(u: U16) {
    this.log(`LD (${toHex(u)}) SP:${toHex(this.sp)}`);
    this.m.write(u, this.sp & 0xff);
    this.m.write(u + 1, this.sp >> 8 & 0xff);
    this.pc += 3;
    this.clock = 20;
  }

  push_rr(u1: U8, u2: U8, t: string) {
    this.log(`PUSH ${t}`);
    this.m.write(this.sp - 1, u1);
    this.m.write(this.sp - 2, u2);
    this.sp -= 2;
    this.pc += 1;
    this.clock = 16;
  }

  pop_rr(r: Operand) {
    this.log(`POP ${r}`);
    switch (r) {
      case "AF":
        this.a = this.m.read(this.sp + 1);
        this.f = this.m.read(this.sp) & 0xf0;
        break;
      case "BC":
        this.b = this.m.read(this.sp + 1);
        this.c = this.m.read(this.sp);
        break;
      case "DE":
        this.d = this.m.read(this.sp + 1);
        this.e = this.m.read(this.sp);
        break;
      case "HL":
        this.h = this.m.read(this.sp + 1);
        this.l = this.m.read(this.sp);
        break;
      default:
        throw "pop_rr";
    }
    this.sp += 2;
    this.pc += 1;
    this.clock = 12;
  }

  add_a_r(u: U8, t: string) {
    this.log(`ADD A ${t}`);
    this.a = this._add_u8(this.a, u);
    this.zero = isZero(this.a);
    this.negative = 0;
    this.pc += 1;
    this.clock = 4;
  }

  add_a_m_hl() {
    this.log(`ADD A (HL:${toHex(this.hl)})`);
    this.a = this._add_u8(this.a, this.m.read(this.hl));
    this.zero = isZero(this.a);
    this.negative = 0;
    this.pc += 1;
    this.clock = 8;
  }

  add_a_u8(u: U8) {
    this.log(`ADD A ${toHex(u)}`);
    this.a = this._add_u8(this.a, u);
    this.zero = isZero(this.a);
    this.negative = 0;
    this.pc += 2;
    this.clock = 8;
  }

  adc_a_r(u: U8, t: string) {
    this.log(`ADC A ${t}`);
    if (((this.a & 0xf) + (u & 0xf) + this.carry) > 0xf) {
      this.half = 1;
    } else {
      this.half = 0;
    }
    this.a = this.a + u + this.carry;
    if (this.a > 0xff) {
      this.carry = 1;
      this.a -= 0x100;
    } else {
      this.carry = 0;
    }
    this.zero = isZero(this.a);
    this.negative = 0;
    this.pc += 1;
    this.clock = 4;
  }

  adc_a_m_hl() {
    this.log(`ADC A (HL:${toHex(this.hl)})`);
    const mhl = this.m.read(this.hl);
    if (((this.a & 0xf) + (mhl & 0xf) + this.carry) > 0xf) {
      this.half = 1;
    } else {
      this.half = 0;
    }
    this.a = this.a + mhl + this.carry;
    if (this.a > 0xff) {
      this.carry = 1;
      this.a -= 0x100;
    } else {
      this.carry = 0;
    }
    this.zero = isZero(this.a);
    this.negative = 0;
    this.pc += 1;
    this.clock = 8;
  }

  adc_a_u8(u: U8) {
    this.log(`ADC A ${toHex(u)}`);
    if (((this.a & 0xf) + (u & 0xf) + this.carry) > 0xf) {
      this.half = 1;
    } else {
      this.half = 0;
    }
    this.a = this.a + u + this.carry;
    if (this.a > 0xff) {
      this.carry = 1;
      this.a -= 0x100;
    } else {
      this.carry = 0;
    }
    this.zero = isZero(this.a);
    this.negative = 0;
    this.pc += 2;
    this.clock = 8;
  }

  sub_a_r(u: U8, t: string) {
    this.log(`SUB A ${t}`);
    this.a = this._sub_u8(this.a, u);
    this.zero = isZero(this.a);
    this.negative = 1;
    this.pc += 1;
    this.clock = 4;
  }

  sub_a_m_hl() {
    this.log(`SUB A (HL:${toHex(this.hl)})`);
    this.a = this._sub_u8(this.a, this.m.read(this.hl));
    this.zero = isZero(this.a);
    this.negative = 1;
    this.pc += 1;
    this.clock = 8;
  }

  sub_a_u8(u: U8) {
    this.log(`SUB A ${toHex(u)}`);
    this.a = this._sub_u8(this.a, u);
    this.zero = isZero(this.a);
    this.negative = 1;
    this.pc += 2;
    this.clock = 8;
  }

  sbc_a_r(u: U8, t: string) {
    this.log(`SBC A ${t}`);
    if ((this.a & 0xf) - (u & 0xf) - this.carry < 0) {
      this.half = 1;
    } else {
      this.half = 0;
    }
    this.a = this.a - u - this.carry;
    if (this.a < 0) {
      this.carry = 1;
      this.a += 0x100;
    } else {
      this.carry = 0;
    }
    this.zero = isZero(this.a);
    this.negative = 1;
    this.pc += 1;
    this.clock = 4;
  }

  sbc_a_m_hl() {
    this.log(`SBC A (HL:${toHex(this.hl)})`);
    const mhl = this.m.read(this.hl);
    if ((this.a & 0xf) - (mhl & 0xf) - this.carry < 0) {
      this.half = 1;
    } else {
      this.half = 0;
    }
    this.a = this.a - mhl - this.carry;
    if (this.a < 0) {
      this.carry = 1;
      this.a += 0x100;
    } else {
      this.carry = 0;
    }
 
    this.zero = isZero(this.a);
    this.negative = 1;
    this.pc += 1;
    this.clock = 8;
  }

  sbc_a_u8(u: U8) {
    this.log(`SBC A ${toHex(u)}`);
    if ((this.a & 0xf) - (u & 0xf) - this.carry < 0) {
      this.half = 1;
    } else {
      this.half = 0;
    }
    this.a = this.a - u - this.carry;
    if (this.a < 0) {
      this.carry = 1;
      this.a += 0x100;
    } else {
      this.carry = 0;
    }
    this.zero = isZero(this.a);
    this.negative = 1;
    this.pc += 2;
    this.clock = 8;
  }

  and_a_r(u: U8, t: string) {
    this.log(`AND A ${t}:${toHex(u)}`);
    this.a = this.a & u;
    this.zero = isZero(this.a);
    this.negative = 0;
    this.half = 1;
    this.carry = 0;
    this.pc += 1;
    this.clock = 4;
  }

  and_a_m_hl() {
    this.log(`AND A (HL:${toHex(this.hl)})`);
    this.a = this.a & this.m.read(this.hl);
    this.zero = isZero(this.a);
    this.negative = 0;
    this.half = 1;
    this.carry = 0;
    this.pc += 1;
    this.clock = 8;
  }

  and_a_u8(u: U8) {
    this.log(`AND A ${toHex(u)}`);
    this.a = this.a & u;
    this.zero = isZero(this.a);
    this.negative = 0;
    this.half = 1;
    this.carry = 0;
    this.pc += 2;
    this.clock = 8;
  }

  or_a_r(u: U8, t: string) {
    this.log(`OR A ${t}:${toHex(u)}`);
    this.a = this.a | u;
    this.zero = isZero(this.a);
    this.negative = 0;
    this.half = 0;
    this.carry = 0;
    this.pc += 1;
    this.clock = 4;
  }

  or_a_m_hl() {
    this.log(`OR A (HL:${toHex(this.hl)})`);
    this.a = this.a | this.m.read(this.hl);
    this.zero = isZero(this.a);
    this.negative = 0;
    this.half = 0;
    this.carry = 0;
    this.pc += 1;
    this.clock = 8;
  }

  or_a_u8(u: U8) {
    this.log(`OR A ${toHex(u)}`);
    this.a = this.a | u;
    this.zero = isZero(this.a);
    this.negative = 0;
    this.half = 0;
    this.carry = 0;
    this.pc += 2;
    this.clock = 8;
  }

  xor_a_r(u: U8, t: string) {
    this.log(`XOR A ${t}:${toHex(u)}`);
    this.a = this.a ^ u;
    this.zero = isZero(this.a);
    this.negative = 0;
    this.half = 0;
    this.carry = 0;
    this.pc += 1;
    this.clock = 4;
  }

  xor_a_m_hl() {
    this.log(`XOR A (HL:${toHex(this.hl)})`);
    this.a = this.a ^ this.m.read(this.hl);
    this.zero = isZero(this.a);
    this.negative = 0;
    this.half = 0;
    this.carry = 0;
    this.pc += 1;
    this.clock = 8;
  }

  xor_a_u8(u: U8) {
    this.log(`XOR A ${toHex(u)}`);
    this.a = this.a ^ u;
    this.zero = isZero(this.a);
    this.negative = 0;
    this.half = 0;
    this.carry = 0;
    this.pc += 2;
    this.clock = 8;
  }

  cp_a_r(u: U8, t: string) {
    this.log(`CP A ${t}:${toHex(u)}`);
    const a = this.a - u;
    this.zero = isZero(a);
    this.negative = 1;
    this.half = (this.a & 0xf) - (u & 0xf) < 0 ? 1 : 0;
    this.carry = this.a < u ? 1 : 0;
    this.pc += 1;
    this.clock = 4;
  }

  cp_a_m_hl() {
    this.log(`CP A (HL:${toHex(this.hl)})`);
    const mhl = this.m.read(this.hl);
    const a = this.a - mhl;
    this.zero = isZero(a);
    this.negative = 1;
    this.half = (this.a & 0xf) - (mhl & 0xf) < 0 ? 1 : 0;
    this.carry = this.a < mhl ? 1 : 0;
    this.pc += 1;
    this.clock = 8;
  }

  cp_a_u8(u: U8) {
    this.log(`CP A ${toHex(u)}`);
    const a = this.a - u;
    this.zero = isZero(a);
    this.negative = 1;
    this.half = (this.a & 0xf) - (u & 0xf) < 0 ? 1 : 0;
    this.carry = this.a < u ? 1 : 0;
    this.pc += 2;
    this.clock = 8;
  }

  inc_r(r: Operand) {
    this.log(`INC ${r}`);
    let c = this.carry;
    let a = 0;
    switch (r) {
      case "A":
        a = this.a = this._add_u8(this.a, 1);
        break;
      case "B":
        a = this.b = this._add_u8(this.b, 1);
        break;
      case "C":
        a = this.c = this._add_u8(this.c, 1);
        break;
      case "D":
        a = this.d = this._add_u8(this.d, 1);
        break;
      case "E":
        a = this.e = this._add_u8(this.e, 1);
        break;
      case "H":
        a = this.h = this._add_u8(this.h, 1);
        break;
      case "L":
        a = this.l = this._add_u8(this.l, 1);
        break;
      default:
        throw "inc_r";
    }
    this.zero = isZero(a);
    this.negative = 0;
    this.carry = c;
    this.pc += 1;
    this.clock = 4;
  }

  inc_m_hl() {
    this.log(`INC (HL:${toHex(this.hl)})`);
    let c = this.carry;
    this.m.write(this.hl, this._add_u8(this.m.read(this.hl), 1));
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 0;
    this.carry = c;
    this.pc += 1;
    this.clock = 12;
  }

  dec_r(r: Operand) {
    this.log(`DEC ${r}`);
    let c = this.carry;
    let a = 0;
    switch (r) {
      case "A":
        a = this.a = this._sub_u8(this.a, 1);
        break;
      case "B":
        a = this.b = this._sub_u8(this.b, 1);
        break;
      case "C":
        a = this.c = this._sub_u8(this.c, 1);
        break;
      case "D":
        a = this.d = this._sub_u8(this.d, 1);
        break;
      case "E":
        a = this.e = this._sub_u8(this.e, 1);
        break;
      case "H":
        a = this.h = this._sub_u8(this.h, 1);
        break;
      case "L":
        a = this.l = this._sub_u8(this.l, 1);
        break;
      default:
        throw "dec_r";
    }
    this.zero = isZero(a);
    this.negative = 1;
    this.carry = c;
    this.pc += 1;
    this.clock = 4;
  }

  dec_m_hl() {
    this.log(`DEC (HL:${toHex(this.hl)})`);
    const c = this.carry;
    this.m.write(this.hl, this._sub_u8(this.m.read(this.hl), 1));
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 1;
    this.carry = c;
    this.pc += 1;
    this.clock = 12;
  }

  add_hl_rr(u: U16, t: string) {
    this.log(`ADD HL ${t}:${toHex(u)}`);
    if ((this.hl & 0x7ff) + (u & 0x7ff) > 0x7ff) {
      this.half = 1;
    } else {
      this.half = 0;
    }
    this.hl = this.hl + u;
    if (this.hl > 0xffff) {
      this.carry = 1;
      this.hl -= 0x10000;
    } else {
      this.carry = 0;
    }
    this.negative = 0;
    this.pc += 1;
    this.clock = 8;
  }

  add_sp_i8(u: U8) {
    const i = toI8(u);
    this.log(`ADD SP ${showI8(i)}`);
    this.carry = (this.sp & 0xff) + (i & 0xff) > 0xff ? 1 : 0;
    this.half = (this.sp & 0xf) + (i & 0xf) > 0xf ? 1 : 0;
    this.sp += i;
    if (this.sp > 0xffff) {
      this.sp -= 0x10000;
    } else if (this.sp < 0) {
      this.sp += 0x10000;
    }
    this.zero = 0;
    this.negative = 0;
    this.pc += 2;
    this.clock = 16;
  }

  inc_rr(r: Operand) {
    this.log(`INC ${r}`);
    const f = this.f;
    switch (r) {
      case "BC":
        this.bc = this._add_u16(this.bc, 1);
        break;
      case "DE":
        this.de = this._add_u16(this.de, 1);
        break;
      case "HL":
        this.hl = this._add_u16(this.hl, 1);
        break;
      case "SP":
        this.sp = this._add_u16(this.sp, 1);
        break;
      default:
        throw "inc_rr";
    }
    this.f = f;
    this.pc += 1;
    this.clock = 8;
  }

  dec_rr(r: Operand) {
    this.log(`DEC ${r}`);
    const f = this.f;
    switch (r) {
      case "BC":
        this.bc = this._sub_u16(this.bc, 1);
        break;
      case "DE":
        this.de = this._sub_u16(this.de, 1);
        break;
      case "HL":
        this.hl = this._sub_u16(this.hl, 1);
        break;
      case "SP":
        this.sp = this._sub_u16(this.sp, 1);
        break;
      default:
        throw "dec_rr";
    }
    this.f = f;
    this.pc += 1;
    this.clock = 8;
  }

  swap_r(r: Operand) {
    this.log(`SWAP ${r}`);
    let a = 0;
    switch (r) {
      case "A":
        a = this.a = ((this.a & 0xf) << 4) | ((this.a & 0xf0) >> 4);
        break;
      case "B":
        a = this.b = ((this.b & 0xf) << 4) | ((this.b & 0xf0) >> 4);
        break;
      case "C":
        a = this.c = ((this.c & 0xf) << 4) | ((this.c & 0xf0) >> 4);
        break;
      case "D":
        a = this.d = ((this.d & 0xf) << 4) | ((this.d & 0xf0) >> 4);
        break;
      case "E":
        a = this.e = ((this.e & 0xf) << 4) | ((this.e & 0xf0) >> 4);
        break;
      case "H":
        a = this.h = ((this.h & 0xf) << 4) | ((this.h & 0xf0) >> 4);
        break;
      case "L":
        a = this.l = ((this.l & 0xf) << 4) | ((this.l & 0xf0) >> 4);
        break;
      default:
        throw "swap_r";
    }
    this.zero = isZero(a);
    this.negative = 0;
    this.half = 0;
    this.carry = 0;
    this.pc += 2;
    this.clock = 8;
  }

  swap_m_hl() {
    this.log(`SWAP (HL:${toHex(this.hl)}])`);
    const v = this.m.read(this.hl);
    this.m.write(this.hl, ((v & 0xf) << 4) | ((v & 0xf0) >> 4));
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 0;
    this.half = 0;
    this.carry = 0;
    this.pc += 2;
    this.clock = 16;
  }

  daa() {
    this.log(`DAA A:${toHex(this.a)}`);

    //let a = this.a;
    //const n = this.negative == 1;
    //const c = this.carry == 1;
    //const h = this.half == 1;
    //const m = this.a >> 4 & 0xf;
    //const l = this.a & 0xf;

    //const b08 = (b: number): boolean => b >= 0 && b <= 8;
    //const b09 = (b: number): boolean => b >= 0 && b <= 9;
    //const baf = (b: number): boolean => b >= 0xa && b <= 0xf;
    //const b9f = (b: number): boolean => b >= 9 && b <= 0xf;
    //const b02 = (b: number): boolean => b >= 0 && b <= 2;
    //const b03 = (b: number): boolean => b >= 0 && b <= 3;
    //const b7f = (b: number): boolean => b >= 7 && b <= 0xf;
    //const b6f = (b: number): boolean => b >= 6 && b <= 0xf;

    //if (!n && !c && !h && b09(m) && b09(l)) {
    //  this.carry = 0;
    //} else if (!n && !c && !h && b08(m) && baf(l)) {
    //  this.a += 0x6;
    //  this.carry = 0;
    //} else if (!n && !c && h && b09(m) && b03(l)) {
    //  this.a += 0x6;
    //  this.carry = 0;
    //} else if (!n && !c && !h && baf(m) && b09(l)) {
    //  this.a += 0x60;
    //  this.carry = 1;
    //} else if (!n && !c && !h && b9f(m) && baf(l)) {
    //  this.a += 0x66;
    //  this.carry = 1;
    //} else if (!n && !c && h && baf(m) && b03(l)) {
    //  this.a += 0x66;
    //  this.carry = 1;
    //} else if (!n && c && !h && b02(m) && b09(l)) {
    //  this.a += 0x60;
    //  this.carry = 1;
    //} else if (!n && c && !h && b02(m) && baf(l)) {
    //  this.a += 0x66;
    //  this.carry = 1;
    //} else if (!n && c && h && b03(m) && b03(l)) {
    //  this.a += 0x66;
    //  this.carry = 1;
    //} else if (n && !c && !h && b09(m) && b09(l)) {
    //  this.carry = 0;
    //} else if (n && !c && h && b08(m) && b6f(l)) {
    //  this.a += 0xfa;
    //  this.carry = 0;
    //} else if (n && c && !h && b7f(m) && b09(l)) {
    //  this.a += 0xa0;
    //  this.carry = 1;
    //} else if (n && c && h && b6f(m) && b6f(l)) {
    //  this.a += 0x9a;
    //  this.carry = 1;
    //}
    //if (this.a > 0xff) {
    //  this.a -= 0x100;
    //}

    let tmp = this.a;
    if (this.negative == 0) {
      if (this.carry == 1 || tmp > 0x99) {
        tmp += 0x60;
        this.carry = 1;
      }
      if (this.half == 1 || (tmp & 0xf) > 0x9) {
        tmp += 0x06;
      }
    } else {
      if (this.carry == 1) {
        tmp -= 0x60;
      }
      if (this.half == 1) {
        tmp -= 0x06;
      }
    }
    this.a = tmp & 0xff;

    this.zero = isZero(this.a);
    this.half = 0;
    this.pc += 1;
    this.clock = 4;
  }

  cpl() {
    this.log(`CPL A:${toHex(this.a)}`);

    this.a = this.a ^ 0xff

    this.negative = 1;
    this.half = 1;
    this.pc += 1;
    this.clock = 4;
  }

  ccf() {
    this.log(`CCF C:${toHex(this.carry)}`);
    this.carry = this.carry == 0 ? 1 : 0;
    this.negative = 0;
    this.half = 0;
    this.pc += 1;
    this.clock = 4;
  }

  scf() {
    this.log(`SCF Carry:${toHex(this.carry)}`);
    this.carry = 1;
    this.negative = 0;
    this.half = 0;
    this.pc += 1;
    this.clock = 4;
  }

  nop() {
    this.log(`NOP`);
    this.pc += 1;
    this.clock = 4;
  }

  halt() {
    this.log(`HALT`);
    //if (this.ime == 1) {
      this._halt = 1;
    //}
    this.pc += 1;
    this.clock = 4;
  }

  stop() {
    this.log(`STOP`);
    this._stop = 1;
    this.pc += 1;
    this.clock = 4;
  }

  di() {
    this.log(`DI`);
    this.ime = 0;
    this.pc += 1;
    this.clock = 4;
  }

  ei() {
    this.log(`EI`);
    this.ime = 1;
    this.pc += 1;
    this.clock = 4;
  }

  rlca() {
    this.log(`RLCA A:${toHex(this.a)}`);
    this.carry = this.a >> 7;
    this.a = ((this.a << 1) & 0xff) | this.carry;
    this.zero = 0;
    this.negative = 0;
    this.half = 0;
    this.pc += 1;
    this.clock = 4;
  }

  rla() {
    this.log(`RLA A:${toHex(this.a)}`);
    let a = this.a >> 7;
    this.a = ((this.a << 1) & 0xff) | this.carry;
    this.carry = a;
    this.zero = 0;
    this.half = 0;
    this.negative = 0;
    this.pc += 1;
    this.clock = 4;
  }

  rrca() {
    this.log(`RRCA A:${toHex(this.a)}`);
    this.carry = this.a & 1;
    this.a = (this.carry << 7) | (this.a >> 1);
    this.zero = 0
    this.half = 0;
    this.negative = 0;
    this.pc += 1;
    this.clock = 4;
  }

  rra() {
    this.log(`RRA A:${toHex(this.a)}`);
    let c = this.carry;
    this.carry = this.a & 1;
    this.a = (c << 7) | (this.a >> 1);
    this.zero = 0;
    this.negative = 0;
    this.half = 0;
    this.pc += 1;
    this.clock = 4;
  }

  rlc_r(r: Operand) {
    this.log(`RLC ${r}`);
    let a = 0;
    switch (r) {
      case "A":
        this.carry = this.a >> 7;
        a = this.a = ((this.a << 1) & 0xff) | this.carry;
        break;
      case "B":
        this.carry = this.b >> 7;
        a = this.b = ((this.b << 1) & 0xff) | this.carry;
        break;
      case "C":
        this.carry = this.c >> 7;
        a = this.c = ((this.c << 1) & 0xff) | this.carry;
        break;
      case "D":
        this.carry = this.d >> 7;
        a = this.d = ((this.d << 1) & 0xff) | this.carry;
        break;
      case "E":
        this.carry = this.e >> 7;
        a = this.e = ((this.e << 1) & 0xff) | this.carry;
        break;
      case "H":
        this.carry = this.h >> 7;
        a = this.h = ((this.h << 1) & 0xff) | this.carry;
        break;
      case "L":
        this.carry = this.l >> 7;
        a = this.l = ((this.l << 1) & 0xff) | this.carry;
        break;
      default:
        throw "rlc_r";
    }
    this.zero = isZero(a);
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 8;
  }

  rlc_m_hl() {
    this.log(`RLC (HL:${toHex(this.hl)})`);
    this.carry = this.m.read(this.hl) >> 7;
    this.m.write(this.hl, ((this.m.read(this.hl) << 1) & 0xff) | this.carry);
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 16;
  }

  rl_r(r: Operand) {
    this.log(`RLC ${r}`);
    let a = 0;
    let b = 0;
    switch (r) {
      case "A":
        b = this.a >> 7;
        a = this.a = ((this.a << 1) & 0xff) | this.carry;
        break;
      case "B":
        b = this.b >> 7;
        a = this.b = ((this.b << 1) & 0xff) | this.carry;
        break;
      case "C":
        b = this.c >> 7;
        a = this.c = ((this.c << 1) & 0xff) | this.carry;
        break;
      case "D":
        b = this.d >> 7;
        a = this.d = ((this.d << 1) & 0xff) | this.carry;
        break;
      case "E":
        b = this.e >> 7;
        a = this.e = ((this.e << 1) & 0xff) | this.carry;
        break;
      case "H":
        b = this.h >> 7;
        a = this.h = ((this.h << 1) & 0xff) | this.carry;
        break;
      case "L":
        b = this.l >> 7;
        a = this.l = ((this.l << 1) & 0xff) | this.carry;
        break;
      default:
        throw "rl_r";
    }
    this.carry = b;
    this.zero = isZero(a);
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 8;
  }

  rl_m_hl() {
    this.log(`RLC (HL:${toHex(this.hl)})`);
    let a = this.m.read(this.hl) >> 7;
    this.m.write(this.hl, ((this.m.read(this.hl) << 1) & 0xff) | this.carry);
    this.carry = a;
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 16;
  }

  rrc_r(r: Operand) {
    this.log(`RRC ${r}`);
    let a = 0;
    switch (r) {
      case "A":
        this.carry = this.a & 1;
        a = this.a = (this.carry << 7) | (this.a >> 1);
        break;
      case "B":
        this.carry = this.b & 1;
        a = this.b = (this.carry << 7) | (this.b >> 1);
        break;
      case "C":
        this.carry = this.c & 1;
        a = this.c = (this.carry << 7) | (this.c >> 1);
        break;
      case "D":
        this.carry = this.d & 1;
        a = this.d = (this.carry << 7) | (this.d >> 1);
        break;
      case "E":
        this.carry = this.e & 1;
        a = this.e = (this.carry << 7) | (this.e >> 1);
        break;
      case "H":
        this.carry = this.h & 1;
        a = this.h = (this.carry << 7) | (this.h >> 1);
        break;
      case "L":
        this.carry = this.l & 1;
        a = this.l = (this.carry << 7) | (this.l >> 1);
        break;
      default:
        throw "rrc_r";
    }
    this.zero = isZero(a);
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 8;
  }

  rrc_m_hl() {
    this.log(`RRC (HL:${toHex(this.hl)})`);
    this.carry = this.m.read(this.hl) & 1;
    this.m.write(this.hl, (this.carry << 7) | (this.m.read(this.hl) >> 1));
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 16;
  }

  rr_r(r: Operand) {
    this.log(`RR ${r}`);
    let a = 0;
    let b = this.carry;
    switch (r) {
      case "A":
        this.carry = this.a & 1;
        a = this.a = (b << 7) | (this.a >> 1);
        break;
      case "B":
        this.carry = this.b & 1;
        a = this.b = (b << 7) | (this.b >> 1);
        break;
      case "C":
        this.carry = this.c & 1;
        a = this.c = (b << 7) | (this.c >> 1);
        break;
      case "D":
        this.carry = this.d & 1;
        a = this.d = (b << 7) | (this.d >> 1);
        break;
      case "E":
        this.carry = this.e & 1;
        a = this.e = (b << 7) | (this.e >> 1);
        break;
      case "H":
        this.carry = this.h & 1;
        a = this.h = (b << 7) | (this.h >> 1);
        break;
      case "L":
        this.carry = this.l & 1;
        a = this.l = (b << 7) | (this.l >> 1);
        break;
      default:
        throw "rr_r";
    }
    this.zero = isZero(a);
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 8;
  }

  rr_m_hl() {
    this.log(`RR (HL:${toHex(this.hl)})`);
    let a = this.carry;
    this.carry = this.m.read(this.hl) & 1;
    this.m.write(this.hl, ((a << 7)) | (this.m.read(this.hl) >> 1));
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 16;
  }

  sla_r(r: Operand) {
    this.log(`SLA ${r}`);
    let a = 0;
    switch (r) {
      case "A":
        this.carry = this.a >> 7;
        a = this.a = this.a << 1 & 0xff;
        break;
      case "B":
        this.carry = this.b >> 7;
        a = this.b = this.b << 1 & 0xff;
        break;
      case "C":
        this.carry = this.c >> 7;
        a = this.c = this.c << 1 & 0xff;
        break;
      case "D":
        this.carry = this.d >> 7;
        a = this.d = this.d << 1 & 0xff;
        break;
      case "E":
        this.carry = this.e >> 7;
        a = this.e = this.e << 1 & 0xff;
        break;
      case "H":
        this.carry = this.h >> 7;
        a = this.h = this.h << 1 & 0xff;
        break;
      case "L":
        this.carry = this.l >> 7;
        a = this.l = this.l << 1 & 0xff;
        break;
      default:
        throw "sla_r";
    }
    this.zero = isZero(a);
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 8;
  }

  sla_m_hl() {
    this.log(`SLA (HL:${toHex(this.hl)})`);
    this.carry = this.m.read(this.hl) >> 7;
    this.m.write(this.hl, this.m.read(this.hl) << 1 & 0xff);
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 8;
  }

  sra_r(r: Operand) {
    this.log(`SRA ${r}`);
    let a = 0;
    switch (r) {
      case "A":
        this.carry = this.a & 1;
        a = this.a = (this.a & 0b10000000) | (this.a >> 1);
        break;
      case "B":
        this.carry = this.b & 1;
        a = this.b = (this.b & 0b10000000) | (this.b >> 1);
        break;
      case "C":
        this.carry = this.c & 1;
        a = this.c = (this.c & 0b10000000) | (this.c >> 1);
        break;
      case "D":
        this.carry = this.d & 1;
        a = this.d = (this.d & 0b10000000) | (this.d >> 1);
        break;
      case "E":
        this.carry = this.e & 1;
        a = this.e = (this.e & 0b10000000) | (this.e >> 1);
        break;
      case "H":
        this.carry = this.h & 1;
        a = this.h = (this.h & 0b10000000) | (this.h >> 1);
        break;
      case "L":
        this.carry = this.l & 1;
        a = this.l = (this.l & 0b10000000) | (this.l >> 1);
        break;
      default:
        throw "sra_r";
    }
    this.zero = isZero(a);
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 8;
  }

  sra_m_hl() {
    this.log(`SRA (HL:${toHex(this.hl)})`);
    this.carry = this.m.read(this.hl) & 1;
    this.m.write(
      this.hl,
      (this.m.read(this.hl) & 0b10000000) | (this.m.read(this.hl) >> 1),
    );
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 16;
  }

  srl_r(r: Operand) {
    this.log(`SRL ${r}`);
    let a = 0;
    switch (r) {
      case "A":
        this.carry = this.a & 1;
        a = this.a = (this.a >> 1);
        break;
      case "B":
        this.carry = this.b & 1;
        a = this.b = (this.b >> 1);
        break;
      case "C":
        this.carry = this.c & 1;
        a = this.c = (this.c >> 1);
        break;
      case "D":
        this.carry = this.d & 1;
        a = this.d = (this.d >> 1);
        break;
      case "E":
        this.carry = this.e & 1;
        a = this.e = (this.e >> 1);
        break;
      case "H":
        this.carry = this.h & 1;
        a = this.h = (this.h >> 1);
        break;
      case "L":
        this.carry = this.l & 1;
        a = this.l = (this.l >> 1);
        break;
      default:
        throw "srl_r";
    }
    this.zero = isZero(a);
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 8;
  }

  srl_m_hl() {
    this.log(`SRL (HL:${toHex(this.hl)})`);
    this.carry = this.m.read(this.hl) & 1;
    this.m.write(this.hl, this.m.read(this.hl) >> 1);
    this.zero = isZero(this.m.read(this.hl));
    this.negative = 0;
    this.half = 0;
    this.pc += 2;
    this.clock = 16;
  }

  bit_b_r(u: U8, r: Operand) {
    this.log(`BIT ${u} ${r}`);
    let a = 0;
    switch (r) {
      case "A":
        a = this.a >> u & 1;
        break;
      case "B":
        a = this.b >> u & 1;
        break;
      case "C":
        a = this.c >> u & 1;
        break;
      case "D":
        a = this.d >> u & 1;
        break;
      case "E":
        a = this.e >> u & 1;
        break;
      case "H":
        a = this.h >> u & 1;
        break;
      case "L":
        a = this.l >> u & 1;
        break;
      default:
        throw "bit_b_r";
    }
    this.zero = isZero(a);
    this.negative = 0;
    this.half = 1;
    this.pc += 2;
    this.clock = 8;
  }

  bit_b_m_hl(u: U8) {
    this.log(`BIT ${u} (HL:${toHex(this.hl)})`);
    this.zero = isZero(this.m.read(this.hl) >> u & 1);
    this.negative = 0;
    this.half = 1;
    this.pc += 2;
    this.clock = 16;
  }

  set_b_r(u: U8, r: Operand) {
    this.log(`SET ${u} ${r}`);
    switch (r) {
      case "A":
        this.a |= (1 << u);
        break;
      case "B":
        this.b |= (1 << u);
        break;
      case "C":
        this.c |= (1 << u);
        break;
      case "D":
        this.d |= (1 << u);
        break;
      case "E":
        this.e |= (1 << u);
        break;
      case "H":
        this.h |= (1 << u);
        break;
      case "L":
        this.l |= (1 << u);
        break;
      default:
        throw "set_b_r";
    }
    this.pc += 2;
    this.clock = 8;
  }

  set_b_m_hl(u: U8) {
    this.log(`SET ${u} (HL:${toHex(this.hl)})`);
    this.m.write(this.hl, this.m.read(this.hl) | (1 << u));
    this.pc += 2;
    this.clock = 16;
  }

  res_b_r(u: U8, r: Operand) {
    this.log(`RES ${r} ${toHex(u)}`);
    switch (r) {
      case "A":
        this.a &= ~(1 << u);
        break;
      case "B":
        this.b &= ~(1 << u);
        break;
      case "C":
        this.c &= ~(1 << u);
        break;
      case "D":
        this.d &= ~(1 << u);
        break;
      case "E":
        this.e &= ~(1 << u);
        break;
      case "H":
        this.h &= ~(1 << u);
        break;
      case "L":
        this.l &= ~(1 << u);
        break;
      default:
        throw "res_b_r";
    }
    this.pc += 2;
    this.clock = 8;
  }

  res_b_m_hl(u: U8) {
    this.log(`RES ${toHex(u)} (HL:${toHex(this.hl)})`);
    this.m.write(this.hl, this.m.read(this.hl) & ~(1 << u));
    this.pc += 2;
    this.clock = 16;
  }

  jp_i16(r: Operand, u: U16) {
    this.log(`JP ${r} ${toHex(u)}`);
    this.pc = u;
    this.clock = 12;
  }

  jp_f_i16(r: Operand, u: U16) {
    switch (r) {
      case "NZ":
        if (this.zero == 0) return this.jp_i16(r, u);
        break;
      case "Z":
        if (this.zero == 1) return this.jp_i16(r, u);
        break;
      case "NC":
        if (this.carry == 0) return this.jp_i16(r, u);
        break;
      case "C":
        if (this.carry == 1) return this.jp_i16(r, u);
        break;
      default:
        throw "jp_f_i16";
    }

    this.log(`JP ${r} ${toHex(u)} -> no jump`);
    this.pc += 3;
    this.clock = 12;
  }

  jp_hl() {
    this.log(`JP HL:${toHex(this.hl)}`);
    this.pc = this.hl;
    this.clock = 4;
  }

  jr_i8(r: Operand, u: U8) {
    // u: signed binary
    let o = (u & 0b1111111);
    let a = 0;
    let s = "";
    if ((u >> 7 & 1) == 1) {
      a = (this.pc + 2) - (128 - o);
      s = "-" + toHex(128 - o);
    } else {
      a = (this.pc + 2) + o;
      s = "+" + toHex(o);
    }
    this.log(`JR ${r} ${s} -> ${toHex(a)}`);
    this.pc = a;
    this.clock = 8;
  }

  jr_f_i8(r: Operand, u: U8) {
    switch (r) {
      case "NZ":
        if (this.zero == 0) return this.jr_i8(r, u);
        break;
      case "Z":
        if (this.zero == 1) return this.jr_i8(r, u);
        break;
      case "NC":
        if (this.carry == 0) return this.jr_i8(r, u);
        break;
      case "C":
        if (this.carry == 1) return this.jr_i8(r, u);
        break;
      default:
        throw "jr_f_i8";
    }

    let o = (u & 0b1111111);
    let s = "";
    if ((u >> 7 & 1) == 1) {
      s = "-" + toHex(128 - o);
    } else {
      s = "+" + toHex(o);
    }

    this.log(`JR ${r} ${s} -> no jump`);
    this.pc += 2;
    this.clock = 8;
  }

  call_i16(r: Operand, u: U16) {
    this.log(`CALL ${r} ${toHex(u)}`);
    const pc = this.pc + 3;
    this.m.write(this.sp - 2, pc & 0xff);
    this.m.write(this.sp - 1, (pc >> 8) & 0xff);
    this.sp = this._sub_u16(this.sp, 2);
    this.pc = u;
    this.clock = 12;
  }

  call_f_i16(r: Operand, u: U16) {
    switch (r) {
      case "NZ":
        if (this.zero == 0) return this.call_i16(r, u);
        break;
      case "Z":
        if (this.zero == 1) return this.call_i16(r, u);
        break;
      case "NC":
        if (this.carry == 0) return this.call_i16(r, u);
        break;
      case "C":
        if (this.carry == 1) return this.call_i16(r, u);
        break;
      default:
        throw "call_f_i16";
    }
    this.log(`CALL ${r} ${toHex(u)} -> no call`);
    this.pc += 3;
    this.clock = 12;
  }

  rst_n(u: U16) {
    this.log(`RST ${toHex(u)}`);
    this.pc += 1;
    this.m.write(this.sp - 2, this.pc & 0xff);
    this.m.write(this.sp - 1, (this.pc >> 8) & 0xff);
    this.sp = this._sub_u16(this.sp, 2);
    this.pc = u;
    this.clock = 32;
  }

  ret(r: Operand) {
    const u = toU16(this.m.read(this.sp + 1), this.m.read(this.sp));
    this.log(`RET ${r} ${toHex(u)}`);
    this.pc = u;
    this.sp = this._add_u16(this.sp, 2);
    //this.sp += 2;
    this.clock = 8;
  }

  ret_f(r: Operand) {
    switch (r) {
      case "NZ":
        if (this.zero == 0) return this.ret(r);
        break;
      case "Z":
        if (this.zero == 1) return this.ret(r);
        break;
      case "NC":
        if (this.carry == 0) return this.ret(r);
        break;
      case "C":
        if (this.carry == 1) return this.ret(r);
        break;
      default:
        throw "ret_f";
    }

    this.log(`RET ${r} -> no return`);
    this.pc += 1;
    this.clock = 8;
  }

  reti() {
    const u = toU16(this.m.read(this.sp + 1), this.m.read(this.sp));
    this.log(`RETI ${toHex(u)}`);
    this.pc = u;
    this.sp += 2;
    this.ime = 1;
    this.clock = 8;
  }
}
