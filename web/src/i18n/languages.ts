import enUS from "./locales/en-US.json";
import roMD from "./locales/ro-MD.json";
import roRO from "./locales/ro-RO.json";

export interface I18nLanguage {
  label: string;
  value: string;
  file: Record<string, string | object>;
}

export const LANGAUGES: Record<string, I18nLanguage> = {
  "en-US": {
    label: "English (United States)",
    value: "en-US",
    file: enUS,
  },
  "ro-MD": {
    label: "Romamnian (Moldova)",
    value: "ro-MD",
    file: roMD,
  },
  "ro-RO": {
    label: "Romamnian",
    value: "ro-RO",
    file: roRO,
  },
};
