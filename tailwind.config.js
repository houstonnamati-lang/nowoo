/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        "breathly-serif-medium": ["Lora-Medium"],
        "breathly-serif-semibold": ["Lora-SemiBold"],
        "breathly-regular": ["GeneralSans-Regular"],
        "breathly-medium": ["GeneralSans-Medium"],
        "breathly-bold": ["GeneralSans-Bold"],
        "breathly-mono": ["HelveticaNeue-Light"], // iOS default, Android will need Platform check in code
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
