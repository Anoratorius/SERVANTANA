"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="bg-gradient-to-b from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl uppercase bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
            {t("common.appName")}
          </Link>
        </div>

        {/* Company, Support, Legal - side by side on all screens */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 text-center max-w-4xl mx-auto">
          <div>
            <h4 className="font-semibold mb-2 md:mb-4 text-xs md:text-base">{t("footer.company")}</h4>
            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-blue-600 transition-colors">
                  {t("footer.aboutUs")}
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-blue-600 transition-colors">
                  {t("footer.careers")}
                </Link>
              </li>
              <li>
                <Link href="/press" className="hover:text-blue-600 transition-colors">
                  {t("footer.press")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2 md:mb-4 text-xs md:text-base">{t("footer.support")}</h4>
            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li>
                <Link href="/contact" className="hover:text-blue-600 transition-colors">
                  {t("footer.contactUs")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-blue-600 transition-colors">
                  {t("footer.faq")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2 md:mb-4 text-xs md:text-base">{t("footer.legal")}</h4>
            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li>
                <Link href="/terms" className="hover:text-blue-600 transition-colors">
                  {t("footer.termsOfService")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                  {t("footer.privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-blue-600 transition-colors">
                  {t("footer.cookiePolicy")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} <span className="uppercase" style={{ fontFamily: 'var(--font-logo)' }}>{t("common.appName")}</span>. {t("footer.allRightsReserved")}
        </div>
      </div>
    </footer>
  );
}
