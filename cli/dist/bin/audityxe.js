#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
(0, index_1.main)(process.argv.slice(2)).catch((err) => {
    console.error("\nAudityxe CLI crashed unexpectedly:\n");
    console.error(err instanceof Error ? err.stack || err.message : err);
    process.exit(1);
});
