import { Reg, showI8, toBin, toHex, toI8 } from "./utils.ts";
import MBC, { MBC1, MBC3 } from "./mbc.ts";
import Cartridge from "./cartridge.ts";
import CPU, { CPULog } from "./cpu.ts";
import PPU from "./ppu.ts";
import Controller from "./controller.ts";

import { readLines } from "https://deno.land/std@0.83.0/io/mod.ts";
import {
  bgRgb24,
  rgb24,
  yellow,
} from "https://deno.land/std@0.83.0/fmt/colors.ts";
import { sleep } from "https://deno.land/x/sleep/mod.ts";

const h = (a: number): string => toHex(a);
const b = (a: number): string => toBin(a);
const s8 = (a: number): string => showI8(a);
const i8 = (a: number): number => toI8(a);

export default class Debug {
  cartridge: Cartridge;
  mbc: MBC;
  cpu: CPU;
  ppu: PPU;
  con: Controller;

  constructor(rom: Uint8Array) {
    this.cartridge = new Cartridge(rom);
    this.mbc = new MBC1(this.cartridge);
    this.con = new Controller(this.mbc);
    this.ppu = new PPU(this.mbc);
    this.cpu = new CPU(this.mbc);
    this.cpu.pc = 0x100; // cartridge entry point

    let td = new TextDecoder();
    console.log(
      `${this.cartridge.new_licensee_code_name} ${
        td.decode(this.cartridge.title)
      }`,
    );

    this.execute("1");
  }

  async main() {
    for await (let line of readLines(Deno.stdin)) {
      this.dispatch(line);
    }
  }

  async dispatch(line: string) {
    try {
      let cmds = line.trim().split(" ");
      const cmd = cmds.shift();
      const param = cmds.join(" ");
      switch (cmd) {
        case "ramx":
          this.ramx(param);
          break;
        case "ram":
          this.ram(param);
          break;
        case "mem":
          this.mem(param);
          break;
        case "reg":
          this.reg(param);
          break;
        case "serial":
          this.serial(param);
          break;
        case "oam":
          this.oam(param);
          break;
        case "d":
        case "display":
          this.display(param);
          break;
        case "dd":
        case "dump":
          this.dump(param);
          break;
        case "s":
        case "show":
          await this.show(param);
          break;
        case "ppu":
          this.ppuDump(param);
          break;
        case "e":
        case "eval":
          this.repl(param);
          break;
        case "until":
          this.until(param);
          break;
        case "go":
          this.go_match(param);
          break;
        case "l":
        case "log":
          this.log(param);
          break;
        case "ls":
        case "logs":
          this.log_search(param);
          break;
        case "c":
        case "control":
          this.control(param);
          break;
        case "w":
        case "watch":
          this.watch_mem(param);
          break;
        default:
          this.execute(cmd as string);
          break;
      }
    } catch (e) {
      this.dump("");
      this.log("100");
      this.ram("");
      this.reg("");
      this.check("");
      console.log("ERROR:", e);
    }
  }

  cpuLog(i: number): string {
    const log: CPULog = this.cpu._log[i];
    if (log == undefined) {
      return "CPU LOG UNDEFINED";
    }
    let t = `--- ${yellow(log._execute_counter.toString())}\n`;
    t += `Bank:${toHex(log.bank)}\n`;
    t += `PC:${toHex(log.pc, 1)} `;
    for (let i = -4; i <= 18; i++) {
      let h = this.mbc.readWithBank(log.bank, log.pc + i);
      t += h == undefined
        ? "??"
        : i == 0
        ? `|${toHex(h).slice(1)}|`
        : toHex(h).slice(1);
      t += " ";
    }

    t += `\nSP:${toHex(log.sp)} `;
    for (let i = -4; i <= 18; i++) {
      let h = this.mbc.ram[log.sp + i];
      t += h == undefined
        ? "??"
        : i == 0
        ? `|${toHex(h).slice(1)}|`
        : toHex(h).slice(1);
      t += " ";
    }
    t += "\n";
    t += `A:${toHex(log.a)} F:${toHex(log.f)} `;
    t += `B:${toHex(log.b)} C:${toHex(log.c)} `;
    t += `D:${toHex(log.d)} E:${toHex(log.e)} `;
    t += `H:${toHex(log.h)} L:${toHex(log.l)}\n`;
    t += `Z:${log.zero} N:${log.negative} `;
    t += `H:${log.half} C:${log.carry}\n`;
    t += log.code;
    //t += "\n";
    return t;
  }

  printCPULog(i?: number) {
    i = i == undefined ? (this.cpu._log.length - 1) : i;
    console.log(this.cpuLog(i));
  }

