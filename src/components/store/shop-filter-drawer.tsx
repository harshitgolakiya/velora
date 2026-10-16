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
  const noun = matchCount === 1 ? "product" : "products";
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="storefront-overlay fixed inset-0 z-[110] bg-[var(--scrim)] backdrop-blur-sm" />
        <Dialog.Content className="storefront-drawer-right storefront-panel fixed inset-y-0 end-0 z-[110] flex w-full max-w-xl flex-col bg-[var(--surface)] text-[var(--foreground)] lg:max-w-md">
          <Dialog.Title className="sr-only">Filter and sort products</Dialog.Title>
          <Dialog.Description className="sr-only">Refine the product grid by sort order, category, size, color, collection, style, gender, and material.</Dialog.Description>
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="display-md">Filter & sort</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{matchCount} matching {noun}</p>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close filters" className="btn btn-soft btn-icon btn-sm btn-round">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          {chips}
          <div className="flex-1 overflow-y-auto">{children}</div>
          <div className="border-t border-[var(--border)] bg-[var(--surface)] p-5">
            <Dialog.Close asChild>
              <button type="button" className="btn btn-primary btn-block">
                View {matchCount} {noun}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
