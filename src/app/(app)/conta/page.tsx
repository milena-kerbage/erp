import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/server";
import { AccountPage } from "@/features/operations/components/InformationalPages";
export const metadata: Metadata = { title: "Minha conta" };
export default async function Page() { const user = await requireSession(); return <AccountPage name={user.name} email={user.email} />; }
