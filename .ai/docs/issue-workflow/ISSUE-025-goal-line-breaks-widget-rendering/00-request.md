# 00-request — request intake loop

## Step actually performed

Read the active goal payload generated from the reusable prompt. Parsed the user request into issue-creation inputs before drafting any issue content.

## Raw request fields

```toon
request{bucket,kind,title,context,screenshot}:
  open,bug,"Goal with line breaks widget rendering breaks","/goal command with line breaks in goal description messes up pi-goal widget rendering","/var/folders/8j/f35z086s553cjd2cbqzj94hw0000gn/T/soloterm-clipboard/paste-1778324234575-6143-0.png"
```

## Input completeness check

```toon
input_check[4]{field,present,notes}:
  bucket,true,"open"
  kind,true,"bug"
  title,true,"Goal with line breaks widget rendering breaks"
  context,true,"symptom plus screenshot path supplied"
```

No clarification was needed because the request had a bucket, kind, title, symptom, and evidence path.

## Selected issue identity

The embedded issue inventory supplied by the reusable prompt reported `ISSUE-025` as the next issue number. Selected:

```text
.ai/issues/open/ISSUE-025-goal-line-breaks-widget-rendering.md
```

## Protocol link

This is the start of the `$feature-workflow-pipelines` issue-first canonical-doc pipeline, not an implementation pass.
