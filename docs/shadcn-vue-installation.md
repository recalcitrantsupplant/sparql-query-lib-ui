# Installing shadcn-vue in Nuxt

This document outlines the steps to install and configure `shadcn-vue` in a Nuxt project, based on the provided instructions.

## Prerequisites

- A Nuxt project created using `pnpm create nuxt@latest`.
- If you encounter `ERROR: Cannot read properties of undefined (reading 'sys')`, install TypeScript:
  ```bash
  pnpm add -D typescript
  ```

## 1. Add Tailwind CSS

Install Tailwind CSS dependencies:
```bash
pnpm add tailwindcss @tailwindcss/vite
```

Replace the content of `assets/css/tailwind.css` with:
```css
@import "tailwindcss";
```

Update `nuxt.config.ts`:
```typescript
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // ...
  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  // ...
})
```

## 2. Add Nuxt Module (`shadcn-nuxt`)

Install the `shadcn-nuxt` module:
```bash
pnpm dlx nuxi@latest module add shadcn-nuxt
```

Configure `shadcn-nuxt` in `nuxt.config.ts`:
```typescript
export default defineNuxtConfig({
  // ...
  modules: ['shadcn-nuxt'],
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui'
  }
  // ...
})
```

## 3. Run Nuxt Prepare

Generate the `.nuxt` folder:
```bash
pnpm dlx nuxi prepare
```

## 4. Initialize shadcn-vue

Run the `shadcn-vue` init command:
```bash
pnpm dlx shadcn-vue@latest init
```
Follow the prompts (e.g., select base color). This creates `components.json`.

## 5. Add Components

Add components as needed, for example, the Button component:
```bash
pnpm dlx shadcn-vue@latest add button
```

Nuxt's auto-import will handle component registration. You can use them directly in your templates:
```vue
<template>
  <div>
    <Button>Click me</Button>
  </div>
</template>
