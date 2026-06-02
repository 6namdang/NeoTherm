import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionResultEvent,
} from "expo-speech-recognition";
import { Platform } from "react-native";

import type { MocaNamingAnimal } from "./moca-naming-detection";
export {
  detectNamedAnimals,
  MOCA_NAMING_ANIMALS,
  type MocaNamingAnimal,
} from "./moca-naming-detection";
export { normalizeSpokenDigits } from "./moca-digit-normalization";

export type MocaNamingCapture = {
  transcript: string;
  detectedAnimals: MocaNamingAnimal[];
  score: 0 | 1 | 2 | 3;
};

type SpeechRecognitionCtor = new () => WebSpeechRecognitionInstance;

type WebSpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: WebSpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type WebSpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

export type MocaSpeechRecognitionHandle = {
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getWebSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isMocaSpeechRecognitionAvailable(): boolean {
  if (Platform.OS === "web") {
    return getWebSpeechRecognitionCtor() !== null;
  }
  return ExpoSpeechRecognitionModule.isRecognitionAvailable();
}

function mapSpeechError(event: ExpoSpeechRecognitionErrorEvent | { error: string }): string {
  const code = "error" in event ? event.error : "";
  if (code === "not-allowed" || code === "permission_denied") {
    return "Microphone or speech recognition access was blocked. Enable permissions in Settings.";
  }
  if (code === "no-speech") {
    return "No speech was detected. Try again.";
  }
  if ("message" in event && typeof event.message === "string" && event.message.trim()) {
    return event.message.trim();
  }
  return `Speech recognition error: ${code || "unknown"}`;
}

function createNativeSpeechRecognition(handlers: {
  onFinalTranscript: (text: string) => void;
  onInterimTranscript: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): MocaSpeechRecognitionHandle | null {
  if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return null;

  let active = false;
  let lastFinal = "";
  const subscriptions = [
    ExpoSpeechRecognitionModule.addListener("result", (event: ExpoSpeechRecognitionResultEvent) => {
      if (!active) return;
      const text = event.results[0]?.transcript?.trim() ?? "";
      if (!text) return;
      if (event.isFinal) {
        lastFinal = [lastFinal, text].filter(Boolean).join(" ").trim();
        handlers.onFinalTranscript(text);
        handlers.onInterimTranscript("");
      } else {
        handlers.onInterimTranscript(text);
      }
    }),
    ExpoSpeechRecognitionModule.addListener("error", (event: ExpoSpeechRecognitionErrorEvent) => {
      if (!active) return;
      active = false;
      handlers.onError(mapSpeechError(event));
    }),
    ExpoSpeechRecognitionModule.addListener("end", () => {
      if (!active) return;
      active = false;
      handlers.onEnd();
    }),
  ];

  return {
    start: () => {
      void (async () => {
        const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!permission.granted) {
          handlers.onError(
            "Microphone or speech recognition permission was denied. Enable it in Settings.",
          );
          return;
        }
        lastFinal = "";
        active = true;
        ExpoSpeechRecognitionModule.start({
          lang: "en-US",
          interimResults: true,
          continuous: true,
        });
      })();
    },
    stop: () => {
      if (!active) return;
      active = false;
      ExpoSpeechRecognitionModule.stop();
    },
    abort: () => {
      active = false;
      ExpoSpeechRecognitionModule.abort();
      subscriptions.forEach((sub) => sub.remove());
    },
  };
}

function createWebSpeechRecognition(handlers: {
  onFinalTranscript: (text: string) => void;
  onInterimTranscript: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): MocaSpeechRecognitionHandle | null {
  const Ctor = getWebSpeechRecognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    let interim = "";
    let finalChunk = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) continue;
      const piece = result[0]?.transcript ?? "";
      if (result.isFinal) finalChunk += piece;
      else interim += piece;
    }
    if (finalChunk.trim()) handlers.onFinalTranscript(finalChunk.trim());
    handlers.onInterimTranscript(interim.trim());
  };

  recognition.onerror = (event) => {
    handlers.onError(mapSpeechError(event));
  };

  recognition.onend = handlers.onEnd;

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
}

export function createMocaSpeechRecognition(handlers: {
  onFinalTranscript: (text: string) => void;
  onInterimTranscript: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): MocaSpeechRecognitionHandle | null {
  if (Platform.OS === "web") {
    return createWebSpeechRecognition(handlers);
  }
  return createNativeSpeechRecognition(handlers);
}
