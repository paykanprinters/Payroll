import { useEffect, useState } from "react";

/**
 * True only until `isLoading` first settles to false. Background refetches (focus refresh,
 * "Refresh data") must not unmount content such as an open report preview.
 */
export function useInitialLoading(isLoading: boolean): boolean {
  const [hasLoaded, setHasLoaded] = useState(!isLoading);

  useEffect(() => {
    if (!isLoading) setHasLoaded(true);
  }, [isLoading]);

  return isLoading && !hasLoaded;
}
