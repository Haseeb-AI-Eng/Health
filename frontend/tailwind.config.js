/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#f4f7f9', // Light grayish-blue
        'surface': '#ffffff',    // White for cards/containers
        'primary': '#3b82f6',     // Blue-500
        'foreground': '#1f2937', // Gray-800 for text
        'muted': '#f3f4f6',       // Gray-100 for inputs/subtle backgrounds
        'border-color': '#e5e7eb', // Gray-200 for borders
        'brand-safe': '#10B981', // Green-500
        'brand-caution': '#F59E0B', // Amber-500
        'brand-unsafe': '#EF4444', // Red-500
      }
    },
  },
  plugins: [],
}