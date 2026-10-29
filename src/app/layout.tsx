import type { Metadata, Viewport } from "next";

import { LocaleProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { MESSAGES } from "@/i18n/messages";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Limpeza",
  description: "Organize a equipe e registre os serviços de limpeza do dia.",
  applicationName: "Sistema de Limpeza",
};

/*
 * Nunca limitamos o zoom nem o tamanho da letra: quem precisa ampliar tem que
 * conseguir. "viewportFit: cover" aproveita a tela inteira dos celulares novos
 * sem esconder conteudo atras do recorte da camera.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14508f",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, messages } = await getI18n();

  return (
    // O idioma escolhido vai no "lang" para o leitor de tela pronunciar certo.
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
