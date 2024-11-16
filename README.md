# My React Tailwind Project

This project is a modern web application built with React, Vite, Tailwind CSS, and Lucide React icons. It's designed for efficient development and seamless deployment to GitHub Pages.

## Features

- **React**: A powerful library for building dynamic user interfaces
- **Vite**: Next-generation frontend tooling for fast development and optimized builds
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development
- **Lucide React**: A collection of beautifully crafted, customizable icons
- **TypeScript**: A typed superset of JavaScript for enhanced code quality and maintainability
- **GitHub Actions**: Automated workflows for continuous integration and deployment to GitHub Pages

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 14 or later)
- npm (usually comes with Node.js)
- Git

## Getting Started
0. Start from an empty directory:
   ```bash
   npm create vite@latest react-tailwind-boilerplate -- --template react-ts
   cd react-tailwind-boilerplate
   ```

1. or Clone the repository:
   ```bash
   git clone https://github.com/yourusername/react-tailwind-boilerplate.git
   cd react-tailwind-boilerplate
   ```

2. Install dependencies:
   ```bash
   npm install
   npm install -D tailwindcss postcss autoprefixer
   npm install lucide-react gh-pages
   npx tailwindcss init -p
   ```
   This script will install all necessary npm packages and set up the project.

3. Start the development server:
   ```bash
   npm run dev
   ```
   This will start the Vite development server with hot module replacement.

4. Open your browser and visit `http://localhost:5173` to see the app in action.

## Development Workflow

- Edit files in the `src` directory to modify the application.
- Changes will be reflected in real-time thanks to Vite's hot module replacement.
- Use Tailwind CSS classes to style your components efficiently.
- Leverage Lucide React icons for consistent and customizable iconography.

## Building for Production

When you're ready to create a production build, follow these steps:

1. Run the build script:
   ```bash
   npm run build
   ```

2. The optimized production files will be generated in the `dist` directory.

## Deploying to GitHub Pages

To deploy your app to GitHub Pages:

1. Ensure your repository is configured for GitHub Pages (Settings > Pages).
2. Run the deploy script:
   ```bash
   npm run deploy
   ```

This script will:
- Build the app for production
- Push the contents of the `dist` directory to the `gh-pages` branch
- Update your GitHub Pages site with the latest version of your app

## Customization

- **Main Component**: Edit `src/App.tsx` to modify the root component of your application.
- **Styling**: Update `tailwind.config.js` to customize your Tailwind CSS setup. Refer to the [Tailwind documentation](https://tailwindcss.com/docs/configuration) for more details.
- **Build Configuration**: Modify `vite.config.ts` to adjust your Vite configuration, such as plugins or build options. See the [Vite documentation](https://vitejs.dev/config/) for available options.

## Project Structure

- `src/`: Contains the source code of the application.
  - `assets/`: Static assets like images, fonts, etc.
  - `components/`: Reusable UI components.
  - `pages/`: Application pages.
  - `App.tsx`: The root component.
  - `main.tsx`: Entry point of the application.
- `public/`: Static assets that are copied to the build output.
- `tailwind.config.js`: Tailwind CSS configuration.
- `vite.config.ts`: Vite configuration.
- `package.json`: Project dependencies and scripts.
- `tsconfig.json`: TypeScript configuration.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE). 



