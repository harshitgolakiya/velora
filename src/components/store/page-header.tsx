import Image from "next/image";

export function PageHeader({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}) {
  if (image) {
    return (
      <section className="relative h-[58dvh] min-h-[420px] overflow-hidden">
        <Image src={image} alt={imageAlt ?? title} fill priority fetchPriority="high" loading="eager" sizes="100vw" quality={84} className="object-cover" />
        <div className="absolute inset-0 bg-stone-950/35" />
        <div className="relative mx-auto flex h-full max-w-[1440px] items-end px-4 pb-12 text-white sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em]">{eyebrow}</p>
            <h1 className="mt-4 font-serif text-5xl sm:text-6xl">{title}</h1>
            {description ? <p className="mt-4 leading-7 text-stone-100">{description}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mb-8 max-w-3xl sm:mb-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{eyebrow}</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">{title}</h1>
      {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">{description}</p> : null}
    </div>
  );
}
