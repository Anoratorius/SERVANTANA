import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function CTAButtons({
  customerLabel,
  cleanerLabel,
}: {
  customerLabel: string;
  cleanerLabel: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Link href="/signup?type=customer">
        <Button
          size="lg"
          variant="outline"
          className="border-white text-white bg-transparent hover:bg-white hover:text-blue-600 transition-all duration-300"
        >
          {customerLabel}
        </Button>
      </Link>
      <Link href="/signup?type=cleaner">
        <Button
          size="lg"
          variant="outline"
          className="border-white text-white bg-transparent hover:bg-white hover:text-green-600 transition-all duration-300"
        >
          {cleanerLabel}
        </Button>
      </Link>
    </div>
  );
}
