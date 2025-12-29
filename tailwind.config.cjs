/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        "marquee-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
      },
      animation: {
        marquee: "marquee-scroll 60s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
