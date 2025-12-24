import enUS from "./locales/en-US";
import roMD from "./locales/ro-MD";

export interface I18nLanguage {
  label: string;
  value: string;
  file: Record<string, string | object>;
}

export type LanguagesCodes = "en-US" | "ro-MD";

export const LANGAUGES: Record<LanguagesCodes, I18nLanguage> = {
  "en-US": {
    label: "English (United States)",
    value: "en-US",
    file: enUS,
  },
  "ro-MD": {
    label: "Romamanian (Moldova)",
    value: "ro-MD",
    file: roMD,
  },
};
