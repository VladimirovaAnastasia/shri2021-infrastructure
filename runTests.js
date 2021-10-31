#!/bin/env node

const util = require('util');
const exec = util.promisify(require('child_process').exec);

exec('npx jest').then(({ stdout, stderr }) => {
  if (stderr) {
    console.error(stderr);
  }
  console.log(stdout);
});