import type { Metadata } from "next";
import { ReviewsModeration } from "@/features/reviews/components/ReviewsModeration";

export const metadata: Metadata = { title: "Avaliações" };
export default function Page() {
  return <ReviewsModeration />;
}
