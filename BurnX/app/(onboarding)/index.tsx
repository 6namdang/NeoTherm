import { Redirect, type Href } from "expo-router";

/** Groups omit from URL; `/profile-creation` is the visible onboarding entry on web. */
export default function OnboardingEntryRedirect() {
  return <Redirect href={"/profile-creation" as Href} />;
}
