# MoCA E2E (iOS + AWS) — implementation notes

## Scope (v1)

MoCA 8.1 **without** orientation, education +1, or full MIS cuing. Thirteen paginated sections in `MOCA_SECTIONS` (`src/constants/forms/moca.ts`).

**Placement:** 7th instrument in Long Assessment (`moca_v1` in `LONG_FORM_IDS`). Standalone Weekly prototype removed.

**Submit:** Single `POST /form-responses` at end via `MocaFormRunner` — not per section.

## Speech recognition

- Package: **`expo-speech-recognition`** (not `@react-native-voice/voice`).
- Config: `app.json` plugin + `NSMicrophoneUsageDescription` / `NSSpeechRecognitionUsageDescription`.
- Implementation: `src/lib/moca-speech-recognition.ts` — native on iOS/Android, Web Speech API on web dev.
- Shared helpers: `detectNamedAnimals`, `detectMemoryWords`, `normalizeSpokenDigits`.

Rebuild dev client after plugin changes: `npx expo prebuild` / `expo run:ios`.

## Scoring (on-device, max 21)

| Section | Key | Max |
|---------|-----|-----|
| Trail | `visuospatial_trail.score` | 1 |
| Cube / clock | strokes only — **no score fields** | — |
| Naming | `naming.score` | 3 |
| Memory trials | stored; score 0 | 0 |
| Digit forward / backward | `digit_span.*.score` | 1 each |
| Vigilance, serial7, language, fluency, abstraction | existing captures | 1–3 |
| Delayed recall | word count 0–5 | 5 |

`computeMocaTotalScore()` + `clampAutomatedMocaScore()` in `src/lib/moca-scoring.ts`. Payload includes `total_score` and `max_automated_score: 21`.

## Payload + validation

- Builder: `src/lib/build-moca-submit-payload.ts`
- Validator: `src/lib/validate-moca-submit-payload.ts` — throws `MocaSubmitValidationError` if any required capture missing.

## Long Assessment wiring

- `app/(app)/forms/long-assessment.tsx` renders `MocaFormRunner` when `activeFormId === "moca_v1"`.
- `getFormById("moca_v1")` returns metadata from `MOCA_FORM`.
- Legacy `/forms/moca` redirects to Long Assessment.

## Tests

```bash
npm run test:moca
npm run test:long-assessment
```

## Manual iOS checklist

1. Long Assessment day 30/60 → section 7 MoCA.
2. Complete all 13 sections (memory delay + delayed recall).
3. Submit → verify `GET /form-responses?form_id=moca_v1` returns row with transcripts + strokes.
4. Confirm microphone/speech permission prompts on naming, memory, digit span, language, fluency.

## Out of scope (v1)

Orientation, education bonus, MIS cuing, cube/clock auto-scoring, trail line-crossing, doctor replay UI.
