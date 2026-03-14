import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <FileQuestion className="h-16 w-16 text-gray-400 mx-auto mb-6" />
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          {t("errors.pageNotFound")}
        </h2>
        <p className="text-gray-600 mb-8 max-w-md">
          {t("errors.pageNotFoundDescription")}
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button variant="default">
              {t("errors.goHome")}
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="outline">
              {t("errors.browseServices")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
