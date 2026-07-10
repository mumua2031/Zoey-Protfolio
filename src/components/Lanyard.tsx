import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Vector3Tuple = [number, number, number];

type LanyardProps = {
  position?: Vector3Tuple;
  gravity?: Vector3Tuple;
  frontImage?: string;
  backImage?: string;
  imageFit?: "cover" | "contain";
  lanyardImage?: string;
  lanyardWidth?: number;
};

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
const entranceSpring = {
  type: "spring" as const,
  stiffness: 155,
  damping: 8.5,
  mass: 0.96,
  delay: 0.12,
};

export default function Lanyard({
  frontImage,
  backImage,
  imageFit = "cover",
  lanyardImage,
  lanyardWidth = 1,
}: LanyardProps) {
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const softX = useSpring(dragX, { stiffness: 190, damping: 18, mass: 0.72 });
  const softY = useSpring(dragY, { stiffness: 190, damping: 18, mass: 0.72 });
  const bandScaleY = useTransform(softY, [-90, 0, 120], [0.9, 1, 1.18]);
  const bandRotate = useTransform(softX, [-120, 0, 120], [-7, 0, 7]);
  const ringX = useTransform(softX, [-120, 0, 120], [-12, 0, 12]);
  const ringY = useTransform(softY, [-90, 0, 120], [-8, 0, 16]);
  const cardRotate = useTransform(softX, [-130, 0, 130], [-5, 0, 5]);
  const cardRotateX = useTransform(softY, [-120, 0, 120], [7, 0, -8]);
  const cardRotateY = useTransform(softX, [-150, 0, 150], [-11, 0, 11]);
  const clipRotate = useTransform(softX, [-120, 0, 120], [-5, 0, 5]);
  const cordPath = useTransform([softX, softY], ([latestX, latestY]) => {
    const x = Number(latestX);
    const y = Number(latestY);
    const pull = Math.max(-36, Math.min(42, y * 0.22));
    const sway = Math.max(-34, Math.min(34, x * 0.18));

    return [
      "M 84 8",
      `C ${82 + sway * 0.22} ${74 + pull * 0.3}, ${112 + sway * 0.5} ${123 + pull}, ${150 + sway * 0.24} ${138 + pull}`,
      `C ${188 + sway * 0.5} ${123 + pull}, ${218 + sway * 0.22} ${74 + pull * 0.3}, 216 8`,
    ].join(" ");
  });
  const cardShadow = useTransform(softY, [-80, 0, 120], [
    "0 20px 34px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.72)",
    "0 28px 48px rgba(0, 0, 0, 0.13), inset 0 0 0 1px rgba(255, 255, 255, 0.72)",
    "0 36px 60px rgba(0, 0, 0, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.72)",
  ]);
  const bandWidth = `${64 * Math.min(Math.max(lanyardWidth, 0.58), 1.25)}%`;
  const cordStroke = 13 * Math.min(Math.max(lanyardWidth, 0.72), 1.35);

  return (
    <div className="lanyard-stage" aria-label="Zoey profile card">
      <motion.div
        className="lanyard-rig"
        initial={{ opacity: 0, x: -24, y: -150, scale: 0.52, rotate: -18 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        drag
        dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
        dragElastic={0.42}
        dragTransition={{ bounceStiffness: 440, bounceDamping: 22 }}
        onDrag={(_, info) => {
          dragX.set(info.offset.x);
          dragY.set(info.offset.y);
        }}
        onDragEnd={() => {
          dragX.set(0);
          dragY.set(0);
        }}
        whileHover={{ y: -5, rotate: -0.6, transition: spring }}
        whileDrag={{ scale: 1.02, rotate: 1.4, transition: spring }}
        transition={entranceSpring}
      >
        <svg className="lanyard-cord" viewBox="0 0 300 230" aria-hidden="true">
          <motion.path className="lanyard-cord-shadow" d={cordPath} strokeWidth={cordStroke + 3} />
          <motion.path
            className="lanyard-cord-main"
            d={cordPath}
            strokeWidth={cordStroke}
            style={{ rotate: bandRotate, scaleY: bandScaleY }}
          />
          <motion.path className="lanyard-cord-highlight" d={cordPath} strokeWidth={Math.max(2, cordStroke * 0.18)} />
        </svg>
        {lanyardImage ? (
          <div className="lanyard-band-frame" style={{ width: bandWidth }}>
            <motion.div
              className="lanyard-band"
              style={{
                scaleY: bandScaleY,
                rotate: bandRotate,
                backgroundImage: `url(${lanyardImage})`,
              }}
            />
          </div>
        ) : null}
        <div className="lanyard-ring-frame">
          <motion.div className="lanyard-ring" style={{ x: ringX, y: ringY }} />
        </div>
        <motion.div className="lanyard-clip" style={{ x: ringX, y: ringY, rotate: clipRotate }} />
        <div className="lanyard-card-frame">
          <motion.div
            className="lanyard-card"
            style={{ rotate: cardRotate, rotateX: cardRotateX, rotateY: cardRotateY, boxShadow: cardShadow }}
          >
            <div className="lanyard-card-face">
              {frontImage ? (
                <img
                  src={frontImage}
                  alt="Zoey portrait"
                  draggable={false}
                  style={{ objectFit: imageFit }}
                />
              ) : null}
            </div>
            {backImage ? (
              <div className="lanyard-card-face lanyard-card-back">
                <img
                  src={backImage}
                  alt="Zoey profile card back"
                  draggable={false}
                  style={{ objectFit: imageFit }}
                />
              </div>
            ) : null}
            <span className="lanyard-card-shine" aria-hidden="true" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
