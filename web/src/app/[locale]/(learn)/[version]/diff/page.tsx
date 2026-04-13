import { LEARNING_PATH } from "@/lib/constants";
import { DiffPageContent } from "./diff-content";

export function generateStaticParams() {
  const locales = ["en", "vi", "zh", "ja"];
  return locales.flatMap((locale) =>
    LEARNING_PATH.map((version) => ({ locale, version }))
  );
}

export default async function DiffPage({
  params,
}: {
  params: Promise<{ locale: string; version: string }>;
}) {
  const { version } = await params;
  return <DiffPageContent version={version} />;
}
