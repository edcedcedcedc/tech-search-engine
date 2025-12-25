import i18n from "i18next";
import LangugaeDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { LANGAUGES } from "./languages";

i18n
  .use(LangugaeDetector)
  .use(initReactI18next)
  .init({
    debug: true,
    fallbackLng: "en-US",
    supportedLngs: ["en-US", "ro-MD"],
    resources: {
      "en-US": { translation: LANGAUGES["en-US"].file },
      "ro-MD": { translation: LANGAUGES["ro-MD"].file },
    },
    interpolation: {
      escapeValue: false,
    },
  });
