# 06 — Final audit

protocol_compliance[8]{step,status,evidence}:
  request_intake,pass,"00-request.md records parsed inputs and issue path"
  protocol_read,pass,"01-protocol-read.md records freshly available protocol reads"
  grounded_research,pass,"02-grounded-research.md records lifecycle/queue/steer findings"
  design_lock,pass,"03-design-lock.md locks steering over auto-create"
  proof_threat_model,pass,"04-proof-threat-model.md names invariant false-greens and required proofs"
  issue_writeback,pass,"05-issue-writeback.md records canonical issue sections"
  raw_commands,pass,"raw/commands.log contains status and rg research commands"
  visibility_check,pass,"git status shows artifacts untracked; git check-ignore -v reports .gitignore negation for issue-workflow artifacts"

No unresolved questions.
