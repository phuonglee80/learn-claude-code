import { getTranslations } from "@/lib/i18n-server";
import ReferencePageClient from "./client";

export function generateStaticParams() {
  const locales = ["en", "vi", "zh", "ja"];
  return locales.map((locale) => ({ locale }));
}

export default async function ReferencePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ReferencePageClient locale={locale} />;
}
