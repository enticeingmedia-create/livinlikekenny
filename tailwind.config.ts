import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        lagoon: "#02B8CF",
        reef: "#0A6C73",
        hibiscus: "#F23A73",
        sunset: "#FFCA18",
        mango: "#FF8A2A",
        cream: "#FFF2CF",
        driftwood: "#4B3323",
        night: "#07191F",
        navy: "#102027"
      },
      boxShadow: {
        tiki: "0 24px 80px rgba(2, 184, 207, .18)",
        glow: "0 0 45px rgba(255, 202, 24, .28)",
        hibiscus: "0 12px 35px rgba(242, 58, 115, .3)"
      },
      fontFamily: {
        display: ["var(--font-display)", "Trebuchet MS", "ui-rounded", "system-ui"],
        body: ["var(--font-body)", "Inter", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
