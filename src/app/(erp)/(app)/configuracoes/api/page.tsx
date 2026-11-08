import type { Metadata } from "next";
import { ApiSettings } from "@/features/settings/components/ApiSettings";

export const metadata: Metadata = { title: "API e webhooks" };

export default function ApiPage() {
  return <ApiSettings />;
}
