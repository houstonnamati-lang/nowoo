/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        "nowoo-serif-medium": ["Lora-Medium"],
        "nowoo-serif-semibold": ["Lora-SemiBold"],
        "nowoo-regular": ["GeneralSans-Regular"],
        "nowoo-medium": ["GeneralSans-Medium"],
        "nowoo-bold": ["GeneralSans-Bold"],
        "nowoo-mono": ["HelveticaNeue-Light"], // iOS default, Android will need Platform check in code
      },
      borderWidth: {
        hairline: 0.5, // Hairline width
      },
      spacing: {
        hairline: 0.5,
      },
    },
  },
  plugins: [],
};
