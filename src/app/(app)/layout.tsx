import { AppShell } from "@/components/AppShell";

// Monitoring UIs linked from the sidebar; read from the server env so nothing is hardcoded.
export default function AppLayout({ children }: LayoutProps<"/">) {
  const links = { grafana: process.env.GRAFANA_URL ?? null, prometheus: process.env.PROMETHEUS_URL ?? null };
  return <AppShell links={links}>{children}</AppShell>;
}
