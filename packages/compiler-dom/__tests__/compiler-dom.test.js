'use strict';

const compilerDom = require('..');
const assert = require('assert').strict;

assert.strictEqual(compilerDom(), 'Hello from compilerDom');
console.info("compilerDom tests passed");
