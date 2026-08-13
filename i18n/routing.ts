import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  // Una llista de tots els idiomes suportats
  locales: ["ca", "es", "en", "fr"],

  // Utilitzat quan no es pot trobar un idioma coincident
  defaultLocale: "ca",

  // Configuració de pathnames per idioma
  pathnames: {
    "/": "/",
    "/survey": {
      ca: "/enquesta",
      es: "/encuesta",
      en: "/survey",
      fr: "/enquete",
    },
  },
});

// Helpers de navegació lleugeres que embolcallen Next.js APIs
// aquests helpers també inferiran automàticament el type dels pathnames
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
