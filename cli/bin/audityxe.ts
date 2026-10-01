#!/usr/bin/env node
import { main } from "../src/index";

main(process.argv.slice(2)).catch((err) => {
  console.error("\nAudityxe CLI crashed unexpectedly:\n");
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});
