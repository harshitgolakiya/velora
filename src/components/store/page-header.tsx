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
        <Image src={image} alt={imageAlt ?? title} fill priority loading="eager" sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-stone-950/35" />
        <div className="relative mx-auto flex h-full max-w-[1440px] items-end px-4 pb-12 text-white sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em]">{eyebrow}</p>
            <h1 className="mt-4 font-serif text-6xl">{title}</h1>
            {description ? <p className="mt-4 leading-7 text-stone-100">{description}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mb-10 max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">{eyebrow}</p>
      <h1 className="mt-4 font-serif text-6xl">{title}</h1>
      {description ? <p className="mt-4 text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}
