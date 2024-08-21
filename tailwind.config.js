/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        custom: "0 0 60px #ededea",
      },
      backgroundImage: {
        "bg-custom-gradient":
          "linear-gradient(150deg, #1b1b16 1.28%, #565646 90.75%)",
      },
    },
    plugins: [],
  },
};
