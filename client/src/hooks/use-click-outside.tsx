import * as React from "react";

type AnyEvent = MouseEvent | TouchEvent;

export function useClickOutside(
  refs: Array<React.RefObject<HTMLElement | null>>,
  onOutside: () => void,
  enabled = true,
) {
  const refsRef = React.useRef(refs);
  const onOutsideRef = React.useRef(onOutside);

  React.useEffect(() => {
    refsRef.current = refs;
  }, [refs]);

  React.useEffect(() => {
    onOutsideRef.current = onOutside;
  }, [onOutside]);

  React.useEffect(() => {
    if (!enabled) return;

    function onEvent(event: AnyEvent) {
      const targetNode = event.target;
      if (!(targetNode instanceof Node)) return;

      const clickedInsideAny = refsRef.current.some((ref) => {
        const element = ref.current;
        return element ? element.contains(targetNode) : false;
      });

      if (!clickedInsideAny) onOutsideRef.current();
    }

    document.addEventListener("mousedown", onEvent);
    document.addEventListener("touchstart", onEvent);
    return () => {
      document.removeEventListener("mousedown", onEvent);
      document.removeEventListener("touchstart", onEvent);
    };
  }, [enabled, onOutside, refs]);
}
