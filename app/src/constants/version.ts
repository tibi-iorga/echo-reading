// Single source of truth: reads version from package.json at build time
// Vite statically replaces this import during build
import packageJson from '../../package.json'

export const VERSION = packageJson.version
