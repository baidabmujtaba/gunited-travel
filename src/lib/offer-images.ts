import packageImg from "@/assets/offer-package.jpg";
import visaImg from "@/assets/offer-visa.jpg";
import tourImg from "@/assets/offer-tour.jpg";
import insuranceImg from "@/assets/offer-insurance.jpg";

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
