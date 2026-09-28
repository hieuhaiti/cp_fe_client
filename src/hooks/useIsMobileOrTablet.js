import { useCallback, useSyncExternalStore } from "react";

/**
 * Checks if the current environment is a mobile or tablet/iPad device.
 * Covers:
 * - Screens with width <= 1024px (mobile phones and portrait iPads/tablets)
 * - iPadOS devices (including iPad Pro in landscape up to 1366px)
 * - Android tablets and other touch-only coarse pointer devices up to 1366px
 * - Excludes Windows desktop/laptops with touchscreens
 *
 * @returns {boolean}
 */
export function checkIsMobileOrTablet() {
  if (typeof window === "undefined") return false;

  // Viewport width <= 1024px is always considered mobile / iPad breakpoint
  if (window.innerWidth <= 1024) {
    return true;
  }

  const ua = navigator.userAgent || "";
  const isIpadOS =
    /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);
  const isMobileOrTabletUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(
      ua,
    );

  // iPad or mobile/tablet UA in landscape orientation (up to iPad Pro 12.9" landscape 1366px)
  if ((isIpadOS || isMobileOrTabletUA) && window.innerWidth <= 1366) {
    return true;
  }

  // Coarse touch pointer without fine hover (e.g. tablet device) up to 1366px
  if (
    window.matchMedia("(pointer: coarse) and (hover: none)").matches &&
    window.innerWidth <= 1366 &&
    !/Windows/i.test(ua)
  ) {
    return true;
  }

  return false;
}

/**
 * React hook to reactively determine if the device is a mobile phone or iPad/tablet.
 * Automatically updates on resize, orientation change, or media query change.
 *
 * @returns {boolean}
 */
export function useIsMobileOrTablet() {
  const subscribe = useCallback((onStoreChange) => {
    if (typeof window === "undefined") {
      return () => {};
    }

    const mql1024 = window.matchMedia("(max-width: 1024px)");
    const mql1366 = window.matchMedia("(max-width: 1366px)");

    mql1024.addEventListener("change", onStoreChange);
    mql1366.addEventListener("change", onStoreChange);
    window.addEventListener("resize", onStoreChange);
    window.addEventListener("orientationchange", onStoreChange);

    return () => {
      mql1024.removeEventListener("change", onStoreChange);
      mql1366.removeEventListener("change", onStoreChange);
      window.removeEventListener("resize", onStoreChange);
      window.removeEventListener("orientationchange", onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => checkIsMobileOrTablet(), []);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
