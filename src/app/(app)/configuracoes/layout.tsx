import { SettingsShell } from "@/features/settings/components/SettingsShell";

export default function SettingsLayout({ children }: LayoutProps<"/configuracoes">) {
  return <SettingsShell>{children}</SettingsShell>;
}
