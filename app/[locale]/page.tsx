import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ t?: string }>;
}

export default async function HomePage({
  params,
  searchParams,
}: HomePageProps) {
  const { locale } = await params;
  const { t: token } = await searchParams;

  // Habilitar renderitzat estàtic
  setRequestLocale(locale);

  if (token) {
    redirect(`/${locale}/survey?t=${token}`);
  } else {
    redirect(`/${locale}/survey`);
  }
}
