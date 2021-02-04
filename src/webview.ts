import Gameboy from "./gameboy.ts";
import ROM from "./rom.ts";

class WebView {
  gb: Gameboy;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  execute_clock: number;
  execute_timer: number;
  render_timer: number;
  execute_id: number;
  render_id: number;

  constructor(gb: Gameboy) {
    this.gb = gb;

    this.canvas = <HTMLCanvasElement> document.getElementById("canvas")!;
    this.canvas.height = document.body.clientHeight;
    this.canvas.width = document.body.clientWidth;

    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    //this.execute_clock = 300000;
    this.execute_clock = 70394 * 4;
    this.execute_timer = 10;
    //this.render_timer = (1000 / 60) * 1;
    this.render_timer = 100;
    this.execute_id = 0;
    this.render_id = 1;

    this.addContorller();
  }

  addContorller() {
    document.addEventListener("keydown", (event) => {
      //this.gb.con.releaseAll();
      if (!event.repeat) {
        this.gb.con.press(event.key);
      }
    });
    document.addEventListener("keyup", (event) => {
      if (!event.repeat) {
        this.gb.con.release(event.key);
      }
    });
  }

  color(c: number): string {
    return c == 0
      ? "rgb(0,0,0)"
      : c == 1
      ? "rgb(85,85,85)"
      : c == 2
      ? "rgb(170,170,170)"
      : c == 3
      ? "rgb(255,255,255)"
      : "rgb(255,0,0)";
  }

  draw() {
    // PPU Buffer
    this.ctx.strokeStyle = "#55aa55";
    this.ctx.strokeRect(10, 10, 256, 256);
    for (let y = 0; y < this.gb.ppu.buffer.length; y++) {
      for (let x = 0; x < this.gb.ppu.buffer[y].length; x++) {
        this.ctx.fillStyle = this.color(this.gb.ppu.buffer[y][x]);
        this.ctx.fillRect(10 + x, 10 + y, 1, 1);
      }
    }

    // Display/Scroll
    this.ctx.strokeStyle = "#55aa55";
    this.ctx.strokeRect(270, 10, 161, 145);
    let scy = this.gb.ppu.SCY;
    for (let y = 0; y < 144; y++) {
      let scx = this.gb.ppu.SCX;
      for (let x = 0; x < 160; x++) {
        this.ctx.fillStyle = this.color(this.gb.ppu.buffer[scy][scx]);
        this.ctx.fillRect(270 + x, 10 + y, 1, 1);

        if (scx >= 255) {
          scx = 0;
          scy += 1;
        } else {
          scx += 1;
        }

        if (scy >= 255) {
          scy = 0;
        }
      }
      if (this.gb.ppu.SCX < scx) {
        scy += 1;
      }
    }

    // VRAM Dump
    this.ctx.strokeStyle = "#55aa55";
    this.ctx.strokeRect(435, 10, 256, 256);
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
          this.ctx.fillStyle = this.color(sprite[y][x]);
          this.ctx.fillRect(435 + xx, 10 + yy, 1, 1);
        }
      }

      ox += 8;

      if (ox >= 256) {
        oy += spriteSize == 0 ? 8 : 16;
        ox = 0;
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
