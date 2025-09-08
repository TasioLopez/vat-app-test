import { hashSync } from "bcryptjs";

const plainPassword = "test123";
const hashed = hashSync(plainPassword, 10);

console.log("✅ New bcryptjs hash:", hashed);
