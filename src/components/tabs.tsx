"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Abas do painel do gestor.
 *
 * Ficam sempre no mesmo lugar, com o nome escrito e a area de toque grande.
 * A aba aberta e marcada com fundo e com o atributo de acessibilidade, para
 * nao depender de cor.
 */
export function Tabs({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();

  return (
    <nav className="tabs" aria-label="Seções do painel">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            className="tabs__tab"
            href={item.href}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
