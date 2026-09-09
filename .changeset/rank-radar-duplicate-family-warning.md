---
"@datadive-tools/mcp": minor
---

Tell the user a Rank Radar family is already tracked before they pay for it again (RS-11615).

`create_rank_radar`'s unconfirmed pass now previews the creation against `POST /v1/niches/rank-radars` with `dryRun: true` — which runs the API's full validation, quota check and duplicate check, and creates nothing — and folds the `warnings` it returns into the existing `confirmation_required` payload next to the cost note. So the assistant can say "this product family is already tracked by another of your Rank Radars, and a second one spends Tracked Search Terms on it again" *before* asking the user to confirm, in the same words the DataDive UI uses. Previously the payload was static and knew only the token cost.

A warning never blocks the creation: two Rank Radars on one family is how a customer tracks two different sets of search terms and keeps separate statistics. Warnings are also returned on a real create, which is the only place the `DATADIVE_AUTO_CONFIRM_WRITES` opt-out path can surface them.

`dryRun` is set by the handler and is deliberately absent from the tool's input schema — a model able to set it could dry-run, read a success-shaped response, and report a Rank Radar that was never created. New exports on the confirm gate (`needsConfirmation`, `confirmationRequired`) and a new `ApiWarning` type; `CreateRankRadarResult.rankRadarId` widens to `string | null` and gains optional `warnings`.

Requires a backend with RS-11615 deployed. Against an older one the unknown `dryRun` field is ignored and the Rank Radar is really created — the tool detects that (a dry run returns a null id) and reports the creation instead of claiming a confirmation is still pending.
