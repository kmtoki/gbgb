import { bitReset, isZero, toHex, toU16, U16, U8 } from "./utils.ts";
import { basename } from "https://deno.land/std@0.82.0/path/mod.ts";

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

export default class Disassembler {
  file: string;
  rom: Uint8Array;
  pc: U16;
  _log: string[];
  _log_limit: number;
  encoder: TextEncoder;

  constructor(f: string, r: Uint8Array) {
    this.rom = r;
    this.file = f;
    this.pc = 0;
    this._log = [];
    this._log_limit = 0xffff;
    this.encoder = new TextEncoder();

    // clear cartridge header
    for (let i = 0x104; i < 0x150; i++) {
      this.rom[i] = 0;
    }
  }

  log(instr: string) {
    this._log.push(`${toHex(this.pc, 6)}: ${instr}\n`);
    if (this._log.length >= this._log_limit) {
      this.flush();
    }
  }

  flush() {
    let s = this._log.reduce((a, b) => a + b);
    Deno.writeFileSync(this.file, this.encoder.encode(s), { append: true });
    this._log = [];
  }

  run() {
    Deno.writeFileSync(this.file, this.encoder.encode(""), { append: false });
    while (this.pc < this.rom.length) {
      this.dispatch();
    }
    this.flush();
  }

