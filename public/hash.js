// hash.js
const bcrypt = require('bcryptjs');

const password = process.argv[2]; // pass password from CLI
bcrypt.hash(password, 10).then(hash => {
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
});

