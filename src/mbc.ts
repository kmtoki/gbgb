import Cartridge from "./cartridge.ts";
import { Reg, U16, U8, toBin, toHex } from "./utils.ts";

export default interface MBC {
  cartridge: Cartridge;
  ram: number[];
  ramx: number[];
  rom_bank: number;

  readWithBank(b: number, i: U16): U8;
  read(i: U16): U8;
  write(i: U16, v: U8): void;
}

export class MBC1 implements MBC {
  cartridge: Cartridge;
  ram: number[];
  ramx: number[];
  rom_bank: number;
  bank1: number;
  bank2: number;
  ramx_enable: boolean;

  constructor(c: Cartridge) {
    this.cartridge = c;
    this.bank1 = 1;
    this.bank2 = 0;
    this.rom_bank = (this.bank2 << 19) | (this.bank1 << 14);
    this.ram = new Array(0x10000);
    for (let i = 0; i < this.ram.length; i++) {
      this.ram[i] = 0;
    }
    this.ramx = new Array(c.ram_size);
    for (let i = 0; i < this.ramx.length; i++) {
      this.ramx[i] = 0;
    }
    this.ramx_enable = false;
  }

  // for debug
  readWithBank(b: number, i: U16): U8 {
    if (i >= 0 && i <= 0x3fff) {
      //let ii = (this.bank2 & 0b11) == 0 ? i : ((this.bank2 << 19) | i);
      return this.cartridge.rom[i];
    } else if (i >= 0x4000 && i <= 0x7fff) {
      return this.cartridge.rom[b | (i - 0x4000)];
    } else if (i >= 0xa000 && i <= 0xbfff) {
      let b = this.ram[0];
      if ((b & 0b11) == 0) {
        return this.ram[i];
      } else {
        //let ii = ((b & 0b11) == 1) ? (i - 0xa000) : ((b & 0b11) << 13) | (i - 0xa000);
        let ii = i - 0xa000;
        return this.ramx[ii];
      }
    } else {
      return this.ram[i];
    }
  }

  read(i: U16): U8 {
    if (i >= 0 && i <= 0x3fff) {
      //let b2 = this.ram[0x4000];
      //let ii = (b2 & 0b11) == 0 ? i : ((b2 << 19) | i);
      let ii = (this.bank2 & 0b11) == 0 ? i : ((this.bank2 << 19) | i);
      return this.cartridge.rom[ii];
    } else if (i >= 0x4000 && i <= 0x7fff) {
      //let b1 = this.ram[0x2100];
      //let b2 = this.ram[0x4000];
      //b1 = b1 == 0 ? 1 : (b1 & 0b11111);
      //let ii = (b2 << 19) | (b1 << 14) | (i - 0x4000);
      //return this.cartridge.rom[ii];
      return this.cartridge.rom[this.rom_bank | (i - 0x4000)];
    } else if (i >= 0xa000 && i <= 0xbfff) {
      //let b = this.ram[0];
      //if ((b & 0b11) == 0) {
      //  return this.ram[i];
      //} else {
      //  //let ii = ((b & 0b11) == 1) ? (i - 0xa000) : ((b & 0b11) << 13) | (i - 0xa000);
      //  let ii = i - 0xa000;
      //  return this.ramx[ii];
      //}
      if (this.ramx_enable) {
        let ii = i - 0xa000;
        return this.ramx[ii];
      } else {
        return this.ram[i];
      }
    } else {
      return this.ram[i];
    }
  }

