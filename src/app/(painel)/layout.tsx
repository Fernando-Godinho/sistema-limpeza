import { requireUser } from "@/lib/session";

/**
 * Tudo que fica dentro daqui exige alguem conectado.
 * Sem sessao, a pessoa e levada para a tela de entrada.
 */
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
