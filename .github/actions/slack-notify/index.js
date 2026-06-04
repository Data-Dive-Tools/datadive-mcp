const core = require("@actions/core")
const github = require("@actions/github")

async function run() {
  try {
    // Get inputs
    const jobStatus = core.getInput("job-status", { required: true })
    const webhookUrl = core.getInput("slack-webhook-url", { required: true })
    const contextMessage = core.getInput("context-message") || ""
    const triggeredBy = core.getInput("triggered-by") || ""
    const mention = core.getInput("mention") || ""
    const covLabel = core.getInput("coverage-label") || "Coverage"
    const covStmts = core.getInput("coverage-statements") || ""
    const covBranch = core.getInput("coverage-branches") || ""
    const covFuncs = core.getInput("coverage-functions") || ""
    const covLines = core.getInput("coverage-lines") || ""
    const cov2Label = core.getInput("coverage2-label") || "Coverage 2"
    const cov2Stmts = core.getInput("coverage2-statements") || ""
    const cov2Branch = core.getInput("coverage2-branches") || ""
    const cov2Funcs = core.getInput("coverage2-functions") || ""
    const cov2Lines = core.getInput("coverage2-lines") || ""

    // Set status-specific prefix and emoji
    const prefix =
      jobStatus === "success" ? "*SUCCESS* :tada:" : "*FAILURE* :cry:"

    // Extract only the first line of the commit message (ignore Co-authored-by lines)
    const contextFirstLine = contextMessage.split("\n")[0].trim()

    // Build message parts
    const contextPart = contextFirstLine ? ` - ${contextFirstLine}` : ""
    const triggeredPart = triggeredBy ? ` (triggered by ${triggeredBy})` : ""
    const runUrl = `${github.context.serverUrl}/${github.context.repo.owner}/${github.context.repo.repo}/actions/runs/${github.context.runId}`
    const hasCoverage = covStmts || covBranch || covFuncs || covLines
    const coveragePart = hasCoverage
      ? `\n:bar_chart: ${covLabel} — Stmts: *${covStmts || "N/A"}* | Branch: *${covBranch || "N/A"}* | Funcs: *${covFuncs || "N/A"}* | Lines: *${covLines || "N/A"}*`
      : ""
    const hasCoverage2 = cov2Stmts || cov2Branch || cov2Funcs || cov2Lines
    const coverage2Part = hasCoverage2
      ? `\n:bar_chart: ${cov2Label} — Stmts: *${cov2Stmts || "N/A"}* | Branch: *${cov2Branch || "N/A"}* | Funcs: *${cov2Funcs || "N/A"}* | Lines: *${cov2Lines || "N/A"}*`
      : ""

    const mentionPart = mention && jobStatus !== "success" ? ` ${mention}` : ""

    // Build the text message
    const text = `${prefix} ${github.context.workflow}${contextPart}${triggeredPart} - <${runUrl}|View Run>${coveragePart}${coverage2Part}${mentionPart}`

    // Build payload - JSON.stringify will properly escape the text when serializing the payload
    const payload = {
      text: text,
    }

    core.info(`Sending Slack notification: ${jobStatus}`)
    core.debug(`Payload: ${JSON.stringify(payload, null, 2)}`)

    // Send to Slack
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const responseText = await response.text()
      throw new Error(
        `Slack API error: ${response.status} ${response.statusText} - ${responseText}`
      )
    }

    core.info("✓ Slack notification sent successfully")
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`)
  }
}

run()
