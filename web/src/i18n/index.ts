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
    resources: {
      "en-US": LANGAUGES["en-US"].file,
      "ro-MD": LANGAUGES["ro-MD"].file,
      "ro-RO": LANGAUGES["ro-RO"].file,
    },
    interpolation: {
      escapeValue: false,
    },
  });
