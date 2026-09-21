import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;

// Compared against when the account doesn't exist so login timing doesn't reveal valid emails.
let dummyHash: Promise<string> | null = null;
const getDummy = () => (dummyHash ??= bcrypt.hash("not-a-real-password", COST));

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, await getDummy());
    return false;
  }
  return bcrypt.compare(plain, hash);
}
