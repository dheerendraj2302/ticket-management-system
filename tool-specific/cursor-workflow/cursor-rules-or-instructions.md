# Cursor Rules & Instructions

_Documents the persistent context and reusable commands actually in use for this project — this is the evidence for "reusable prompt templates, rules, or specs."_

## Rules (`.cursor/rules/`)
| File | Mode | Purpose |
|---|---|---|
| `project-overview.mdc` | Always Apply | Stack, structure, and coding conventions |
| `state-machine.mdc` | Auto Attached (ticket/status files) | The exact valid-transition table, enforced |
| `testing-conventions.mdc` | Auto Attached (test files) | Test framework and expectations |

## Commands (`.cursor/commands/`)
| Command | Maps to lifecycle stage |
|---|---|
| `/plan` | Planning & design |
| `/implement` | Code generation |
| `/write-tests` | Testing |
| `/debug` | Debugging |
| `/review` | Code review |
| `/document` | Documentation |

## How These Were Used
_Describe, honestly, how much you actually relied on these vs. free-form prompting, and whether you updated any of them mid-project._

## What I'd Add If This Were a Real, Longer-Lived Project

