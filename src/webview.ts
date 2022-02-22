import Gameboy from "./gameboy.ts";
import ROM from "./rom2.ts";
import { Reg, toBin } from "./utils.ts";

class WebView {
  gb: Gameboy;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  execute_clock: number;
  execute_timer: number;
  execute_timer_acc: number;
  render_timer: number;
  execute_id: number;
  render_id: number;
  buffer: number[][];

  constructor(gb: Gameboy) {
    this.gb = gb;

    this.canvas = <HTMLCanvasElement> document.getElementById("canvas")!;
    this.canvas.height = document.body.clientHeight*0.98;
    this.canvas.width = document.body.clientWidth*0.99;

    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.execute_clock = 4194304 / (60 * 4); 
    this.execute_timer = 1000 / 60;
    this.execute_timer_acc = 1;
    this.render_timer = 1000 / 60;
    //this.render_timer = 100;
    this.execute_id = 0;
    this.render_id = 1;

    this.buffer = new Array(1024);
    for (let i = 0; i < this.buffer.length; i++) {
      this.buffer[i] = new Array(1024);
      for (let j = 0; j < this.buffer[i].length; j++) {
        this.buffer[i][j] = 3;
      }
    }

    this.addContorller();
  }

  addContorller() {
    //setInterval(() => this.gb.con.releaseAll(),10);
    document.addEventListener("keydown", (event) => {
      //this.gb.con.releaseAll();
      //if (!event.repeat) {
      //  this.gb.con.press(event.key);
      //}
      //
      if (event.key == "1" && !event.repeat) {
        this.execute_timer_acc *= 2;
        this.execute(this.execute_timer / this.execute_timer_acc, this.execute_clock);
      }
      else if (event.key == "2" && !event.repeat) {
        this.execute_timer_acc /= 2;
        this.execute(this.execute_timer / this.execute_timer_acc, this.execute_clock);
      }
      else {
      }

      //if (!event.repeat) {
      this.gb.con.press(event.key);
      //}
      //console.log("IF: ",toBin(this.gb.mbc.ram[Reg.IF]));
      //console.log("IE: ",toBin(this.gb.mbc.ram[Reg.IE]));
      //console.log("JOYP: ",toBin(this.gb.mbc.ram[Reg.JOYP]));
      //console.log("TIMER",toBin(this.gb.mbc.ram[Reg.TAC]),toBin(this.gb.mbc.ram[Reg.TIMA]));
    });
    document.addEventListener("keyup", (event) => {
      //if (!event.repeat) {
      this.gb.con.release(event.key);
      //}
    });
  }

  color(c: number): string {
    return c == 3
      ? "rgb(0,0,0)"
      : c == 2
      ? "rgb(85,85,85)"
      : c == 1
      ? "rgb(170,170,170)"
      : c == 0
      ? "rgb(255,255,255)"
      : "rgb(255,0,0)";
  }

