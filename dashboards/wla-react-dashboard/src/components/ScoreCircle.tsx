import { Box, Flex, Text, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";

export function ScoreCircle({ score = 0.87, max = 1.0, size = 80, label = "Score", color = "green" }) {
  const value = Math.max(0, Math.min(score, max));
  const stroke = 12;
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
            stroke="var(--gray-a5)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`var(--${color}-9)`}
            strokeWidth={stroke}
            strokeLinecap="square"
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
          <Text size="4" weight="medium" style={{ lineHeight: 1 }}>
            {value.toFixed(2)}
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
}