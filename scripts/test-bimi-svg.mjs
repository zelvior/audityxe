import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateBimiSvg } from "./validate-bimi-svg.mjs";

const good = readFileSync(new URL("../public/audityxelogo.svg", import.meta.url), "utf8");
const run = (s) => validateBimiSvg(s).errors;
assert.deepEqual(run(good), [], "shipped logo must pass");

const must = (label, mutated, re) => {
  const errs = run(mutated);
  assert.ok(errs.some((e) => re.test(e)), `${label}: expected /${re}/ in ${JSON.stringify(errs)}`);
};
must("wrong version", good.replace('version="1.2"', 'version="1.1"'), /version/);
must("wrong profile", good.replace('baseProfile="tiny-ps"', 'baseProfile="full"'), /baseProfile/);
must("no title", good.replace(/<title>.*<\/title>\n?/, ""), /title/);
must("non-square viewBox", good.replace('viewBox="0 0 180 180"', 'viewBox="0 0 180 120"'), /square/);
must("no viewBox", good.replace(/ viewBox="[^"]*"/, ""), /viewBox/);
must("root x attr", good.replace("<svg ", '<svg x="0" '), /x or y/);
must("script", good.replace("</svg>", "<script>alert(1)</script></svg>"), /script/);
must("style attr", good.replace("<g ", '<g style="opacity:.9" '), /style attribute/);
must("raster image", good.replace("</svg>", '<image href="x.png"/></svg>'), /image/);
must("external href", good.replace("</svg>", '<a href="https://x">x</a></svg>'), /href|<a>/);
must("animation", good.replace("</svg>", "<animate/></svg>"), /animation/);
must("text element", good.replace("</svg>", "<text>Hi</text></svg>"), /text/);
must("too large", good.replace("</svg>", `<!--${"x".repeat(33000)}--></svg>`), /32 KB/);
must("external url()", good.replace("</svg>", '<rect fill="url(https://x/y)"/></svg>'), /url\(\)/);
console.log("bimi svg validator tests passed (" + 14 + " negative cases + shipped logo)");
