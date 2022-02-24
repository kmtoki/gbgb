import MBC from "./mbc.ts";
import { Reg, toHex, toI8, U16, U8 } from "./utils.ts";

export default class PPU {
  m: MBC;
  buffer: number[][];
  bg_buffer: number[][];
  win_buffer: number[][];
  sp_buffer: number[][];
  cycle: number;
  cycle_line: number;

  constructor(m: MBC) {
    this.m = m;
    this.buffer = new Array(256);
    this.bg_buffer = new Array(256);
    this.win_buffer = new Array(256);
    this.sp_buffer = new Array(256);
    for (let i = 0; i < this.bg_buffer.length; i++) {
      this.buffer[i] = new Array(256);
      this.bg_buffer[i] = new Array(256);
      this.win_buffer[i] = new Array(256);
      this.sp_buffer[i] = new Array(256);
      for (let j = 0; j < this.bg_buffer[i].length; j++) {
        this.buffer[i][j] = 0;
        this.bg_buffer[i][j] = 0;
        this.win_buffer[i][j] = 0;
        this.sp_buffer[i][j] = 0;
      }
    }
    this.cycle = 0;
    this.cycle_line = 0;
  }

  get IF_VBlank() {
    return this.m.ram[Reg.IF] & 1;
  }

  set IF_VBlank(a: U8) {
    if (a == 0) {
      this.m.ram[Reg.IF] &= ~1;
    } else {
      this.m.ram[Reg.IF] |= 1;
    }
  }

  get IE_VBlank() {
    return this.m.ram[Reg.IE] & 1;
  }

  set IE_VBlank(a: U8) {
    if (a == 0) {
      this.m.ram[Reg.IE] &= ~1;
    } else {
      this.m.ram[Reg.IE] |= 1;
    }
  }

  get IF_LCD() {
    return (this.m.ram[Reg.IF] >> 1) & 1;
  }

  set IF_LCD(a: U8) {
    if (a == 0) {
      this.m.ram[Reg.IF] &= ~0b10;
    } else {
      this.m.ram[Reg.IF] |= 0b10;
    }
  }

  get IE_LCD() {
    return this.m.ram[Reg.IE];
  }

  set IE_LCD(a: U8) {
    if (a == 0) {
      this.m.ram[Reg.IE] &= ~0b10;
    } else {
      this.m.ram[Reg.IE] |= 0b10;
    }
  }

  get LCDC_DisplayEnable() {
    return this.m.ram[Reg.LCDC] >> 7 & 1;
  }
  get LCDC_WindowTileMapDisplaySelect() {
    return this.m.ram[Reg.LCDC] >> 6 & 1;
  }
  get LCDC_WindowDisplayEnable() {
    return this.m.ram[Reg.LCDC] >> 5 & 1;
  }
  get LCDC_BG_WindowTileDataSelect() {
    return this.m.ram[Reg.LCDC] >> 4 & 1;
  }
  get LCDC_BG_TileMapDispalySelect() {
    return this.m.ram[Reg.LCDC] >> 3 & 1;
  }
  get LCDC_SpriteSize() {
    return this.m.ram[Reg.LCDC] >> 2 & 1;
  }
  get LCDC_SpriteDisplayEnable() {
    return this.m.ram[Reg.LCDC] >> 1 & 1;
  }
  get LCDC_WindowDisplayPriority() {
    return this.m.ram[Reg.LCDC] & 1;
  }

  get SCY() {
    return this.m.ram[Reg.SCY];
  }
  set SCY(a: U8) {
    this.m.ram[Reg.SCY] = a;
  }
  get SCX() {
    return this.m.ram[Reg.SCX];
  }
  set SCX(a: U8) {
    this.m.ram[Reg.SCX] = a;
  }

  get LY() {
    return this.m.ram[Reg.LY];
  }
  set LY(a: U8) {
    this.m.ram[Reg.LY] = a;
  }
  get LYC() {
    return this.m.ram[Reg.LYC];
  }
  set LYC(a: U8) {
    this.m.ram[Reg.LYC] = a;
  }

  get WY() {
    return this.m.ram[Reg.WY];
  }
  set WY(a: U8) {
    this.m.ram[Reg.WY] = a;
  }
  get WX() {
    return this.m.ram[Reg.WX];
  }
  set WX(a: U8) {
    this.m.ram[Reg.WX] = a;
  }

