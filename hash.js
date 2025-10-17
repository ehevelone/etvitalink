// hash.js
const bcrypt = require("bcryptjs");

(async () => {
  const plain = "ETab10505!";  // 👈 replace with your desired password
  const hash = await bcrypt.hash(plain, 10);
  console.log("Hashed password:", hash);
})();
