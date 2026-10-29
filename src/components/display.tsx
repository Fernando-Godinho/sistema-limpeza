/*
 * Pecas visuais sem comportamento: podem ser usadas tanto nas telas que rodam
 * no servidor quanto nas que rodam no navegador.
 */

export function Card({
  children,
  tight,
  className,
}: {
  children: React.ReactNode;
  tight?: boolean;
  className?: string;
}) {
  return <div className={["card", tight ? "card--tight" : "", className ?? ""].join(" ").trim()}>{children}</div>;
}

/** Primeiras letras do nome, usadas quando a pessoa nao tem foto. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase();
}

export function Avatar({
  name,
  photoUrl,
  big,
}: {
  name: string;
  photoUrl?: string | null;
  big?: boolean;
}) {
  return (
    <span className={["avatar", big ? "avatar--big" : ""].join(" ").trim()} aria-hidden="true">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- as fotos vem de rota autenticada, sem otimizacao
        <img src={photoUrl} alt="" />
      ) : (
        // Nomes de pessoas nunca devem ser traduzidos pelo navegador.
        <span translate="no">{initialsOf(name)}</span>
      )}
    </span>
  );
}

/**
 * Escreve uma frase traduzida que contem o nome de uma pessoa.
 *
 * O nome fica marcado para o navegador nao traduzir: "Bom dia, Maria!" vira
 * "Good morning" na parte traduzida, mas o nome continua sendo Maria.
 * Basta chamar a traducao sem passar "name", que o marcador fica no lugar.
 */
export function TextWithName({ template, name }: { template: string; name: string }) {
  const [before, after] = template.split("{name}");
  return (
    <>
      {before}
      <span translate="no">{name}</span>
      {after ?? ""}
    </>
  );
}

export function Alert({
  tone = "info",
  icon,
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const role = tone === "danger" || tone === "warning" ? "alert" : undefined;
  return (
    <div className={`alert alert--${tone}`} role={role}>
      {icon}
      <div className="alert__body">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <p className="empty-state__title">{title}</p>
      {text ? <p>{text}</p> : null}
      {children}
    </div>
  );
}

export function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="summary__row">
      <span className="summary__label">{label}</span>
      <span className="summary__value">{value}</span>
    </div>
  );
}

export function ScreenHead({
  title,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div className="screen-head">
      <h1 className="screen-head__title" id={id}>
        {title}
      </h1>
      {subtitle ? <p className="screen-head__subtitle">{subtitle}</p> : null}
    </div>
  );
}

/** Marcador de "salvou". O texto sempre acompanha o desenho. */
export function Cheer({
  title,
  text,
  icon,
  children,
}: {
  title: string;
  text?: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="cheer">
      <span className="cheer__mark">{icon}</span>
      <p className="cheer__title">{title}</p>
      {text ? <p className="cheer__text">{text}</p> : null}
      {children}
    </div>
  );
}
