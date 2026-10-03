import type { Metadata } from "next";
import { UsersSettings } from "@/features/settings/components/UsersSettings";

export const metadata: Metadata = { title: "Usuários" };

export default function UsersPage() {
  return <UsersSettings />;
}