  coloring(c: number): string {
    switch (c) {
      case 0:
        return bgRgb24(" ", 0x000000);
      case 1:
        return bgRgb24(" ", 0x555555);
      case 2:
        return bgRgb24(" ", 0xaaaaaa);
      case 3:
        return bgRgb24(" ", 0xffffff);
      default:
        return bgRgb24(" ", 0x008800);
    }
  }

  execute(param: string) {
    let i = parseInt(param);
    i = Number.isNaN(i) ? 1 : i;
    while (0 < i--) {
      this.cpu.execute();
      this.ppu.execute(this.cpu.clock);
    }
    this.printCPULog();
  }

  execute_one_frame(param: string) {
    let i = parseInt(param);
    i = Number.isNaN(i) ? 1 : i;
    while (0 < i--) {
      this.cpu.execute();
      this.ppu.execute(this.cpu.clock);
      if (this.ppu.cycle == 0) {
      }
    }
    this.printCPULog();
  }

  dump(param: string) {
    for (let y = 0; y < this.ppu.buffer.length; y++) {
      let s = "";
      for (let x = 0; x < this.ppu.buffer[y].length; x++) {
        s += this.coloring(this.ppu.buffer[y][x]);
      }
      console.log(s);
    }
  }

  ramx(param: string) {
    let s = "";
    for (let i = 0; i < this.mbc.ramx.length; i++) {
      if (i % 64 == 0) {
        s += "\n";
        s += toHex(0xa000 + i, 1).slice(1);
        s += ": ";
      }
      let m = this.mbc.ramx[i];
      if (m == undefined) break;
      s += toHex(m).slice(1);
      s += " ";
    }
    console.log(s);
  }

  mem(param: string) {
    let s = "";
    for (let i = 0; i < this.mbc.ram.length; i++) {
      if (i % 64 == 0) {
        s += "\n";
        s += toHex(i, 1).slice(1);
        s += ": ";
      }
      let m = this.mbc.read(i);
      if (m == undefined) break;
      s += toHex(m).slice(1);
      s += " ";
    }
    console.log(s);
  }

  ram(param: string) {
    let s = "";
    for (let i = 0; i < this.mbc.ram.length; i++) {
      if (i % 64 == 0) {
        s += "\n";
        s += toHex(i, 1).slice(1);
        s += ": ";
      }
      let m = this.mbc.ram[i];
      if (m == undefined) break;
      s += toHex(m).slice(1);
      s += " ";
    }
    console.log(s);
  }

  reg(param: string) {
    let t = "";
    t += `MBC Bank:${toHex(this.mbc.bank)}\n`;
    t += `JOYP:0b${toBin(this.mbc.ram[Reg.JOYP])}\n`;
    t += `SB:${toHex(this.mbc.ram[Reg.SB])} `;
    t += `SC:0b${toBin(this.mbc.ram[Reg.SC])}\n`;
    t += `serial_counter:${toHex(this.cpu._serial_counter)}\n`;
    t += `LCD Control:0b${toBin(this.mbc.ram[Reg.LCDC])} `;
    t += `LCD Status:0b${toBin(this.mbc.ram[Reg.STAT])}\n`;
    t += `SCY:${this.mbc.ram[Reg.SCY]} `;
    t += `SCX:${this.mbc.ram[Reg.SCX]} `;
    t += `LY:${this.mbc.ram[Reg.LY]} `;
    t += `LYC:${this.mbc.ram[Reg.LYC]} `;
    t += `WY:${this.mbc.ram[Reg.WY]} `;
    t += `WX:${this.mbc.ram[Reg.WX]}\n`;
    t += `BG Palette:${toHex(this.mbc.ram[Reg.BGP])} `;
    t += `Obj Pallete0:${toHex(this.mbc.ram[Reg.OBP0])} `;
    t += `Obj Pallete1:${toHex(this.mbc.ram[Reg.OBP1])}\n`;
    t += `BCPS:0b${toBin(this.mbc.ram[Reg.BCPS])} `;
    t += `BCPD:0b${toBin(this.mbc.ram[Reg.BCPD])} `;
    t += `OCPS:0b${toBin(this.mbc.ram[Reg.OCPS])}\n`;
    t += `DMA:${toHex(this.mbc.ram[Reg.DMA])}\n`;
    t += `HDMA1:${toHex(this.mbc.ram[Reg.HDMA1])} `;
    t += `HDMA2:${toHex(this.mbc.ram[Reg.HDMA2])} `;
    t += `HDMA3:${toHex(this.mbc.ram[Reg.HDMA3])} `;
    t += `HDMA4:${toHex(this.mbc.ram[Reg.HDMA4])}\n`;
    t += `HDMA5:${(this.mbc.ram[Reg.HDMA5] >> 7) & 1} `;
    t += `HDMA5:${toHex(this.mbc.ram[Reg.HDMA5] & 0x7f)}\n`;
    t += `timer_div_counter:${toHex(this.cpu._timer_div_counter)} `;
    t += `timer_control_counter:${toHex(this.cpu._timer_control_counter)}\n`;
    t += `DIV:${toHex(this.mbc.ram[Reg.DIV])} `;
    t += `TIMA:${toHex(this.mbc.ram[Reg.TIMA])} `;
    t += `TMA:${toHex(this.mbc.ram[Reg.TMA])} `;
    t += `TAC:${toBin(this.mbc.ram[Reg.TAC])} `;
    t += `IF:${toBin(this.mbc.ram[Reg.IF])} `;
    t += `IE:${toBin(this.mbc.ram[Reg.IE])} `;
    t += `IME:${this.cpu.ime}\n`;
    console.log(t);
  }

