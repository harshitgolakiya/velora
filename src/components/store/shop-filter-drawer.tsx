"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function ShopFilterDrawer({
  open,
  onOpenChange,
  matchCount,
  chips,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchCount: number;
  chips?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content className="storefront-drawer-right storefront-panel fixed inset-y-0 end-0 z-[110] flex w-full max-w-xl flex-col bg-[var(--surface)] text-[var(--foreground)] lg:max-w-md">
          <Dialog.Title className="sr-only">Filter and sort products</Dialog.Title>
          <Dialog.Description className="sr-only">
            Refine the product grid by sort order, category, size, color, collection, style, gender, and material.
          </Dialog.Description>
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/40 px-5 py-4 backdrop-blur">
            <div>
              <p className="font-semibold">Filter & sort</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{matchCount} matching {matchCount === 1 ? "product" : "products"}</p>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close filters" className="storefront-action storefront-icon-button grid size-10 place-items-center border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--foreground)]">
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          {chips}
          <div className="flex-1 overflow-y-auto">{children}</div>
          <div className="border-t border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_-12px_30px_var(--shadow)]">
            <Dialog.Close asChild>
              <button type="button" className="storefront-action h-12 w-full bg-[var(--accent)] text-sm font-semibold uppercase tracking-[0.14em] text-[#17262D] hover:brightness-95">
                View {matchCount} {matchCount === 1 ? "product" : "products"}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
