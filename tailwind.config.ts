import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        handwriting: ["var(--font-caveat)", "Caveat", "cursive"],
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        pulse_badge: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-3px)" },
          "40%": { transform: "translateX(3px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
        float_in: {
          "0%": { opacity: "0", transform: "scale(0.8) translateY(10px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        wiggle: "wiggle 0.5s ease-in-out",
        pulse_badge: "pulse_badge 1.5s ease-in-out infinite",
        shake: "shake 0.4s ease-in-out",
        float_in: "float_in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
