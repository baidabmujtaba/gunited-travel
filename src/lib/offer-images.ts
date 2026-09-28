import packageImg from "@/assets/offer-package.webp";
import visaImg from "@/assets/offer-visa.webp";
import tourImg from "@/assets/offer-tour.webp";
import insuranceImg from "@/assets/offer-insurance.webp";

const byCategory: Record<string, string> = {
  package: packageImg,
  visa: visaImg,
  flight: tourImg,
  tour: tourImg,
  insurance: insuranceImg,
};

/** Fallback artwork used when an offer has no uploaded image yet. */
export function categoryImage(category: string) {
  return byCategory[category] ?? packageImg;
}
