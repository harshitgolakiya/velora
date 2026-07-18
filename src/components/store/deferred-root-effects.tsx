"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Analytics = dynamic(() => import("@/components/store/analytics").then((mod) => mod.Analytics), {
  ssr: false,
});
const GlobalRouteProgress = dynamic(
  () => import("@/components/global-route-progress").then((mod) => mod.GlobalRouteProgress),
  { ssr: false },
);

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function useIdleReady(timeoutMs = 1800) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    const show = () => setReady(true);
    const usingIdleCallback = Boolean(idleWindow.requestIdleCallback);
    const handle = usingIdleCallback
      ? idleWindow.requestIdleCallback(show, { timeout: timeoutMs })
      : window.setTimeout(show, Math.min(timeoutMs, 1000));

    return () => {
      if (usingIdleCallback && idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [timeoutMs]);

  return ready;
}

export function DeferredRootEffects() {
  const ready = useIdleReady();
  return ready ? (
    <>
      <Analytics />
      <GlobalRouteProgress />
    </>
  ) : null;
}
