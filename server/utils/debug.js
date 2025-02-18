function debug(...args) {
  console.log(JSON.stringify(args, null, 2));
}

module.exports = debug; 