import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, revoquerSession } from "@/lib/auth";

// POST /api/auth/logout — révoque la session courante côté serveur (et pas
// seulement le cookie côté navigateur) afin qu'un jeton volé devienne inutilisable.
export async function POST(req: NextRequest) {
  const jeton = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (jeton) {
    await revoquerSession(jeton);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
