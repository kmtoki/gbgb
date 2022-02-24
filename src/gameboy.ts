import { Reg, toBin, toHex, U8 } from "./utils.ts";
import MBC, { MBC1, MBC3 } from "./mbc.ts";
import Cartridge from "./cartridge.ts";
import CPU, { CPULog } from "./cpu.ts";
import PPU from "./ppu.ts";
import APU from "./apu.ts";
import Controller from "./controller.ts";

const h = (a: number): string => toHex(a);
const b = (a: number): string => toBin(a);

export default class Gameboy {
  cartridge: Cartridge;
  mbc: MBC;
  cpu: CPU;
  ppu: PPU;
  apu: APU;
  con: Controller;

  constructor(rom: Uint8Array) {
    this.cartridge = new Cartridge(rom);

    switch (this.cartridge.cartridge_type_code) {
      case 0x1:
      case 0x2:
      case 0x3:
        this.mbc = new MBC1(this.cartridge);
        break;
      case 0x11:
      case 0x12:
      case 0x13:
        this.mbc = new MBC3(this.cartridge);
        break;
      default:
        this.mbc = new MBC1(this.cartridge);
        break;
    }

    this.cpu = new CPU(this.mbc);
    this.cpu.pc = 0x100; // cartridge entry point

    this.ppu = new PPU(this.mbc);
    this.apu = new APU(this.mbc);
    this.con = new Controller(this.mbc);

    let td = new TextDecoder();
    console.log(
      `${this.cartridge.new_licensee_code_name} ${
        td.decode(this.cartridge.title)
      }`,
    );

    this.execute("1");
  }

  dispatch(line: string) {
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
      this.log("100");
      this.ram("");
      this.reg("");
      this.check_mem("");
      console.log("ERROR:", e);
    }
  }

  cpuLog(i: number): string {
    const log: CPULog = this.cpu._log[i];
    if (log == undefined) {
      return "CPU LOG UNDEFINED";
    }
    let t = `--- ${log._execute_counter.toString()}\n`;
    t += `Bank:${toHex(log.rom_bank)}\n`;
    t += `PC:${toHex(log.pc, 1)} `;
    for (let i = -4; i <= 18; i++) {
      let h = this.mbc.readWithBank(log.rom_bank, log.pc + i);
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

  execute(param: string) {
    let i = parseInt(param);
    i = Number.isNaN(i) ? 1 : i;
    while (0 < i--) {
      this.cpu.execute();
      this.ppu.execute(this.cpu.clock);
      //this.apu.execute();
      this.con.execute();
    }
    //this.printCPULog();
  }

  execute_one_frame(param: string) {
    while (true) {
      this.cpu.execute();
      this.ppu.execute(this.cpu.clock);
      if (this.ppu.cycle == 0) {
        break;
      }
    }
    this.printCPULog();
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
    t += `MBC ROM Bank:${toHex(this.mbc.rom_bank)}\n`;
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
        console.log(i, "serial empty");
        continue;
      }
      const bs = this.cpu._serial[i].map((s) => s.toString()).reduce((a, b) =>
        a + " " + b
      );
      const ss = td.decode(
        new Uint8Array(this.cpu._serial[i].map((a) => a == 10 ? 32 : a)),
      );
      console.log(i);
      console.log(bs, "\n");
      console.log(ss, "\n");
    }
  }

  repl(param: string) {
    try {
      let car = this.cartridge;
      let mbc = this.mbc;
      let cpu = this.cpu;
      let ppu = this.ppu;
      let con = this.con;
      console.log(eval(param));
    } catch (e) {
      console.log(`eval error ${e}`);
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
    for (let i = this.cpu._log.length - n; 0 <= n--; i++) {
      this.printCPULog(i);
    }
  }

  log_search(param: string) {
    const re = new RegExp(param);
    console.log(re);
    for (let i = 0; i < this.cpu.log.length; i++) {
      let log = this.cpuLog(i);
      if (re.test(log)) {
        console.log(log);
      }
    }
  }

  until(param: string) {
    let cpu = this.cpu;
    let ppu = this.ppu;
    let mbc = this.mbc;
    while (true) {
      this.cpu.execute();
      this.ppu.execute(this.cpu.clock);
      if (eval(param)) {
        break;
      }
    }
    this.printCPULog();
  }

  control(param: string) {
    //this.con.releaseAll();
    this.con.toggle(param);
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

  check_mem(param: string): boolean {
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
    return ok;
  }
}