  get STAT_LYCInterrupt() {
    return this.m.ram[Reg.STAT] >> 6 & 1;
  }
  set STAT_LYCInterrupt(a: U8) {
    if (a == 0) {
      this.m.ram[Reg.STAT] &= ~(1 << 6);
    } else {
      this.m.ram[Reg.STAT] |= 1 << 6;
    }
  }

  get STAT_OAMInterrupt() {
    return this.m.ram[Reg.STAT] >> 5 & 1;
  }
  set STAT_OAMInterrupt(a: U8) {
    if (a == 0) {
      this.m.ram[Reg.STAT] &= ~(1 << 5);
    } else {
      this.m.ram[Reg.STAT] |= 1 << 5;
    }
  }

  get STAT_VBlankInterrupt() {
    return this.m.ram[Reg.STAT] >> 4 & 1;
  }
  set STAT_VBlankInterrupt(a: U8) {
    if (a == 0) {
      this.m.ram[Reg.STAT] &= ~(1 << 4);
    } else {
      this.m.ram[Reg.STAT] |= 1 << 4;
    }
  }

  get STAT_HBlankInterrupt() {
    return this.m.ram[Reg.STAT] >> 3 & 1;
  }
  set STAT_HBlankInterrupt(a: U8) {
    if (a == 0) {
      this.m.ram[Reg.STAT] &= ~(1 << 3);
    } else {
      this.m.ram[Reg.STAT] |= 1 << 3;
    }
  }

  get STAT_CoincidenceFlag() {
    return this.m.ram[Reg.STAT] >> 2 & 1;
  }
  set STAT_CoincidenceFlag(a: U8) {
    if (a == 0) {
      this.m.ram[Reg.STAT] &= ~(1 << 2);
    } else {
      this.m.ram[Reg.STAT] |= 1 << 2;
    }
  }

  get STAT_ModeFlag() {
    return this.m.ram[Reg.STAT] & 0b11;
  }
  set STAT_ModeFlag(a: U8) {
    this.m.ram[Reg.STAT] >>= 2;
    this.m.ram[Reg.STAT] <<= 2;
    this.m.ram[Reg.STAT] |= a & 0b11;
  }

  get STAT_ModeFlagDuringHBlank() {
    return (this.m.ram[Reg.STAT] & 0b11) == 0 ? 1 : 0;
  }
  set STAT_ModeFlagDuringHBlank(n: number) {
    this.STAT_ModeFlag = n == 1 ? 0 : 0;
  }

  get STAT_ModeFlagDuringVBlank() {
    return (this.m.ram[Reg.STAT] & 0b11) == 1 ? 1 : 0;
  }
  set STAT_ModeFlagDuringVBlank(n: number) {
    this.STAT_ModeFlag = n == 1 ? 1 : 0;
  }

  get STAT_ModeFlagDuringSearchingOAM() {
    return (this.m.ram[Reg.STAT] & 0b11) == 2 ? 1 : 0;
  }
  set STAT_ModeFlagDuringSearchingOAM(n: number) {
    this.STAT_ModeFlag = n == 1 ? 2 : 0;
  }

  get STAT_ModeFlagDuringTransferringData() {
    return (this.m.ram[Reg.STAT] & 0b11) == 3 ? 1 : 0;
  }
  set STAT_ModeFlagDuringTransferringData(n: number) {
    this.STAT_ModeFlag = n == 1 ? 3 : 0;
  }

  get BGP_Color0() {
    return this.m.ram[Reg.BGP] >> 6 & 0b11;
  }
  get BGP_Color1() {
    return this.m.ram[Reg.BGP] >> 4 & 0b11;
  }
  get BGP_Color2() {
    return this.m.ram[Reg.BGP] >> 2 & 0b11;
  }
  get BGP_Color3() {
    return this.m.ram[Reg.BGP] & 0b11;
  }