  write(i: U16, v: U8) {
    //if (i == 0xc008) { // link y pos
    //  console.log("0xc008", toHex(this.ram[i]), v, "", this.ram[Reg.LY], this.ram[Reg.LYC]);
    //}

    if (i >= 0x0000 && i <= 0x1fff) {
      this.ram[i] = v;
      this.ramx_enable = v == 0x0a;
    } else if (i >= 0x2000 && i <= 0x3fff) {
      this.ram[i] = v == 0 ? 1 : v & 0b11111;
      this.bank1 = this.ram[i];
      this.rom_bank = (this.bank2 << 19) | (this.bank1 << 14);
    } else if (i >= 0x4000 && i <= 0x5fff) {
      this.ram[i] = v;
      this.bank2 = v;
      this.rom_bank = (this.bank2 << 19) | (this.bank1 << 14);
    } else if (i >= 0xa000 && i <= 0xbfff) {
      if (this.ramx_enable) {
        let ii = i - 0xa000;
        this.ramx[ii] = v;
      } else {
        this.ram[i] = v;
      }
    } else if (i >= 0xc000 && i <= 0xddff) {
      this.ram[i] = v;
      this.ram[i + 0x2000] = v;
    } else if (i == Reg.DIV) {
      this.ram[i] = 0;
    } else {
      this.ram[i] = v;
    }
  }
}

export class MBC3 implements MBC {
  cartridge: Cartridge;
  ram: number[];
  ramx: number[];
  rom_bank: number;
  ram_bank: number;
  rtc_read: boolean;
  rtc_type: number;

  constructor(c: Cartridge) {
    this.cartridge = c;
    this.rom_bank = 1;
    this.ram_bank = 0;
    this.rtc_read = false;
    this.rtc_type = 0x8;
    this.ram = new Array(0x10000);
    for (let i = 0; i < this.ram.length; i++) {
      this.ram[i] = 0;
    }
    this.ramx = new Array(c.ram_size);
    for (let i = 0; i < this.ramx.length; i++) {
      this.ramx[i] = 0;
    }
  }

  readWithBank(b: number, i: U16): U8 {
    if (i <= 0x3fff) {
      return this.cartridge.rom[i];
    } else if (i >= 0x4000 && i <= 0x7fff) {
      let ii = this.rom_bank | (i - 0x4000);
      return this.cartridge.rom[ii];
    } else if (i >= 0xa000 && i <= 0xbfff) {
      let ii = 0xc000 * this.ram_bank + (i - 0xa000);
      return this.ramx[ii];
    } else {
      return this.ram[i];
    }
  }

  read(i: U16): U8 {
    if (i <= 0x3fff) {
      return this.cartridge.rom[i];
    } else if (i >= 0x4000 && i <= 0x7fff) {
      let ii = this.rom_bank | (i - 0x4000);
      return this.cartridge.rom[ii];
    } else if (i >= 0xa000 && i <= 0xbfff) {
      if (this.rtc_read) {
         this.rtc_read = false;
         switch (this.rtc_type) {
           case 0x8: return 1;
           case 0x9: return 2;
           case 0xa: return 3;
           case 0xb: return 4;
           case 0xc: return 5;
           default: return 6;
         }
      } else {
        let ii = 0xc000 * this.ram_bank + (i - 0xa000);
        return this.ramx[ii];
      }
    } else {
      return this.ram[i];
    }
  }

  write(i: U16, v: U8) {
    if (i >= 0x0000 && i <= 0x1fff) {
      this.ram[i] = v;
    } else if (i >= 0x2000 && i <= 0x3fff) {
      this.ram[i] = v == 0 ? 1 : v;
      this.rom_bank = this.ram[i] << 14;
    } else if (i >= 0x4000 && i <= 0x5fff) {
      // RAM bank
      if (v >= 0 && v <= 3) {
        this.ram_bank = v;
      } else if (v >= 0x8 && v <= 0xc) {
        this.rtc_read = true;
        this.rtc_type = v;
      }
      this.ram[i] = v;
    } else if (i >= 0xa000 && i <= 0xbfff) {
      let b = this.ram[i - 0x6000] & 3;
      b = b == 0 ? 1 : b;
      let ii = 0xc000 * b + (i - 0xa000);
      this.ramx[i] = v;
    } else {
      this.ram[i] = v;
    }
  }
}
