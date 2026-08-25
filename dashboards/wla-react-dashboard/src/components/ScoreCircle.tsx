import { Box, Flex, Text } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";

/**
 * Circular gauge showing a normalized score (0..1 by default). Rendered on the
 * paper panels, so track/progress colors default to values that read on cream.
 */
export function ScoreCircle({
  score = 0.87,
  max = 1.0,
  size = 80,
  trackColor = "rgba(27, 47, 40, 0.12)",
  progressColor = "var(--gold)",
  textColor = "var(--text-on-paper)",
}: {
  score?: number;
  max?: number;
  size?: number;
  trackColor?: string;
  progressColor?: string;
  textColor?: string;
}) {
  const value = Math.max(0, Math.min(score, max));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = value / max;
  const offset = circumference * (1 - progress);

  return (
    <Flex justify="center">
      <Box style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <Flex
          direction="column"
          align="center"
          justify="center"
          style={{ position: "absolute", inset: 0 }}
        >
          <Text size="4" weight="medium" style={{ lineHeight: 1, color: textColor, fontFamily: "'JetBrains Mono', monospace" }}>
            {value.toFixed(2)}
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
}
