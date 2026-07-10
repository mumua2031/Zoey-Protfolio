import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ScrollFloatProps = {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  containerClassName?: string;
  textClassName?: string;
  animationDuration?: number;
  ease?: string;
  scrollStart?: string;
  scrollEnd?: string;
  stagger?: number;
};

export default function ScrollFloat({
  children,
  scrollContainerRef,
  containerClassName = "",
  textClassName = "",
  animationDuration = 0.82,
  ease = "power3.out",
  scrollStart = "top bottom-=8%",
  scrollEnd = "center center+=8%",
  stagger = 0.012,
}: ScrollFloatProps) {
  const containerRef = useRef<HTMLHeadingElement | null>(null);

  const splitText = useMemo(() => {
    const text = typeof children === "string" ? children : "";
    return text.split("").map((char, index) => {
      if (char === "\n") {
        return <br key={`br-${index}`} />;
      }

      return (
        <span className="char" key={`${char}-${index}`}>
          {char === " " ? "\u00A0" : char}
        </span>
      );
    });
  }, [children]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const chars = element.querySelectorAll(".char");
    const scroller = scrollContainerRef?.current ?? undefined;
    const tween = gsap.fromTo(
      chars,
      {
        willChange: "opacity, transform",
        opacity: 0,
        yPercent: 88,
        scaleY: 1.65,
        scaleX: 0.82,
        filter: "blur(8px)",
        transformOrigin: "50% 0%",
      },
      {
        duration: animationDuration,
        ease,
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        filter: "blur(0px)",
        stagger,
        scrollTrigger: {
          trigger: element,
          scroller,
          start: scrollStart,
          end: scrollEnd,
          scrub: true,
        },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [animationDuration, ease, scrollContainerRef, scrollEnd, scrollStart, stagger]);

  return (
    <h2 ref={containerRef} className={`scroll-float ${containerClassName}`.trim()}>
      <span className={`scroll-float-text ${textClassName}`.trim()}>{splitText}</span>
    </h2>
  );
}
