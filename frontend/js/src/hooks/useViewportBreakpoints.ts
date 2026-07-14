import { useEffect, useState } from "react";

export const HAMBURGER_BREAKPOINT = 992;
export const MOBILE_BREAKPOINT = 500;

export const isHamburger = () => window.innerWidth <= HAMBURGER_BREAKPOINT;
export const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

// it tracks viewport breakpoints.
export default function useViewportBreakpoints() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: width <= MOBILE_BREAKPOINT,
    isHamburger: width <= HAMBURGER_BREAKPOINT,
  };
}
