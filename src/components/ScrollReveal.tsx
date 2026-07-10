import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ScrollRevealProps = {
  children: ReactNode;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  enableBlur?: boolean;
  baseOpacity?: number;
  baseRotation?: number;
  blurStrength?: number;
  containerClassName?: string;
  textClassName?: string;
  rotationEnd?: string;
  wordAnimationEnd?: string;
  splitMode?: "words" | "characters";
  playOnMount?: boolean;
};

export default function ScrollReveal({
  children,
  scrollContainerRef,
  enableBlur = true,
  baseOpacity = 0.1,
  baseRotation = 3,
  blurStrength = 4,
  containerClassName = "",
  textClassName = "",
  rotationEnd = "bottom bottom",
  wordAnimationEnd = "bottom bottom",
  splitMode = "words",
  playOnMount = false,
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const splitText = useMemo(() => {
    if (typeof children !== "string") {
      return children;
    }

    if (splitMode === "characters") {
      return children.split("\n").map((line, lineIndex) => (
        <span className="scroll-reveal-line" key={`line-${lineIndex}`}>
          {Array.from(line).map((char, charIndex) => (
            <span className="scroll-reveal-word word" key={`${char}-${lineIndex}-${charIndex}`}>
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </span>
      ));
    }

    return children.split(/(\s+)/).map((word, index) => {
      if (word.match(/^\s+$/)) {
        return word;
      }

      return (
        <span className="scroll-reveal-word word" key={`${word}-${index}`}>
          {word}
        </span>
      );
    });
  }, [children, splitMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const scroller = scrollContainerRef?.current ?? window;
    const isCharacterMode = splitMode === "characters";
    const context = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          transformOrigin: "0% 50%",
          rotate: baseRotation,
          y: isCharacterMode ? 24 : 0,
        },
        {
          ease: isCharacterMode ? "power3.out" : "none",
          rotate: 0,
          y: 0,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: "top bottom",
            end: rotationEnd,
            scrub: true,
          },
        },
      );

      const wordElements = el.querySelectorAll(".scroll-reveal-word");

      if (playOnMount && isCharacterMode) {
        gsap.set(el, {
          transformOrigin: "0% 50%",
          rotate: baseRotation,
          y: 34,
        });

        gsap.set(wordElements, {
          opacity: baseOpacity,
          yPercent: 126,
          scaleY: 1.95,
          scaleX: 0.72,
          filter: enableBlur ? `blur(${blurStrength}px)` : "blur(0px)",
          transformOrigin: "50% 74%",
          willChange: "opacity, transform, filter",
        });

        gsap.to(el, {
          duration: 1.05,
          ease: "power4.out",
          rotate: 0,
          y: 0,
          delay: 0.12,
        });

        gsap.to(wordElements, {
          duration: 1.08,
          ease: "power4.out",
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          filter: "blur(0px)",
          stagger: 0.018,
          delay: 0.16,
        });

        return;
      }

      gsap.fromTo(
        wordElements,
        {
          opacity: baseOpacity,
          yPercent: isCharacterMode ? 92 : 0,
          scaleY: isCharacterMode ? 1.72 : 1,
          scaleX: isCharacterMode ? 0.78 : 1,
          filter: enableBlur ? `blur(${blurStrength}px)` : "blur(0px)",
          transformOrigin: "50% 70%",
          willChange: "opacity, transform, filter",
        },
        {
          ease: isCharacterMode ? "power3.out" : "none",
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          filter: "blur(0px)",
          stagger: isCharacterMode ? 0.03 : 0.018,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: isCharacterMode ? "top bottom-=2%" : "top bottom-=12%",
            end: wordAnimationEnd,
            scrub: true,
          },
        },
      );

      if (enableBlur && !isCharacterMode) {
        gsap.fromTo(
          wordElements,
          { filter: `blur(${blurStrength}px)` },
          {
            ease: "none",
            filter: "blur(0px)",
            stagger: 0.018,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: "top bottom-=12%",
              end: wordAnimationEnd,
              scrub: true,
            },
          },
        );
      }
    }, el);

    ScrollTrigger.refresh();

    return () => {
      context.revert();
    };
  }, [
    scrollContainerRef,
    enableBlur,
    baseRotation,
    baseOpacity,
    rotationEnd,
    wordAnimationEnd,
    blurStrength,
    splitMode,
    playOnMount,
  ]);

  return (
    <div ref={containerRef} className={`scroll-reveal ${containerClassName}`.trim()}>
      <p className={`scroll-reveal-text ${textClassName}`.trim()}>{splitText}</p>
    </div>
  );
}

