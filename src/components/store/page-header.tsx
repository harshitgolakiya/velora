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
      <section className="relative h-[48svh] min-h-[340px] overflow-hidden sm:min-h-[380px]">
        <Image src={image} alt={imageAlt ?? title} fill priority fetchPriority="high" loading="eager" sizes="100vw" quality={84} className="object-cover" />
        <div className="absolute inset-0 photo-scrim-bottom" />
        <div className="storefront-container relative flex h-full items-end pb-8 text-[var(--paper)] sm:pb-10">
          <div className="max-w-2xl">
            <p className="eyebrow eyebrow-light">{eyebrow}</p>
            <h1 className="display-xl mt-4 text-[var(--paper)]">{title}</h1>
            {description ? <p className="storefront-body-copy mt-3 max-w-xl text-[var(--paper)]/85">{description}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mb-7 max-w-3xl sm:mb-9">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display-lg mt-4">{title}</h1>
      {description ? <p className="storefront-body-copy mt-3 max-w-2xl text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}
