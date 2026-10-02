import assert from "node:assert/strict";
import { validatePassword } from "../lib/password-policy";

assert.equal(validatePassword("Ab1!xy"), null);            // 6 chars, all classes
assert.equal(validatePassword("Ab1!xyzwQ9"), null);        // exactly 10
assert.ok(validatePassword("Ab1!xyzwQ9z"));                // 11 -> too long
assert.ok(validatePassword("Ab1!x"));                      // 5 -> too short
assert.match(validatePassword("ab1!xyz")!, /uppercase/);   // no uppercase
assert.match(validatePassword("AB1!XYZ")!, /lowercase/);   // no lowercase
assert.match(validatePassword("Abc!xyz")!, /number/);      // no digit
assert.match(validatePassword("Abc1xyz")!, /special/);     // no special
assert.match(validatePassword("Abc1 xyz")!, /special/);    // whitespace is not a special character
assert.ok(validatePassword(""));
console.log("password policy tests passed");
