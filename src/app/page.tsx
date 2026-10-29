import { redirect } from "next/navigation";

import { getSessionUser, homePathFor } from "@/lib/session";

/** A porta de entrada: manda cada pessoa para a tela certa. */
export default async function HomePage() {
  const user = await getSessionUser();
  redirect(user ? homePathFor(user.role) : "/entrar");
}
