/** Expected MoCA naming targets (left → right on reference image). */
export const MOCA_NAMING_ANIMALS = ["lion", "rhino", "camel"] as const;

export type MocaNamingAnimal = (typeof MOCA_NAMING_ANIMALS)[number];

export function detectNamedAnimals(transcript: string): MocaNamingAnimal[] {
  const t = transcript.toLowerCase();
  const found: MocaNamingAnimal[] = [];
  if (/\blions?\b/.test(t)) found.push("lion");
  if (/\b(rhinos?|rhinoceros(es)?)\b/.test(t)) found.push("rhino");
  if (/\b(camels?|dromedar(y|ies))\b/.test(t)) found.push("camel");
  return found;
}
