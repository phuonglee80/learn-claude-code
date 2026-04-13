import ComparePageClient from "./client";

export function generateStaticParams() {
  const locales = ["en", "vi", "zh", "ja"];
  return locales.map((locale) => ({ locale }));
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ComparePageClient locale={locale} />;
}
