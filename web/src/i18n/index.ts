import i18n from "i18next";
import LangugaeDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { LANGAUGES } from "./languages";

i18n
  .use(LangugaeDetector)
  .use(initReactI18next)
  .init({
    debug: true,
    fallbackLng: "en",
    supportedLngs: ["en", "ro"],
    resources: {
      "en": { translation: LANGAUGES["en"].file },
      "ro": { translation: LANGAUGES["ro"].file },
    },
    interpolation: {
      escapeValue: false,
    },
  });
