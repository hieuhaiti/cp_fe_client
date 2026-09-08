import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function TruncatedTextWithTooltip({
  // eslint-disable-next-line no-unused-vars
  as: Component = "span",
  text,
  children,
  className,
  ...props
}) {
  const textRef = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const updateTruncateState = () => {
      const element = textRef.current;
      if (!element) return;

      const nextState =
        element.scrollWidth > element.clientWidth ||
        element.scrollHeight > element.clientHeight;

      setIsTruncated(nextState);
    };

    updateTruncateState();
    const rafId = window.requestAnimationFrame(updateTruncateState);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined" && textRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateTruncateState();
      });
      resizeObserver.observe(textRef.current);
    }

    window.addEventListener("resize", updateTruncateState);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("resize", updateTruncateState);
    };
  }, [text, children]);

  const content = (
    <Component
      ref={textRef}
      className={cn("line-clamp-1", className)}
      {...props}
    >
      {children ?? text}
    </Component>
  );

  if (!text || !isTruncated) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-80 wrap-break-word">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