  serial(param: string) {
    let td = new TextDecoder();
    for (let i = 0; i < this.cpu._serial.length; i++) {
      if (this.cpu._serial[i].length == 0) {
        continue;
      }
      const bs = this.cpu._serial[i].map((s) => s.toString(16)).reduce((a, b) =>
        a + " " + b
      );
      const ss = td.decode(new Uint8Array(this.cpu._serial[i]));
      console.log(bs);
      console.log(ss);
    }
  }

  repl(param: string) {
    try {
      let car = this.cartridge;
      let m = this.mbc;
      let c = this.cpu;
      let p = this.ppu;
      let con = this.con;
      console.log(eval(param));
    } catch (e) {
      console.log(`eval error ${e}`);
    }
  }

  display(param: string) {
    let yy = this.ppu.SCY;
    for (let y = 0; y < 144; y++) {
      let s = "";
      let xx = this.ppu.SCX;
      for (let x = 0; x < 160; x++) {
        s += this.coloring(this.ppu.buffer[yy][xx]);
        if (xx >= 255) {
          xx = 0;
        } else {
          xx += 1;
        }
      }
      if (yy >= 255) {
        yy = 0;
      } else {
        yy += 1;
      }
      console.log(s);
    }
  }

  go_match(param: string) {
    const re = new RegExp(param);
    console.log(re);
    while (true) {
      this.cpu.execute();
      this.ppu.execute(this.cpu.clock);
      if (re.test(this.cpuLog(this.cpu._log.length - 1))) {
        this.printCPULog();
        break;
      }
    }
  }

  log(param: string) {
    let n = parseInt(param);
    n = Number.isNaN(n) ? 0xf : n;
    for (let i = this.cpu._log.length - n; 0 < n--; i++) {
      this.printCPULog(i);
    }
  }

  log_search(param: string) {
    const re = new RegExp(param);
    console.log(re);
    for (let i = 0; i < this.cpu._log.length; i++) {
      let log = this.cpuLog(i);
      if (re.test(log)) {
        console.log(log);
      }
    }
  }

  until(param: string) {
    let c = this.cpu;
    let p = this.ppu;
    let m = this.mbc;
    while (true) {
      this.cpu.execute();
      this.ppu.execute(this.cpu.clock);
      if (eval(param)) {
        break;
      }
    }
    this.printCPULog();
  }

  watch_mem(param: string) {
    let addr = parseInt(param);
    addr = Number.isNaN(addr) ? 0xc000 : addr;
    let a = this.mbc.ram[addr];
    let b = this.mbc.ram[addr];
    while (true) {
      this.cpu.execute();
      this.ppu.execute(this.cpu.clock);
      b = this.mbc.ram[addr];
      if (a != b) {
        break;
      }
    }
    this.printCPULog();
  }

  ppuDump(param: string) {
    let oy = 0;
    let ox = 0;
    let buffer: number[][] = new Array(256);
    for (let i = 0; i <= 256; i++) {
      buffer[i] = new Array(256);
      for (let j = 0; j <= 256; j++) {
        buffer[i][j] = 0;
      }
    }

    let spriteSize = this.ppu.LCDC_SpriteSize;
    let size = 32 * 32 / (spriteSize == 0 ? 1 : 2);
    for (let i = 0; i < size; i++) {
      const sprite = this.ppu.getSprite(
        0x8000,
        i * (spriteSize == 0 ? 1 : 2),
        spriteSize,
      );
      for (let y = 0; y < sprite.length; y++) {
        let yy = oy + y;
        for (let x = 0; x < sprite[y].length; x++) {
          let xx = ox + x;
          buffer[yy][xx] = sprite[y][x];
        }
      }

      ox += 8;

      if (ox % 256 == 0) {
        oy += spriteSize == 0 ? 8 : 16;
        ox = 0;
      }
    }

    let s = "";
    for (let y = 0; y < buffer.length; y++) {
      for (let x = 0; x < buffer[y].length; x++) {
        s += this.coloring(buffer[y][x]);
      }
      s += "\n";
    }
    console.log(s);
  }

