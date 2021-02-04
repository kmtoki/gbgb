export default class Cartridge {
  rom: Uint8Array;

  entry_point: Uint8Array; // 0x100 - 0x103
  logo: Uint8Array; // 0x104 - 0x133
  title: Uint8Array; // 0x134 - 0x143
  manufacturer_code: Uint8Array; // 0x13f - 0x142
  cgb_flag: number; // 0x143
  new_licensee_code: Uint8Array; // 0x144 - 0x145
  new_licensee_code_name: string;
  sgb_flag: number; // 0x146
  cartridge_type_code: number; // 0x147
  cartridge_type: string;
  rom_size_code: number; // 0x148
  rom_size: number;
  ram_size_code: number; // 0x149
  ram_size: number;
  destination_code: number; // 0x14a
  old_licensee_code: number; // 0x14b
  mask_rom_version: number; // 0x14c
  header_checksum: number; // 0x14d
  global_checksum: Uint8Array; // 0x14e - 0x14f

  constructor(rom: Uint8Array) {
    this.rom = rom;

    this.entry_point = new Uint8Array(0);
    this.logo = new Uint8Array(0);
    this.title = new Uint8Array(0);
    this.manufacturer_code = new Uint8Array(0);
    this.cgb_flag = 0x00;
    this.new_licensee_code = new Uint8Array(0);
    this.new_licensee_code_name = "";
    this.sgb_flag = 0x00;
    this.cartridge_type_code = 0x00;
    this.cartridge_type = "";
    this.rom_size_code = 0x00;
    this.rom_size = 0x00;
    this.ram_size_code = 0x00;
    this.ram_size = 0x00;
    this.destination_code = 0x00;
    this.old_licensee_code = 0x00;
    this.mask_rom_version = 0x00;
    this.header_checksum = 0x00;
    this.global_checksum = new Uint8Array(0);

    this.parseHeader();
  }

  parseHeader() {
    this.entry_point = this.rom.slice(0x100, 0x104);
    this.logo = this.rom.slice(0x104, 0x134);
    this.title = this.rom.slice(0x134, 0x144);
    this.manufacturer_code = this.rom.slice(0x13f, 0x143);
    this.cgb_flag = this.rom[0x143];
    this.new_licensee_code = this.rom.slice(0x144, 0x146);
    this.sgb_flag = this.rom[0x146];
    this.cartridge_type_code = this.rom[0x147];
    this.rom_size_code = this.rom[0x148];
    this.ram_size_code = this.rom[0x149];
    this.destination_code = this.rom[0x14a];
    this.old_licensee_code = this.rom[0x14b];
    this.mask_rom_version = this.rom[0x14c];
    this.header_checksum = this.rom[0x14d];
    this.global_checksum = this.rom.slice(0x14e, 0x150);

    this.set_new_licensee_code_name();
    this.set_cartridge_type();
    this.set_ram_size();
    this.set_rom_size();
  }

  set_rom_size() {
    switch (this.rom_size_code) {
      case 0x00: // 32 KByte	no ROM banking
        this.rom_size = 32 * Math.pow(2, 10);
        break;
      case 0x01: // 64 KByte	4 banks
        this.rom_size = 64 * Math.pow(2, 10);
        break;
      case 0x02: // 128 KByte	8 banks
        this.rom_size = 128 * Math.pow(2, 10);
        break;
      case 0x03: // 256 KByte	16 banks
        this.rom_size = 256 * Math.pow(2, 10);
        break;
      case 0x04: // 512 KByte	32 banks
        this.rom_size = 512 * Math.pow(2, 10);
        break;
      case 0x05: // 1 MByte  	64 banks  only 63  banks used by MBC1
        this.rom_size = 1 * Math.pow(2, 20);
        break;
      case 0x06: // 2 MByte  	128 banks only 125 banks used by MBC1
        this.rom_size = 2 * Math.pow(2, 20);
        break;
      case 0x07: // 4 MByte  	256 banks
        this.rom_size = 4 * Math.pow(2, 20);
        break;
      case 0x08: // 8 MByte  	512 banks
        this.rom_size = 8 * Math.pow(2, 20);
        break;
      case 0x52: // 1.1 MByte	72 banks
        this.rom_size = 1.1 * Math.pow(2, 20);
        break;
      case 0x53: // 1.2 MByte	80 banks
        this.rom_size = 1.2 * Math.pow(2, 20);
        break;
      case 0x54: // 1.5 MByte	96 banks
        this.rom_size = 1.5 * Math.pow(2, 20);
        break;
      default:
        this.rom_size = 0;
    }
  }

  set_ram_size() {
    switch (this.ram_size_code) {
      case 0x00: // None
        this.ram_size = 0;
        break;
      case 0x01: // 2 KBytes
        this.ram_size = 2 * Math.pow(2, 10);
        break;
      case 0x02: // 8 KBytes
        this.ram_size = 8 * Math.pow(2, 10);
        break;
      case 0x03: // 32 KBytes  (4 banks  of 8KBytes each)
        this.ram_size = 32 * Math.pow(2, 10);
        break;
      case 0x04: // 128 KBytes (16 banks of 8KBytes each)
        this.ram_size = 128 * Math.pow(2, 10);
        break;
      case 0x05: // 64 KBytes  (8 banks  of 8KBytes each)
        this.ram_size = 64 * Math.pow(2, 10);
        break;
      default:
        this.ram_size = 0;
    }
  }

  set_new_licensee_code_name() {
    switch (this.new_licensee_code[1]) {
      case 0x0:
        this.new_licensee_code_name = "none";
        break;
      case 0x1:
        this.new_licensee_code_name = "Nintendo R&D1";
        break;
      case 0x8:
        this.new_licensee_code_name = "Capcom";
        break;
      case 0x13:
        this.new_licensee_code_name = "Electronic Arts";
        break;
      case 0x18:
        this.new_licensee_code_name = "Hudson Soft";
        break;
      case 0x19:
        this.new_licensee_code_name = "b-ai";
        break;
      case 0x20:
        this.new_licensee_code_name = "kss";
        break;
      case 0x22:
        this.new_licensee_code_name = "pow";
        break;
      case 0x24:
        this.new_licensee_code_name = "PCM Complete";
        break;
      case 0x25:
        this.new_licensee_code_name = "san-x";
        break;
      case 0x28:
        this.new_licensee_code_name = "Kemco Japan";
        break;
      case 0x29:
        this.new_licensee_code_name = "seta";
        break;
      case 0x30:
        this.new_licensee_code_name = "Viacom";
        break;
      case 0x31:
        this.new_licensee_code_name = "Nintendo";
        break;
      case 0x32:
        this.new_licensee_code_name = "Bandai";
        break;
      case 0x33:
        this.new_licensee_code_name = "Ocean/Acclaim";
        break;
      case 0x34:
        this.new_licensee_code_name = "Konami";
        break;
      case 0x35:
        this.new_licensee_code_name = "Hector";
        break;
      case 0x37:
        this.new_licensee_code_name = "Taito";
        break;
      case 0x38:
        this.new_licensee_code_name = "Hudson";
        break;
      case 0x39:
        this.new_licensee_code_name = "Banpresto";
        break;
      case 0x41:
        this.new_licensee_code_name = "Ubi Soft";
        break;
      case 0x42:
        this.new_licensee_code_name = "Atlus";
        break;
      case 0x44:
        this.new_licensee_code_name = "Malibu";
        break;
      case 0x46:
        this.new_licensee_code_name = "angel";
        break;
      case 0x47:
        this.new_licensee_code_name = "Bullet-Proof";
        break;
      case 0x49:
        this.new_licensee_code_name = "irem";
        break;
      case 0x50:
        this.new_licensee_code_name = "Absolute";
        break;
      case 0x51:
        this.new_licensee_code_name = "Acclaim";
        break;
      case 0x52:
        this.new_licensee_code_name = "Activision";
        break;
      case 0x53:
        this.new_licensee_code_name = "American sammy";
        break;
      case 0x54:
        this.new_licensee_code_name = "Konami";
        break;
      case 0x55:
        this.new_licensee_code_name = "Hi tech entertainment";
        break;
      case 0x56:
        this.new_licensee_code_name = "LJN";
        break;
      case 0x57:
        this.new_licensee_code_name = "Matchbox";
        break;
      case 0x58:
        this.new_licensee_code_name = "Mattel";
        break;
      case 0x59:
        this.new_licensee_code_name = "Milton Bradley";
        break;
      case 0x60:
        this.new_licensee_code_name = "Titus";
        break;
      case 0x61:
        this.new_licensee_code_name = "Virgin";
        break;
      case 0x64:
        this.new_licensee_code_name = "LucasArts";
        break;
      case 0x67:
        this.new_licensee_code_name = "Ocean";
        break;
      case 0x69:
        this.new_licensee_code_name = "Electronic Arts";
        break;
      case 0x70:
        this.new_licensee_code_name = "Infogrames";
        break;
      case 0x71:
        this.new_licensee_code_name = "Interplay";
        break;
      case 0x72:
        this.new_licensee_code_name = "Broderbund";
        break;
      case 0x73:
        this.new_licensee_code_name = "sculptured";
        break;
      case 0x75:
        this.new_licensee_code_name = "sci";
        break;
      case 0x78:
        this.new_licensee_code_name = "THQ";
        break;
      case 0x79:
        this.new_licensee_code_name = "Accolade";
        break;
      case 0x80:
        this.new_licensee_code_name = "misawa";
        break;
      case 0x83:
        this.new_licensee_code_name = "lozc";
        break;
      case 0x86:
        this.new_licensee_code_name = "Tokuma Shoten Intermedia";
        break;
      case 0x87:
        this.new_licensee_code_name = "Tsukuda Original";
        break;
      case 0x91:
        this.new_licensee_code_name = "Chunsoft";
        break;
      case 0x92:
        this.new_licensee_code_name = "Video system";
        break;
      case 0x93:
        this.new_licensee_code_name = "Ocean/Acclaim";
        break;
      case 0x95:
        this.new_licensee_code_name = "Varie";
        break;
      case 0x96:
        this.new_licensee_code_name = "Yonezawa/s'pal";
        break;
      case 0x97:
        this.new_licensee_code_name = "Kaneko";
        break;
      case 0x99:
        this.new_licensee_code_name = "Pack in soft";
        break;
      case 0xA4:
        this.new_licensee_code_name = "Konami (Yu-Gi-Oh!)";
        break;
      default:
        this.new_licensee_code_name = "NONE";
        break;
    }
  }

  set_cartridge_type() {
    switch (this.cartridge_type_code) {
      case 0x00:
        this.cartridge_type = "ROM ONLY";
        break;
      case 0x01:
        this.cartridge_type = "MBC1";
        break;
      case 0x02:
        this.cartridge_type = "MBC1+RAM";
        break;
      case 0x03:
        this.cartridge_type = "MBC1+RAM+BATTERY";
        break;
      case 0x05:
        this.cartridge_type = "MBC2";
        break;
      case 0x06:
        this.cartridge_type = "MBC2+BATTERY";
        break;
      case 0x08:
        this.cartridge_type = "ROM+RAM";
        break;
      case 0x09:
        this.cartridge_type = "ROM+RAM+BATTERY";
        break;
      case 0x0B:
        this.cartridge_type = "MMM01";
        break;
      case 0x0C:
        this.cartridge_type = "MMM01+RAM";
        break;
      case 0x0D:
        this.cartridge_type = "MMM01+RAM+BATTERY";
        break;
      case 0x0F:
        this.cartridge_type = "MBC3+TIMER+BATTERY";
        break;
      case 0x10:
        this.cartridge_type = "MBC3+TIMER+RAM+BATTERY";
        break;
      case 0x11:
        this.cartridge_type = "MBC3";
        break;
      case 0x12:
        this.cartridge_type = "MBC3+RAM";
        break;
      case 0x13:
        this.cartridge_type = "MBC3+RAM+BATTERY";
        break;
      case 0x19:
        this.cartridge_type = "MBC5";
        break;
      case 0x1A:
        this.cartridge_type = "MBC5+RAM";
        break;
      case 0x1B:
        this.cartridge_type = "MBC5+RAM+BATTERY";
        break;
      case 0x1C:
        this.cartridge_type = "MBC5+RUMBLE";
        break;
      case 0x1D:
        this.cartridge_type = "MBC5+RUMBLE+RAM";
        break;
      case 0x1E:
        this.cartridge_type = "MBC5+RUMBLE+RAM+BATTERY";
        break;
      case 0x20:
        this.cartridge_type = "MBC6";
        break;
      case 0x22:
        this.cartridge_type = "MBC7+SENSOR+RUMBLE+RAM+BATTERY";
        break;
      case 0xFC:
        this.cartridge_type = "POCKET CAMERA";
        break;
      case 0xFD:
        this.cartridge_type = "BANDAI TAMA5";
        break;
      case 0xFE:
        this.cartridge_type = "HuC3";
        break;
      case 0xFF:
        this.cartridge_type = "HuC1+RAM+BATTERY";
        break;
      default:
        this.cartridge_type = "NONE";
        break;
    }
  }
}
