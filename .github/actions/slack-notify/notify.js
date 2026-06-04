// Dependency-free Slack notifier. Inputs arrive as env vars (see action.yaml).
// Message format mirrors the slack-notify action in datadive-backend/-frontend.
const env = (key) => process.env[key] || "";

async function run() {
  const jobStatus = env("JOB_STATUS");
  const webhookUrl = env("SLACK_WEBHOOK_URL");
  if (!jobStatus || !webhookUrl) {
    throw new Error("job-status and slack-webhook-url inputs are required");
  }

  const prefix = jobStatus === "success" ? "*SUCCESS* :tada:" : "*FAILURE* :cry:";

  // Extract only the first line of the commit message (ignore Co-authored-by lines)
  const contextFirstLine = env("CONTEXT_MESSAGE").split("\n")[0].trim();
  const contextPart = contextFirstLine ? ` - ${contextFirstLine}` : "";

  const triggeredBy = env("TRIGGERED_BY");
  const triggeredPart = triggeredBy ? ` (triggered by ${triggeredBy})` : "";

  const covLabel = env("COVERAGE_LABEL") || "Coverage";
  const covStmts = env("COVERAGE_STATEMENTS");
  const covBranch = env("COVERAGE_BRANCHES");
  const covFuncs = env("COVERAGE_FUNCTIONS");
  const covLines = env("COVERAGE_LINES");
  const hasCoverage = covStmts || covBranch || covFuncs || covLines;
  const coveragePart = hasCoverage
    ? `\n:bar_chart: ${covLabel} — Stmts: *${covStmts || "N/A"}* | Branch: *${covBranch || "N/A"}* | Funcs: *${covFuncs || "N/A"}* | Lines: *${covLines || "N/A"}*`
    : "";

  const mention = env("MENTION");
  const mentionPart = mention && jobStatus !== "success" ? ` ${mention}` : "";

  const text = `${prefix} ${env("WORKFLOW_NAME")}${contextPart}${triggeredPart} - <${env("RUN_URL")}|View Run>${coveragePart}${mentionPart}`;

  console.error(`Sending Slack notification: ${jobStatus}`);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Slack API error: ${response.status} ${response.statusText} - ${responseText}`,
    );
  }

  console.error("✓ Slack notification sent successfully");
}

run().catch((error) => {
  console.error(`Action failed: ${error.message}`);
  process.exit(1);
});
