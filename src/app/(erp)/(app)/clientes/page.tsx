import type { Metadata } from "next";
import { ClientsTable } from "@/features/clients/components/ClientsTable";

export const metadata: Metadata = {
  title: "Clientes",
};

export default function ClientsPage() {
  return <ClientsTable />;
}
