import { LiveFeed } from "@/components/LiveFeed";

export default function LivePage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Live feed</h1>
      <p className="mt-0.5 text-sm text-muted">
        Prometheus samples for the watched endpoint, Grafana alert transitions, and what TraceFix did with each webhook.
      </p>
      <LiveFeed />
    </>
  );
}