  control(param: string) {
    //this.con.releaseAll();
    this.con.toggle(param);
  }

  async show(param: string) {
    const ps = param.split(" ");
    let times = parseInt(ps[0]);
    let clock = parseInt(ps[1]);
    times = Number.isNaN(times) ? 0 : times;
    clock = Number.isNaN(clock) ? 70224 * 15 : clock;
    let t = times;
    let c = clock;
    while (true) {
      //this.check("");
      this.cpu.execute();
      this.ppu.execute(this.cpu.clock);
      if (c-- == 0) {
        this.display("");
        c = clock;
        await sleep(0.5);
        if (t-- == 0) {
          break;
        }
      }
    }
  }

  oam(param: string) {
    for (let i = 0; i < 40; i++) {
      let dma = this.mbc.ram[Reg.DMA];
      console.log(i, h((dma << 8) | 4 * i), this.ppu.getOAM(i));
    }
  }

  check(param: string): boolean {
    let ok = true;
    const f = (a: number): boolean => a != undefined && a >= 0 && a <= 0xff;
    const ff = (a: number): boolean => a != undefined && a >= 0 && a <= 0xffff;
    for (let i = 0; i < this.mbc.ram.length; i++) {
      let v = this.mbc.ram[i];
      if (!f(v)) {
        console.log("CHECK MEM: ADDR:", h(i), "VAL:", h(v), v);
        ok = false;
      }
    }
    if (!f(this.cpu.a)) {
      console.log("CHECK Register: A: ", h(this.cpu.a));
      ok = false;
    }
    if (!f(this.cpu.f)) {
      console.log("CHECK Register: F: ", h(this.cpu.f));
      ok = false;
    }
    if (!f(this.cpu.b)) {
      console.log("CHECK Register: B: ", h(this.cpu.b));
      ok = false;
    }
    if (!f(this.cpu.c)) {
      console.log("CHECK Register: C: ", h(this.cpu.c));
      ok = false;
    }
    if (!f(this.cpu.d)) {
      console.log("CHECK Register: D: ", h(this.cpu.d));
      ok = false;
    }
    if (!f(this.cpu.e)) {
      console.log("CHECK Register: E: ", h(this.cpu.e));
      ok = false;
    }
    if (!f(this.cpu.h)) {
      console.log("CHECK Register: H: ", h(this.cpu.h));
      ok = false;
    }
    if (!f(this.cpu.l)) {
      console.log("CHECK Register: L: ", h(this.cpu.l));
      ok = false;
    }
    if (!f(this.cpu.carry)) {
      console.log("CHECK Flag: Carry: ", h(this.cpu.carry));
      ok = false;
    }
    if (!f(this.cpu.zero)) {
      console.log("CHECK Flag: Zero: ", h(this.cpu.zero));
      ok = false;
    }
    if (!f(this.cpu.negative)) {
      console.log("CHECK Flag: Negative: ", h(this.cpu.negative));
      ok = false;
    }
    if (!f(this.cpu.half)) {
      console.log("CHECK Flag: Half: ", h(this.cpu.half));
      ok = false;
    }
    if (!ff(this.cpu.af)) {
      console.log("CHECK Register: AF: ", h(this.cpu.af));
      ok = false;
    }
    if (!ff(this.cpu.bc)) {
      console.log("CHECK Register: BC: ", h(this.cpu.bc));
      ok = false;
    }
    if (!ff(this.cpu.de)) {
      console.log("CHECK Register: DE: ", h(this.cpu.de));
      ok = false;
    }
    if (!ff(this.cpu.hl)) {
      console.log("CHECK Register: HL: ", h(this.cpu.hl));
      ok = false;
    }
    if (!ff(this.cpu.pc)) {
      console.log("CHECK Register: PC ", h(this.cpu.pc));
      ok = false;
    }
    if (!ff(this.cpu.sp)) {
      console.log("CHECK Register: SP: ", h(this.cpu.sp));
      ok = false;
    }
    return ok;
  }
}