  dispatch() {
    const instr = this.rom[this.pc];
    const op1 = this.rom[this.pc + 1];
    const op2 = this.rom[this.pc + 2];
    const op16 = toU16(op2, op1);
    switch (instr) {
      case 0x3e:
        this.ld_r_i8("A", op1);
        break;
      case 0x06:
        this.ld_r_i8("B", op1);
        break;
      case 0x0e:
        this.ld_r_i8("C", op1);
        break;
      case 0x16:
        this.ld_r_i8("D", op1);
        break;
      case 0x1e:
        this.ld_r_i8("E", op1);
        break;
      case 0x26:
        this.ld_r_i8("H", op1);
        break;
      case 0x2e:
        this.ld_r_i8("L", op1);
        break;
      case 0x7f:
        this.ld_r_r("A", "A");
        break;
      case 0x78:
        this.ld_r_r("A", "B");
        break;
      case 0x79:
        this.ld_r_r("A", "C");
        break;
      case 0x7a:
        this.ld_r_r("A", "D");
        break;
      case 0x7b:
        this.ld_r_r("A", "E");
        break;
      case 0x7c:
        this.ld_r_r("A", "H");
        break;
      case 0x7d:
        this.ld_r_r("A", "L");
        break;
      case 0x7e:
        this.ld_r_m("A", "HL");
        break;
      case 0x47:
        this.ld_r_r("B", "A");
        break;
      case 0x40:
        this.ld_r_r("B", "B");
        break;
      case 0x41:
        this.ld_r_r("B", "C");
        break;
      case 0x42:
        this.ld_r_r("B", "D");
        break;
      case 0x43:
        this.ld_r_r("B", "E");
        break;
      case 0x44:
        this.ld_r_r("B", "H");
        break;
      case 0x45:
        this.ld_r_r("B", "L");
        break;
      case 0x46:
        this.ld_r_m("B", "HL");
        break;
      case 0x4f:
        this.ld_r_r("C", "A");
        break;
      case 0x48:
        this.ld_r_r("C", "B");
        break;
      case 0x49:
        this.ld_r_r("C", "C");
        break;
      case 0x4a:
        this.ld_r_r("C", "D");
        break;
      case 0x4b:
        this.ld_r_r("C", "E");
        break;
      case 0x4c:
        this.ld_r_r("C", "H");
        break;
      case 0x4d:
        this.ld_r_r("C", "L");
        break;
      case 0x4e:
        this.ld_r_m("C", "HL");
        break;
      case 0x57:
        this.ld_r_r("D", "A");
        break;
      case 0x50:
        this.ld_r_r("D", "B");
        break;
      case 0x51:
        this.ld_r_r("D", "C");
        break;
      case 0x52:
        this.ld_r_r("D", "D");
        break;
      case 0x53:
        this.ld_r_r("D", "E");
        break;
      case 0x54:
        this.ld_r_r("D", "H");
        break;
      case 0x55:
        this.ld_r_r("D", "L");
        break;
      case 0x56:
        this.ld_r_m("D", "HL");
        break;
      case 0x5f:
        this.ld_r_r("E", "A");
        break;
      case 0x58:
        this.ld_r_r("E", "B");
        break;
      case 0x59:
        this.ld_r_r("E", "C");
        break;
      case 0x5a:
        this.ld_r_r("E", "D");
        break;
      case 0x5b:
        this.ld_r_r("E", "E");
        break;
      case 0x5c:
        this.ld_r_r("E", "H");
        break;
      case 0x5d:
        this.ld_r_r("E", "L");
        break;
      case 0x5e:
        this.ld_r_m("E", "HL");
        break;
      case 0x67:
        this.ld_r_r("H", "A");
        break;
      case 0x60:
        this.ld_r_r("H", "B");
        break;
      case 0x61:
        this.ld_r_r("H", "C");
        break;
      case 0x62:
        this.ld_r_r("H", "D");
        break;
      case 0x63:
        this.ld_r_r("H", "E");
        break;
      case 0x64:
        this.ld_r_r("H", "H");
        break;
      case 0x65:
        this.ld_r_r("H", "L");
        break;
      case 0x66:
        this.ld_r_m("H", "HL");
        break;
      case 0x6f:
        this.ld_r_r("L", "A");
        break;
      case 0x68:
        this.ld_r_r("L", "B");
        break;
      case 0x69:
        this.ld_r_r("L", "C");
        break;
      case 0x6a:
        this.ld_r_r("L", "D");
        break;
      case 0x6b:
        this.ld_r_r("L", "E");
        break;
      case 0x6c:
        this.ld_r_r("L", "H");
        break;
      case 0x6d:
        this.ld_r_r("L", "L");
        break;
      case 0x6e:
        this.ld_r_m("L", "HL");
        break;
      case 0x70:
        this.ld_m_r("HL", "B");
        break;
      case 0x71:
        this.ld_m_r("HL", "C");
        break;
      case 0x72:
        this.ld_m_r("HL", "D");
        break;
      case 0x73:
        this.ld_m_r("HL", "E");
        break;
      case 0x74:
        this.ld_m_r("HL", "H");
        break;
      case 0x75:
        this.ld_m_r("HL", "L");
        break;
      case 0x36:
        this.ld_m_i8(op1, "HL");
        break;
      case 0x0a:
        this.ld_r_m("A", "BC");
        break;
      case 0x1a:
        this.ld_r_m("A", "DE");
        break;
      case 0xfa:
        this.ld_r_m_i16("A", op16);
        break;
      case 0x02:
        this.ld_m_r("BC", "A");
        break;
      case 0x12:
        this.ld_m_r("DE", "A");
        break;
      case 0x77:
        this.ld_m_r("HL", "A");
        break;
      case 0xea:
        this.ld_m_i16_r(op16, "A");
        break;

      case 0xf2:
        this.ld_r_m("A", "$FF00+C");
        break;
      case 0xe2:
        this.ld_m_r("A", "$FF00+C");
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
        this.ldh_m_r(op1, "A");
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
        this.ldhl_sp_i8(op1);
        break;
      case 0x08:
        this.ld_m_i16_sp(op16);
        break;

      case 0xf5:
        this.push_rr("AF");
        break;
      case 0xc5:
        this.push_rr("BC");
        break;
      case 0xd5:
        this.push_rr("DE");
        break;
      case 0xe5:
        this.push_rr("HL");
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
        this.add_a_r("A");
        break;
      case 0x80:
        this.add_a_r("B");
        break;
      case 0x81:
        this.add_a_r("C");
        break;
      case 0x82:
        this.add_a_r("D");
        break;
      case 0x83:
        this.add_a_r("E");
        break;
      case 0x84:
        this.add_a_r("H");
        break;
      case 0x85:
        this.add_a_r("L");
        break;
      case 0x86:
        this.add_a_m_hl();
        break;
      case 0xc6:
        this.add_a_i8(op1);
        break;

      case 0x8f:
        this.adc_a_r("A");
        break;
      case 0x88:
        this.adc_a_r("B");
        break;
      case 0x89:
        this.adc_a_r("C");
        break;
      case 0x8a:
        this.adc_a_r("D");
        break;
      case 0x8b:
        this.adc_a_r("E");
        break;
      case 0x8c:
        this.adc_a_r("H");
        break;
      case 0x8d:
        this.adc_a_r("L");
        break;
      case 0x8e:
        this.adc_a_m_hl();
        break;
      case 0xce:
        this.adc_a_i8(op1);
        break;

      case 0x97:
        this.sub_a_r("A");
        break;
      case 0x90:
        this.sub_a_r("B");
        break;
      case 0x91:
        this.sub_a_r("C");
        break;
      case 0x92:
        this.sub_a_r("D");
        break;
      case 0x93:
        this.sub_a_r("E");
        break;
      case 0x94:
        this.sub_a_r("H");
        break;
      case 0x95:
        this.sub_a_r("L");
        break;
      case 0x96:
        this.sub_a_m_hl();
        break;
      case 0xd6:
        this.sub_a_i8(op1);
        break;

      case 0x9f:
        this.sbc_a_r("A");
        break;
      case 0x98:
        this.sbc_a_r("B");
        break;
      case 0x99:
        this.sbc_a_r("C");
        break;
      case 0x9a:
        this.sbc_a_r("D");
        break;
      case 0x9b:
        this.sbc_a_r("E");
        break;
      case 0x9c:
        this.sbc_a_r("H");
        break;
      case 0x9d:
        this.sbc_a_r("L");
        break;
      case 0x9e:
        this.sbc_a_m_hl();
        break;
      //case ????: this.sbc_a_i8(op1); break;
      case 0xa7:
        this.and_a_r("A");
        break;
      case 0xa0:
        this.and_a_r("B");
        break;
      case 0xa1:
        this.and_a_r("C");
        break;
      case 0xa2:
        this.and_a_r("D");
        break;
      case 0xa3:
        this.and_a_r("E");
        break;
      case 0xa4:
        this.and_a_r("H");
        break;
      case 0xa5:
        this.and_a_r("L");
        break;
      case 0xa6:
        this.and_a_m_hl();
        break;
      case 0xe6:
        this.and_a_i8(op1);
        break;

      case 0xb7:
        this.or_a_r("A");
        break;
      case 0xb0:
        this.or_a_r("B");
        break;
      case 0xb1:
        this.or_a_r("C");
        break;
      case 0xb2:
        this.or_a_r("D");
        break;
      case 0xb3:
        this.or_a_r("E");
        break;
      case 0xb4:
        this.or_a_r("H");
        break;
      case 0xb5:
        this.or_a_r("L");
        break;
      case 0xb6:
        this.or_a_m_hl();
        break;
      case 0xf6:
        this.or_a_i8(op1);
        break;

      case 0xaf:
        this.xor_a_r("A");
        break;
      case 0xa8:
        this.xor_a_r("B");
        break;
      case 0xa9:
        this.xor_a_r("C");
        break;
      case 0xaa:
        this.xor_a_r("D");
        break;
      case 0xab:
        this.xor_a_r("E");
        break;
      case 0xac:
        this.xor_a_r("H");
        break;
      case 0xad:
        this.xor_a_r("L");
        break;
      case 0xae:
        this.xor_a_m_hl();
        break;
      case 0xee:
        this.xor_a_i8(op1);
        break;

      case 0xbf:
        this.cp_a_r("A");
        break;
      case 0xb8:
        this.cp_a_r("B");
        break;
      case 0xb9:
        this.cp_a_r("C");
        break;
      case 0xba:
        this.cp_a_r("D");
        break;
      case 0xbb:
        this.cp_a_r("E");
        break;
      case 0xbc:
        this.cp_a_r("H");
        break;
      case 0xbd:
        this.cp_a_r("L");
        break;
      case 0xbe:
        this.cp_a_m_hl();
        break;
      case 0xfe:
        this.cp_a_i8(op1);
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
        this.add_hl_rr("BC");
        break;
      case 0x19:
        this.add_hl_rr("DE");
        break;
      case 0x29:
        this.add_hl_rr("HL");
        break;
      case 0x39:
        this.add_hl_rr("SP");
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
        this.jp_i16(op16);
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
        this.jp_m_hl();
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
            this.log(`NOP 0x10 ${toHex(op1)}`);
            this.pc += 1;
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
            this.bit_b_m_hl(2);
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
            this.set_b_m_hl(2);
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
            this.res_b_m_hl(2);
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
            this.log(`NOP 0xCB ${toHex(op1)}`);
            this.pc += 1;
            break;
        }
        break;

      default:
        this.log(`NOP ${toHex(instr)}`);
        this.pc += 1;
        break;
    }
  }

  ld_r_i8(r: Operand, u: U8) {
    this.log(`LD ${r} ${toHex(u)}`);
    this.pc += 2;
  }

  ld_r_r(r1: Operand, t: string) {
    this.log(`LD ${r1} ${t}`);
    this.pc += 1;
  }

  ld_r_m(r: Operand, t: string) {
    this.log(`LD ${r} (${t})`);
    this.pc += 1;
  }

  ld_m_r(t1: string, t2: string) {
    this.log(`LD (${t1}) ${t2}`);
    this.pc += 1;
  }

  ld_m_i16_r(m: U16, t: string) {
    this.log(`LD (${toHex(m)}) ${t}`);
    this.pc += 3;
  }

  ld_m_i8(u: U8, t: string) {
    this.log(`LD (${t}) ${toHex(u)}`);
    this.pc += 2;
  }

  ld_r_m_i16(r: Operand, m: U16) {
    this.log(`LD ${r} ${toHex(m)}`);
    this.pc += 3;
  }

  ldd_a_m_hl() {
    this.log(`LDD A (HL)`);
    this.pc += 1;
  }

  ldd_m_hl_a() {
    this.log(`LDD (HL) A`);
    this.pc += 1;
  }

  ldi_a_m_hl() {
    this.log(`LDI A (HL)`);
    this.pc += 1;
  }

  ldi_m_hl_a() {
    this.log(`LDI (HL) A`);
    this.pc += 1;
  }

  ldh_m_r(m: U8, t: string) {
    this.log(`LDH ($FF00+${toHex(m)}) ${t}`);
    this.pc += 2;
  }

  ldh_r_m(r: Operand, m: U8) {
    this.log(`LDH ${r} ($FF00+${toHex(m)})`);
    this.pc += 2;
  }

  ld_rr_i16(r: Operand, u: U16) {
    this.log(`LD ${r} ${toHex(u)}`);
    this.pc += 3;
  }

  ld_sp_hl() {
    this.log(`LD SP HL`);
    this.pc += 1;
  }

  ldhl_sp_i8(u: U8) {
    let i = (u >> 7 & 1) == 1 ? -(128 - (u & 0b1111111)) : (u & 0b1111111);
    this.log(`LD HL SP+${toHex(i)}`);
    this.pc += 2;
  }

  ld_m_i16_sp(u: U16) {
    this.log(`LD (${toHex(u)}) SP`);
    this.pc += 3;
  }

  push_rr(t: string) {
    this.log(`PUSH ${t}`);
    this.pc += 1;
  }

  pop_rr(r: Operand) {
    this.log(`POP ${r}`);
    this.pc += 1;
  }

  add_a_r(t: string) {
    this.log(`ADD A ${t}`);
    this.pc += 1;
  }

  add_a_m_hl() {
    this.log(`ADD A (HL)`);
    this.pc += 1;
  }

  add_a_i8(u: U8) {
    this.log(`ADD A ${toHex(u)}`);
    this.pc += 2;
  }

  adc_a_r(t: string) {
    this.log(`ADC A ${t}`);
    this.pc += 1;
  }

  adc_a_m_hl() {
    this.log(`ADC A (HL)`);
    this.pc += 1;
  }

  adc_a_i8(u: U8) {
    this.log(`ADC A ${toHex(u)}`);
    this.pc += 2;
  }

  sub_a_r(t: string) {
    this.log(`SUB A ${t}`);
    this.pc += 1;
  }

  sub_a_m_hl() {
    this.log(`SUB A (HL)`);
    this.pc += 1;
  }

  sub_a_i8(u: U8) {
    this.log(`SUB A ${toHex(u)}`);
    this.pc += 2;
  }

  sbc_a_r(t: string) {
    this.log(`SBC A ${t}`);
    this.pc += 1;
  }

  sbc_a_m_hl() {
    this.log(`SBC A (HL})`);
    this.pc += 1;
  }

  sbc_a_i8(u: U8) {
    this.log(`SBC A ${toHex(u)}`);
    this.pc += 2;
  }

  and_a_r(t: string) {
    this.log(`AND A ${t}`);
    this.pc += 1;
  }

  and_a_m_hl() {
    this.log(`AND A (HL)`);
    this.pc += 1;
  }

  and_a_i8(u: U8) {
    this.log(`AND A ${toHex(u)}`);
    this.pc += 2;
  }

  or_a_r(t: string) {
    this.log(`OR A ${t}`);
    this.pc += 1;
  }

  or_a_m_hl() {
    this.log(`OR A (HL)`);
    this.pc += 1;
  }

  or_a_i8(u: U8) {
    this.log(`OR A ${toHex(u)}`);
    this.pc += 2;
  }

  xor_a_r(t: string) {
    this.log(`XOR A ${t}`);
    this.pc += 1;
  }

  xor_a_m_hl() {
    this.log(`XOR A (HL)`);
    this.pc += 1;
  }

  xor_a_i8(u: U8) {
    this.log(`XOR A ${toHex(u)}`);
    this.pc += 2;
  }

  cp_a_r(t: string) {
    this.log(`CP A ${t}`);
    this.pc += 1;
  }

  cp_a_m_hl() {
    this.log(`CP A (HL)`);
    this.pc += 1;
  }

  cp_a_i8(u: U8) {
    this.log(`CP A ${toHex(u)}`);
    this.pc += 2;
  }

  inc_r(r: Operand) {
    this.log(`INC ${r}`);
    this.pc += 1;
  }

  inc_m_hl() {
    this.log(`INC (HL)`);
    this.pc += 1;
  }

  dec_r(r: Operand) {
    this.log(`DEC ${r}`);
    this.pc += 1;
  }

  dec_m_hl() {
    this.log(`DEC (HL)`);
    this.pc += 1;
  }

  add_hl_rr(t: string) {
    this.log(`ADD HL (${t})`);
    this.pc += 1;
  }

  add_sp_i8(u: U8) {
    let i = (u >> 7 & 1) == 1 ? -(128 - (u & 0b1111111)) : (u & 0b1111111);
    this.log(`ADD SP (${toHex(i)})`);
    this.pc += 2;
  }

  inc_rr(r: Operand) {
    this.log(`INC ${r}`);
    this.pc += 1;
  }

  dec_rr(r: Operand) {
    this.log(`DEC ${r}`);
    this.pc += 1;
  }

  swap_r(r: Operand) {
    this.log(`SWAP ${r}`);
    this.pc += 2;
  }

  swap_m_hl() {
    this.log(`SWAP (HL)`);
    this.pc += 2;
  }

  daa() {
    this.log(`DAA A`);
    this.pc += 1;
  }

  cpl() {
    this.log(`CPL A`);
    this.pc += 1;
  }

  ccf() {
    this.log(`CCF C`);
    this.pc += 1;
  }

  scf() {
    this.log(`SCF Carry`);
    this.pc += 1;
  }

  nop() {
    this.log(`NOP`);
    this.pc += 1;
  }

  halt() {
    this.log(`HALT`);
    this.pc += 1;
  }

  stop() {
    this.log(`STOP`);
    this.pc += 1;
  }

  di() {
    this.log(`DI`);
    this.pc += 1;
  }

  ei() {
    this.log(`EI`);
    this.pc += 1;
  }

  rlca() {
    this.log(`RLCA A`);
    this.pc += 1;
  }

  rla() {
    this.log(`RLA A`);
    this.pc += 1;
  }

  rrca() {
    this.log(`RRCA A`);
    this.pc += 1;
  }

  rra() {
    this.log(`RRA A`);
    this.pc += 1;
  }

  rlc_r(r: Operand) {
    this.log(`RLC ${r}`);
    this.pc += 2;
  }

  rlc_m_hl() {
    this.log(`RLC (HL)`);
    this.pc += 2;
  }

  rl_r(r: Operand) {
    this.log(`RLC ${r}`);
    this.pc += 2;
  }

  rl_m_hl() {
    this.log(`RLC (HL)`);
    this.pc += 2;
  }

  rrc_r(r: Operand) {
    this.log(`RRC ${r}`);
    this.pc += 2;
  }

  rrc_m_hl() {
    this.log(`RRC (HL)`);
    this.pc += 2;
  }

  rr_r(r: Operand) {
    this.log(`RR ${r}`);
    this.pc += 2;
  }

  rr_m_hl() {
    this.log(`RR (HL)`);
    this.pc += 2;
  }

  sla_r(r: Operand) {
    this.log(`SLA ${r}`);
    this.pc += 2;
  }

  sla_m_hl() {
    this.log(`SLA (HL)`);
    this.pc += 2;
  }

  sra_r(r: Operand) {
    this.log(`SRA ${r}`);
    this.pc += 2;
  }

  sra_m_hl() {
    this.log(`SRA (HL)`);
    this.pc += 2;
  }

  srl_r(r: Operand) {
    this.log(`SRL ${r}`);
    this.pc += 2;
  }

  srl_m_hl() {
    this.log(`SRL (HL)`);
    this.pc += 2;
  }

  bit_b_r(u: U8, r: Operand) {
    this.log(`BIT ${u} ${r}`);
    this.pc += 2;
  }

  bit_b_m_hl(u: U8) {
    this.log(`BIT ${u} (HL)`);
    this.pc += 2;
  }

  set_b_r(u: U8, r: Operand) {
    this.log(`SET ${u} ${r}`);
    this.pc += 2;
  }

  set_b_m_hl(u: U8) {
    this.log(`SET ${u} (HL)`);
    this.pc += 2;
  }

  res_b_r(u: U8, r: Operand) {
    this.log(`RES ${r} ${toHex(u)}`);
    this.pc += 2;
  }

  res_b_m_hl(u: U8) {
    this.log(`RES ${toHex(u)} (HL)`);
    this.pc += 2;
  }

  jp_i16(u: U16) {
    this.log(`JP ${toHex(u)}`);
    this.pc += 3;
  }

  jp_f_i16(r: Operand, u: U16) {
    this.log(`JP ${r} ${toHex(u)}`);
    this.pc += 3;
  }

  jp_m_hl() {
    this.log(`JP HL`);
    this.pc += 1;
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
    this.pc += 2;
  }

  jr_f_i8(r: Operand, u: U8) {
    this.jr_i8(r, u);
  }

  call_i16(r: Operand, u: U16) {
    this.log(`CALL ${r} ${toHex(u)}`);
    this.pc += 3;
  }

  call_f_i16(r: Operand, u: U16) {
    this.call_i16(r, u);
  }

  rst_n(u: U8) {
    this.log(`RST ${toHex(u)}`);
    this.pc += 1;
  }

  ret(r: Operand) {
    this.log(`RET ${r}`);
    this.pc += 1;
  }

  ret_f(r: Operand) {
    this.log(`RET ${r}`);
    this.pc += 1;
  }

  reti() {
    this.log(`RETI`);
    this.pc += 1;
  }
}

const main = () => {
  if (Deno.args.length != 1) {
    throw "required ROM file in args";
  }
  const file = Deno.args[0];
  const rom: Uint8Array = Deno.readFileSync(file);
  let dis = new Disassembler("text/" + basename(file) + ".s", rom);
  console.log("write to ", "text/" + basename(file) + ".s");
  //dis.pc = 0x150;
  dis.run();
};

main();