  logo(ox: number, oy: number) {
    // logo bytes [
    //   CE ED 66 66 CC 0D 00 0B 03 73 00 83 00 0C 00 0D 00 08 11 1F 88 89 00 0E
    //   DC CC 6E E6 DD DD D9 99 BB BB 67 63 6E 0E EC CC DD DC 99 9F BB B9 33 3E
    // ]
    // Hex:
    // C 6 C 0 0 0 0 0 0 1 8 0
    // E 6 C 0 3 0 0 0 0 1 8 0
    // E 6 0 0 7 8 0 0 0 1 8 0
    // D 6 D B 3 3 C D 8 F 9 E
    //
    // D 6 D D B 6 6 E D 9 B 3
    // C E D 9 B 7 E C D 9 B 3
    // C E D 9 B 6 0 C D 9 B 3
    // C 6 D 9 B 3 E C C F 9 E
    // Binary:
    // 1100 0110 1100 0000 0000 0000 0000 0000 0000 0001 1000 0000
    // 1110 0110 1100 0000 0011 0000 0000 0000 0000 0001 1000 0000
    // 1110 0110 0000 0000 0111 1000 0000 0000 0000 0001 1000 0000
    // 1101 0110 1101 1011 0011 0011 1100 1101 1000 1111 1001 1110
    // 1101 0110 1101 1101 1011 0110 0110 1110 1101 1001 1011 0011
    // 1100 1110 1101 1001 1011 0111 1110 1100 1101 1001 1011 0011
    // 1100 1110 1101 1001 1011 0110 0000 1100 1101 1001 1011 0011
    // 1100 0110 1101 1001 1011 0011 1110 1100 1100 1111 1001 1110
    let y = oy;
    let yy = oy;
    let x = ox;
    let xx = ox;
    for (const bs of this.m.cartridge.logo) {
      let b1 = (bs >> 4) & 0b1111;
      for (let i = 0; i < 4; i++) {
        let b = (b1 >> (3 - i)) & 1;
        this.buffer[y][x++] = b;
      }
      y++;
      x = xx;

      let b2 = bs & 0b1111;
      for (let i = 0; i < 4; i++) {
        let b = (b2 >> (3 - i)) & 1;
        this.buffer[y][x++] = b;
      }
      y++;
      x = xx;

      if (y % 4 == 0) {
        xx += 4;
        x = xx;
        y = yy;
      }
      if (x >= (ox + 48)) {
        yy += 4;
        y = yy;
        xx = ox;
        x = ox;
      }
    }
  }

  clearBuffer() {
    for (let y = 0; y < this.buffer.length; y++) {
      for (let x = 0; x < this.buffer.length; x++) {
        this.buffer[y][x] = 0;
        this.bg_buffer[y][x] = 0;
        this.win_buffer[y][x] = 0;
        this.sp_buffer[y][x] = 0;
      }
    }
  }

  getSprite(base: U16, n: U16, is_twice?: number): number[][] {
    let addr = base + n * 16;
    const size = is_twice == 1 ? 2 : 1;
    let sprite: number[][] = [];
    for (let i = 0; i < 16 * size; i += 2) {
      sprite.push([]);
      const b1 = this.m.ram[addr + i];
      const b2 = this.m.ram[addr + i + 1];
      for (let k = 7; k >= 0; k--) {
        const x = b1 >> k & 1;
        const y = b2 >> k & 1;
        const z = y << 1 | x;
        sprite[sprite.length - 1].push(z);
      }
    }
    return sprite;
  }

  transferOAM() {
    let a = this.m.ram[Reg.DMA] << 8;
    for (let i = 0x0; i <= 0x9f; i++) {
      this.m.ram[0xfe00 + i] = this.m.read(a + i);
    }
  }

  getOAM(i: U16): U8[] {
    if (!(i >= 0 && i < 40)) {
      throw `getOAM ${toHex(i)}`;
      return [0, 0, 0, 0];
    }

    let addr = 0xfe00 + (4 * i);
    return [
      this.m.ram[addr], // y
      this.m.ram[addr + 1], // x
      this.m.ram[addr + 2], // sprite id
      this.m.ram[addr + 3], // attribute
    ];
  }

  searchOAM(x: number, y: number): U8[] {
    this.STAT_ModeFlag = 0b10;
    let oam = [0, 0, 0, 0];
    for (let i = 0; i < 40; i++) {
      const _oam = this.getOAM(i);
      if (
        oam[0] <= y && (oam[0] + 8) > y && oam[1] <= x && (oam[1] + 8) > x
      ) {
        oam = _oam;
      }
    }
    return oam;
  }

