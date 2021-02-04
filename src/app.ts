import Debug from "./debug.ts";

if (Deno.args.length != 1) {
  throw "required ROM file in args";
}

const ROM: Uint8Array = Deno.readFileSync(Deno.args[0]);
let debug = new Debug(ROM);
debug.main();
