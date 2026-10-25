// Fixed k6 workload, owned by TraceFix (the agent can never edit it). Same settings for baseline and candidate.
import http from "k6/http";

export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DURATION || "20s",
  summaryTrendStats: ["avg", "min", "med", "p(95)", "max"],
};

export default function () {
  http.get(`${__ENV.BASE_URL}${__ENV.ENDPOINT}`);
}

export function handleSummary(data) {
  return { "/out/summary.json": JSON.stringify(data) };
}
