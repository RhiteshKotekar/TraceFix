import { SetupWizard } from "@/components/SetupWizard";

export default function SetupPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Project setup</h1>
      <p className="mt-0.5 text-sm text-muted">
        Connect the repository, tell the agent how to run it, and wire Grafana alerts to TraceFix.
      </p>
      <SetupWizard />
    </>
  );
}
