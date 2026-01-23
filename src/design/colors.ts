import tailwindColors from "tailwindcss/colors";

// ⚠️⚠️⚠️ REMINDER ⚠️⚠️⚠️
// Whenever you use a Tailwind default color in the app, add it here to facilitate future
// find & replace.
export const colors = {
  "stone-200": tailwindColors.stone[200], // Borders in settings
  "slate-500": tailwindColors.slate[500], // Secondary text in light mode, settings borders
  "slate-600": tailwindColors.slate[600], // Settings stepper border in dark mode
  "slate-700": tailwindColors.slate[700], // Settings bg border in dark mode
  "slate-800": tailwindColors.slate[800], // Primary text in light mode
  "slate-900": tailwindColors.slate[900], // Dark background
  "stone-100": tailwindColors.stone[100], // Light background
  "blue-400": tailwindColors.blue[400], // Android settings tint
  "blue-500": tailwindColors.blue[500], // iOS settings tint
  pastel: {
    orange: "#4a5568", // Home screen planet - deep steel blue
    gray: "#5a6c7d", // Home screen planet - muted steel blue
    green: "#3d4a5c", // Home screen planet - dark slate blue
    "orange-light": "#5a6c7d", // Home screen button - steel blue
    "gray-light": "#6b7d8e", // Home screen button - lighter steel blue
  },
};
