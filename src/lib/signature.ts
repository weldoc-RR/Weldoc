import bcrypt from "bcryptjs";

// Un code PIN se hache exactement comme un mot de passe (voir
// src/lib/auth.ts) — jamais stocké en clair.
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function verifierPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
