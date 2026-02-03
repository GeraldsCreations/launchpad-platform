/**
 * Reown AppKit Configuration
 *
 * To get a project ID:
 * 1. Go to https://cloud.reown.com
 * 2. Create a new project
 * 3. Copy the Project ID
 * 4. Replace 'YOUR_REOWN_PROJECT_ID' below
 */

export const REOWN_PROJECT_ID = 'ff9fa0efdc94bc398850632c21195957';

/**
 * For development, you can use this public demo project ID:
 * (Don't use in production!)
 */
export const REOWN_DEMO_PROJECT_ID = 'ff9fa0efdc94bc398850632c21195957';

/**
 * App metadata for wallet connection
 */
export const APP_METADATA = {
  name: 'Pump Bots LaunchPad',
  description: 'AI-powered token launch platform on Solana',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:4200',
  icons: ['https://openclaw.ai/favicon.ico'],
};
