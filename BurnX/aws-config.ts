export const COGNITO = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_gdiYxaTc2',
  clientId: '5tb860a7rhens24kh4jhiedc6t',
} as const;

const DEFAULT_API_BASE =
  "https://u2up4r3y5d.execute-api.us-east-1.amazonaws.com";

/** Inlined by Expo/Babel; use http://127.0.0.1:8787 during local web + `npm run proxy:api` (see script). */
const fromEnv =
  typeof process !== "undefined" &&
  typeof process.env?.EXPO_PUBLIC_API_BASE_URL === "string"
    ? process.env.EXPO_PUBLIC_API_BASE_URL.trim()
    : "";

export const API_BASE_URL = (
  fromEnv.length > 0 ? fromEnv : DEFAULT_API_BASE
).replace(/\/$/, "");
