import { requireOptionalNativeModule } from "expo-modules-core";
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
  completedAt: number | null;
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

type NativeSpeechErrorEvent = {
  error: string;
  message?: string;
};

type NativeSpeechResultEvent = {
  isFinal: boolean;
  results: Array<{ transcript?: string }>;
};

type NativeSpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
  }) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    event: "result" | "error" | "end",
    listener: (event: NativeSpeechResultEvent | NativeSpeechErrorEvent) => void,
  ) => { remove: () => void };
};

export type MocaSpeechRecognitionHandle = {
  start: () => void;
  stop: () => void;
  abort: () => void;
};

/** Shown when expo-speech-recognition is not linked into the installed dev client. */
export const MOCA_NATIVE_STT_REBUILD_MESSAGE =
  "Speech recognition needs a native rebuild. On your Mac run: npm run ios:device (then reconnect via tunnel or LAN).";

let nativeSpeechModuleCache: NativeSpeechModule | null | undefined;

function getNativeSpeechModule(): NativeSpeechModule | null {
  if (nativeSpeechModuleCache !== undefined) {
    return nativeSpeechModuleCache;
  }
  if (Platform.OS === "web") {
    nativeSpeechModuleCache = null;
    return null;
  }

  // Do NOT require("expo-speech-recognition") here — that package calls
  // requireNativeModule("ExpoSpeechRecognition") at load time and throws if the
  // dev client was built before the plugin was added. Optional lookup is safe.
  nativeSpeechModuleCache =
    requireOptionalNativeModule<NativeSpeechModule>("ExpoSpeechRecognition");

  if (!nativeSpeechModuleCache && __DEV__) {
    console.warn(
      "[MoCA] Native module ExpoSpeechRecognition is not in this app binary. " +
        "Run npm run ios:device on your Mac (USB) to rebuild the dev client.",
    );
  }

  return nativeSpeechModuleCache;
}

function getWebSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isMocaNativeSpeechModuleLinked(): boolean {
  return getNativeSpeechModule() !== null;
}

export function getMocaSpeechUnavailableMessage(): string {
  if (Platform.OS === "web") {
    return "Speech recognition is not available in this browser. Try Chrome or Edge.";
  }
  if (!isMocaNativeSpeechModuleLinked()) {
    return MOCA_NATIVE_STT_REBUILD_MESSAGE;
  }
  return "Speech recognition is not available on this device.";
}

export function isMocaSpeechRecognitionAvailable(): boolean {
  if (Platform.OS === "web") {
    return getWebSpeechRecognitionCtor() !== null;
  }
  const native = getNativeSpeechModule();
  if (!native) return false;
  try {
    return native.isRecognitionAvailable();
  } catch {
    return false;
  }
}

function mapSpeechError(event: NativeSpeechErrorEvent | { error: string }): string {
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
  const module = getNativeSpeechModule();
  if (!module) return null;

  let available = false;
  try {
    available = module.isRecognitionAvailable();
  } catch {
    return null;
  }
  if (!available) return null;

  let active = false;
  let lastFinal = "";
  const subscriptions = [
    module.addListener("result", (event) => {
      if (!active) return;
      const resultEvent = event as NativeSpeechResultEvent;
      const text = resultEvent.results[0]?.transcript?.trim() ?? "";
      if (!text) return;
      if (resultEvent.isFinal) {
        lastFinal = [lastFinal, text].filter(Boolean).join(" ").trim();
        handlers.onFinalTranscript(text);
        handlers.onInterimTranscript("");
      } else {
        handlers.onInterimTranscript(text);
      }
    }),
    module.addListener("error", (event) => {
      if (!active) return;
      active = false;
      handlers.onError(mapSpeechError(event as NativeSpeechErrorEvent));
    }),
    module.addListener("end", () => {
      if (!active) return;
      active = false;
      handlers.onEnd();
    }),
  ];

  return {
    start: () => {
      void (async () => {
        const permission = await module.requestPermissionsAsync();
        if (!permission.granted) {
          handlers.onError(
            "Microphone or speech recognition permission was denied. Enable it in Settings.",
          );
          return;
        }
        lastFinal = "";
        active = true;
        module.start({
          lang: "en-US",
          interimResults: true,
          continuous: true,
        });
      })();
    },
    stop: () => {
      if (!active) return;
      active = false;
      module.stop();
    },
    abort: () => {
      active = false;
      module.abort();
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
