const bcrypt = require("bcryptjs");

async function generateHash() {
  const password = process.argv[2];

  if (!password) {
    console.error("Uso: node scripts/generateHash.js <contraseña>");
    process.exit(1);
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    console.log("Hash generado:");
    console.log(hash);
    console.log("\nAñade esto a tu archivo .env:");
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  } catch (error) {
    console.error("Error generando hash:", error);
    process.exit(1);
  }
}

generateHash();
