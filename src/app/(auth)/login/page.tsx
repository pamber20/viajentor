import { count } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { isPublicSignupAllowed } from "@/server/auth/registration";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const allowSignup = await isPublicSignupAllowed().catch(() => false);
  const db = getDb();
  const orgCount = await db
    .select({ n: count() })
    .from(schema.organization)
    .then((r) => r[0]?.n ?? 0)
    .catch(() => 1);

  return (
    <LoginForm
      allowSignup={allowSignup}
      isFirstInstance={orgCount === 0}
    />
  );
}
