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
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,6,8,.66),rgba(5,6,8,.2)_58%,rgba(5,6,8,.08))]" />
        <div className="storefront-container relative flex h-full items-end pb-8 text-white sm:pb-10">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-xs">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-medium leading-[1.02] sm:text-6xl">{title}</h1>
            {description ? <p className="storefront-body-copy mt-3 max-w-xl text-stone-100">{description}</p> : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mb-7 max-w-3xl sm:mb-9">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-medium leading-[1.04] sm:text-5xl lg:text-[56px]">{title}</h1>
      {description ? <p className="storefront-body-copy mt-3 max-w-2xl text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}