  draw() {
    let strokeStyle = "#559955";
    let py = 10;
    let px = 10;

   // PPU Background Buffer
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.strokeRect(
      px-2, py-2, this.gb.ppu.bg_buffer[0].length + 2, this.gb.ppu.bg_buffer.length + 2);
    for (let y = 0; y < this.gb.ppu.bg_buffer.length; y++) {
      for (let x = 0; x < this.gb.ppu.bg_buffer[y].length; x++) {
        let bx = x + px;
        let by = y + py;
        if (this.buffer[by][bx] != this.gb.ppu.bg_buffer[y][x]) {
          this.buffer[by][bx] = this.gb.ppu.bg_buffer[y][x];
          this.ctx.fillStyle = this.color(this.gb.ppu.bg_buffer[y][x]);
          this.ctx.fillRect(bx,by,1,1);
        }
      }
    }

    px += this.gb.ppu.bg_buffer[0].length + 10;

    // PPU Window Buffer
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.strokeRect(
      px-2, py-2, this.gb.ppu.win_buffer[0].length + 2, this.gb.ppu.win_buffer.length + 2);
    for (let y = 0; y < this.gb.ppu.win_buffer.length; y++) {
      for (let x = 0; x < this.gb.ppu.win_buffer[y].length; x++) {
        let bx = x + px;
        let by = y + py;
        if (this.buffer[by][bx] != this.gb.ppu.win_buffer[y][x]) {
          this.buffer[by][bx] = this.gb.ppu.win_buffer[y][x];
          this.ctx.fillStyle = this.color(this.gb.ppu.win_buffer[y][x]);
          this.ctx.fillRect(bx,by,1,1);
        }
      }
    }

    px += this.gb.ppu.win_buffer[0].length + 10;

    // PPU Sprite Buffer
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.strokeRect(
      px-2, py-2, this.gb.ppu.sp_buffer[0].length + 2, this.gb.ppu.sp_buffer.length + 2);
    for (let y = 0; y < this.gb.ppu.win_buffer.length; y++) {
      for (let x = 0; x < this.gb.ppu.win_buffer[y].length; x++) {
        let bx = x + px;
        let by = y + py;
        if (this.buffer[by][bx] != this.gb.ppu.sp_buffer[y][x]) {
          this.buffer[by][bx] = this.gb.ppu.sp_buffer[y][x];
          this.ctx.fillStyle = this.color(this.gb.ppu.sp_buffer[y][x]);
          this.ctx.fillRect(bx,by,1,1);
        }
      }
    }

    py += this.gb.ppu.sp_buffer.length + 10;
    px = 10;

    // VRAM Dump
    let oy = 0;
    let ox = 0;
    let spriteSize = this.gb.ppu.LCDC_SpriteSize;
    let size = 32 * 32 / (spriteSize == 0 ? 1 : 2);
    for (let i = 0; i < size; i++) {
      const sprite = this.gb.ppu.getSprite(
        0x8000,
        i * (spriteSize == 0 ? 1 : 2),
        spriteSize,
      );
      for (let y = 0; y < sprite.length; y++) {
        let yy = oy + y;
        for (let x = 0; x < sprite[y].length; x++) {
          let xx = ox + x;
          let bx = xx + px;
          let by = yy + py;
          if (this.buffer[by][bx] != sprite[y][x]) {
            this.buffer[by][bx] = sprite[y][x];
            this.ctx.fillStyle = this.color(sprite[y][x]);
            this.ctx.fillRect(bx,by,1,1);
          }

        }
      }

      ox += 8;

      if (ox >= 256) {
        oy += spriteSize == 0 ? 8 : 16;
        ox = 0;
      }
    }
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.strokeRect(px-2, py-2, 258, oy + 2);

    px += 256 + 10;

    // PPU Buffer
    this.ctx.strokeStyle = strokeStyle;
    this.ctx.strokeRect(px-2, py-2, this.gb.ppu.buffer[0].length + 2, this.gb.ppu.buffer.length + 2);
    for (let y = 0; y < this.gb.ppu.buffer.length; y++) {
      for (let x = 0; x < this.gb.ppu.buffer[y].length; x++) {
        let bx = x + px;
        let by = y + py;
        if (this.buffer[by][bx] != this.gb.ppu.buffer[y][x]) {
          this.buffer[by][bx] = this.gb.ppu.buffer[y][x];
          this.ctx.fillStyle = this.color(this.gb.ppu.buffer[y][x]);
          this.ctx.fillRect(bx,by,1,1);
        }
      }
    }
  }

  execute(t?: number, c?: number) {
    t = t == undefined ? this.execute_timer : t;
    c = c == undefined ? this.execute_clock : c;
    if (this.execute_id != 0) {
      clearInterval(this.execute_id);
    }
    this.execute_id = setInterval(() => this.gb.execute(c!.toString()), t);
  }

  render(t?: number) {
    t = t == undefined ? this.render_timer : t;
    if (this.render_id != 1) {
      clearInterval(this.render_id);
    }
    this.render_id = setInterval(() => this.draw(), t);
  }

  main(t?: number, c?: number) {
    this.execute(t, c);
    this.render(t);
  }

  stop() {
    clearInterval(this.execute_id);
    clearInterval(this.render_id);
  }
}

let bg = new Gameboy(ROM);
let w = new WebView(bg);
w.main();
