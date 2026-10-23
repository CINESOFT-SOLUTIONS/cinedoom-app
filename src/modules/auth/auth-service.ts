import bcrypt from "bcryptjs";
export * from "./rbac-rules";

export const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error("A senha deve possuir no minimo 6 caracteres.");
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}
