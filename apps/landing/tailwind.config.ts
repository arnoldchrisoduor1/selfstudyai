import type { Config } from "tailwindcss";
import preset from "@self-study/ui/tailwind.preset";

const config: Config = {
  presets: [preset],
  content: ["./src/**/*.{js,ts,jsx,tsx}", "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"],
  plugins: [],
};

export default config;
