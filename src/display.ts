/////// <reference lib="dom" />
import MBC from "./mbc.ts";
import PPU from "./ppu.ts";
import Controller from "./controller.ts";

export default class Display {
  ppu: PPU;
  con: Controller;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(p: PPU, c: Controller) {
    this.ppu = p;
    this.con = c;

    this.canvas = <HTMLCanvasElement> document.getElementById("canvas")!;
    this.canvas.height = document.body.clientHeight;
    this.canvas.width = document.body.clientWidth;

    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.addContorller();
  }

  addContorller() {
    document.addEventListener("keydown", (event) => {
      this.con.press(event.key);
      console.log(event.key);
    });
    document.addEventListener("keyup", (event) => {
      this.con.release(event.key);
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

  render() {
    for (let y = 0; y < this.ppu.buffer.length; y++) {
      for (let x = 0; x < this.ppu.buffer[y].length; x++) {
        this.ctx.fillStyle = this.color(this.ppu.buffer[y][x]);
        this.ctx.fillRect(x, y, 1, 1);
      }
    }

    let scy = this.ppu.SCY;
    for (let y = 0; y < 144; y++) {
      let scx = this.ppu.SCX;
      for (let x = 0; x < 160; x++) {
        this.ctx.fillStyle = this.color(this.ppu.buffer[scy][scx]);
        this.ctx.fillRect(270 + x, 0 + y, 1, 1);

        if (scx == 255) {
          scx = 0;
          scy += 1;
        } else {
          scx += 1;
        }

        if (scy == 255) {
          scy = 0;
        }
      }
    }

    let oy = 0;
    let ox = 0;
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
          this.ctx.fillStyle = this.color(sprite[y][x]);
          this.ctx.fillRect(450 + xx, 0 + yy, 1, 1);
        }
      }

      ox += 8;

      if (ox >= 256) {
        oy += spriteSize == 0 ? 8 : 16;
        ox = 0;
      }
    }
  }
}