  renderBackground() {
    let y = 0;
    let x = 0;
    let bg_addr = this.LCDC_BG_TileMapDispalySelect == 0 ? 0x9800 : 0x9c00;
    for (let i = 1; i <= 1024; i++) {
      const sp_addr = this.m.ram[bg_addr++];
      const sprite = this.LCDC_BG_WindowTileDataSelect == 0
        ? this.getSprite(0x9000, toI8(sp_addr))
        : this.getSprite(0x8000, sp_addr);

      for (let yy = 0; yy < 8; yy++) {
        for (let xx = 0; xx < 8; xx++) {
          const yyy = y + yy;
          const xxx = x + xx;
          this.bg_buffer[yyy][xxx] = sprite[yy][xx];
        }
      }

      x += 8;
      if (i % 32 == 0) {
        x = 0;
        y += 8;
      }
    }
  }

  renderWindow() {
    if (this.LCDC_WindowDisplayEnable == 1) {
      let wy = this.WY;
      let wx = this.WX - 6;
      let w_addr = this.LCDC_WindowTileMapDisplaySelect == 0 ? 0x9800 : 0x9c00;
      for (let i = 1; i <= 1024; i++) {
        let sp_addr = this.m.ram[w_addr++];
        const sprite = this.LCDC_BG_WindowTileDataSelect == 0
          ? this.getSprite(0x9000, toI8(sp_addr))
          : this.getSprite(0x8000, sp_addr);

        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            let yy = wy + y;
            let xx = wx + x;
            yy = yy >= 256 ? yy - 256 : yy;
            xx = xx >= 256 ? xx - 256 : xx;
            this.win_buffer[yy][xx] = sprite[y][x];
          }
        }

        wx += 8;
        if (wx >= 256) {
          wx -= 256;
          //wy += 8;
        }
        if (i % 32 == 0) {
          wy += 8;
        }
        if (wy >= 256) {
          wy -= 256;
        }
      }
    }
  }

  renderOAM() {
    if (this.LCDC_SpriteDisplayEnable == 1) {
      for (let i = 0; i < 40; i++) {
        let oam = this.getOAM(i);
        let sprite = this.getSprite(0x8000, oam[2], this.LCDC_SpriteSize);
        if (oam[0] == 0 || oam[0] >= 160) {
          continue;
        }
        if (oam[1] == 0 || oam[1] >= 168) {
          continue;
        }
        if ((oam[3] >> 6 & 1) == 1) { // y flip
          sprite = sprite.reverse();
        }
        if ((oam[3] >> 5 & 1) == 1) { // x flip
          sprite = sprite.map((ss) => ss.reverse());
        }
        if ((oam[3] >> 7 & 1) == 1) { // Obj or BG Priority. 0 = Obj. 1 = BG
          //for (let y = 0; y < sprite.length; y++) {
          //   for (let x = 0; x < sprite[y].length; x++) {
          //     this.buffer[oam[0]+y][oam[1]+x] = 0;
          //   }
          //}
          //continue;
        }
        let oy = oam[0] - 16 < 0 ? oam[0] : oam[0] - 16;
        let ox = oam[1] - 8 < 0 ? oam[1] : oam[1] - 8;
        //oy += this.SCY;
        //ox += this.SCX;
        for (let y = 0; y < sprite.length; y++) {
          for (let x = 0; x < sprite[y].length; x++) {
            if (sprite[y][x] != 0) {
              this.sp_buffer[oy + y & 0xff][ox + x & 0xff] = sprite[y][x];
            }
          }
        }
      }
    }
  }

  renderDisplay() {
    if (this.LCDC_DisplayEnable == 1 && this.LCDC_WindowDisplayPriority == 1) {

      // Background
      for (let y = 0; y < 144; y++) {
        for (let x = 0; x < 160; x++) {
          this.buffer[y][x] = this.bg_buffer[this.SCY+y&0xff][this.SCX+x&0xff];
        }
      }

      // Window
      if (this.LCDC_WindowDisplayEnable == 1) {
        let wy = this.WY;
        let wx = this.WX - 6;
        let w_addr = this.LCDC_WindowTileMapDisplaySelect == 0 ? 0x9800 : 0x9c00;
        for (let i = 1; i <= 1024; i++) {
          let sp_addr = this.m.ram[w_addr++];
          const sprite = this.LCDC_BG_WindowTileDataSelect == 0
            ? this.getSprite(0x9000, toI8(sp_addr))
            : this.getSprite(0x8000, sp_addr);

          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
              let yy = wy + y;
              let xx = wx + x;
              yy = yy >= 256 ? yy - 256 : yy;
              xx = xx >= 256 ? xx - 256 : xx;
              if (yy >= 0 && yy < 144 && xx >= 0 && xx < 160) {
                this.buffer[yy][xx] = sprite[y][x];
              }
            }
          }

          wx += 8;
          if (wx >= 256) {
            wx -= 256;
            //wy += 8;
          }
          if (i % 32 == 0) {
            wy += 8;
          }
          if (wy >= 256) {
            wy -= 256;
            break;
          }
        }
      }
    }

    // Sprite
    if (this.LCDC_SpriteDisplayEnable == 1) {
      for (let i = 0; i < 40; i++) {
        let oam = this.getOAM(i);
        let sprite = this.getSprite(0x8000, oam[2], this.LCDC_SpriteSize);
        if (oam[0] == 0 || oam[0] >= 160) {
          continue;
        }
        if (oam[1] == 0 || oam[1] >= 168) {
          continue;
        }
        if ((oam[3] >> 6 & 1) == 1) { // y flip
          sprite = sprite.reverse();
        }
        if ((oam[3] >> 5 & 1) == 1) { // x flip
          sprite = sprite.map((ss) => ss.reverse());
        }
        if ((oam[3] >> 7 & 1) == 1) { // Obj or BG Priority. 0 = Obj. 1 = BG
          for (let y = 0; y < sprite.length; y++) {
             for (let x = 0; x < sprite[y].length; x++) {
               this.buffer[oam[0]+y][oam[1]+x] = 0;
             }
          }
          continue;
        }
        let oy = oam[0] - 16 < 0 ? oam[0] : oam[0] - 16;
        let ox = oam[1] - 8 < 0 ? oam[1] : oam[1] - 8;
        for (let y = 0; y < sprite.length; y++) {
          for (let x = 0; x < sprite[y].length; x++) {
            if (sprite[y][x] != 0) {
              this.buffer[oy + y][ox + x] = sprite[y][x];
            }
          }
        }
      }
    }
  }

  render() {
    this.transferOAM();
    this.clearBuffer();
    this.renderBackground();
    this.renderDisplay();

    // debug
    //this.renderWindow();
    //this.renderOAM();    
  }

  compareLY() {
    if (this.LY == this.LYC) {
      if (this.STAT_LYCInterrupt == 1) {
        this.IF_LCD = 1;
      }
      this.STAT_CoincidenceFlag = 1;
    } else {
      this.STAT_CoincidenceFlag = 0;
    }
  }

  execute(n: number) {
    const nn = n / 4;
    for (let i = 0; i < nn; i++) {
      this.cycle++;
      this.cycle_line++;

      if (this.cycle_line <= 20) {
        if (this.STAT_ModeFlag != 2 && this.STAT_OAMInterrupt == 1) {
          this.IF_LCD = 1;
        }
        this.STAT_ModeFlag = 2;
      } else if (this.cycle_line <= 63) {
        this.STAT_ModeFlag = 3;
      } else if (this.cycle_line <= 113) {
        if (this.STAT_ModeFlag != 0 && this.STAT_HBlankInterrupt == 1) {
          this.IF_LCD = 1;
        }
        this.STAT_ModeFlag = 0;
      } else if (this.cycle_line >= 114) {
        this.cycle_line = 0;
        this.LY += 1;
        this.compareLY();
        if (this.LY == 144) {
          this.IF_VBlank = 1;
          this.STAT_ModeFlag = 1;
          //this.render();
        }
      }

      if (this.cycle >= 16416 && this.cycle <= 17556) {
        if (this.STAT_ModeFlag != 1 && this.STAT_VBlankInterrupt == 1) {
          this.IF_LCD = 1;
        }
        this.STAT_ModeFlag = 1;
      } else if (this.cycle >= 17557) {
        this.render(); // ????
        this.cycle = 0;
        this.cycle_line = 0;
        this.LY = 0;
      }
    }
  }
}
