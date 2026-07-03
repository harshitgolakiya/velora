export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="pointer-events-none fixed inset-x-0 top-16 z-30 h-0.5 overflow-hidden bg-[var(--border)]/40 md:top-[104px]"
    >
      <div className="h-full w-1/3 origin-left bg-[var(--accent)] [animation:loading-bar-sweep_1.1s_ease-in-out_infinite]" />
    </div>
  );
}
