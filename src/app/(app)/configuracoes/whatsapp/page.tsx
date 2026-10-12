import type { Metadata } from "next";
import { WhatsAppSettings } from "@/features/settings/components/WhatsAppSettings";

export const metadata: Metadata = { title: "WhatsApp Business" };

export default function WhatsAppSettingsPage() {
  return <WhatsAppSettings />;
}
