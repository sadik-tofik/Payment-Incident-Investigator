# CR-008: repository clean-up and UI first build (Mon 9 Nov 2026)
Owner asked for a clean version of the whole project folder (zip received 9 Nov 14:19 local) to push to GitHub. I did not push anything.

## What was removed from the push set (not deleted from the owner's disk by me)
| Item | Why |
|---|---|
| `draft.txt` | **A pasted PayPal developer-dashboard note containing the sandbox app's Client ID and secret key and the sandbox business account's email and password.** It must not be committed or shared. Rotate the sandbox app secret and the sandbox account password (sandbox only, but they were exposed in chat transcripts and this archive). The old pre-push script did not detect it. |
| Root-level copies of `00-INDEX.md`, `00-INDEX .md`, `01-BRS.md`, `01-BRS(1).md`, `02-SRS.md`, `03-THREAT-MODEL.md`, `05a-API-CONTRACT.md`, `06-EVIDENCE-SPEC.md`, `07-IVM.md`, `CR-004`, `CR-005`, `S0A-RUNBOOK.md` | Older duplicates of the files in `docs/` (all differ from `docs/`, which holds the locked versions). |
| `docs/06-UI-AGENT-PROMPT.md` | Old name of `docs/05b-UI-AGENT-PROMPT.md`. |
| `paypal-incident-harness/` | Superseded copy of `harness/` (older; its `results/` contains a sandbox response with an email address). The evidence it held is already under `evidence/`. |
| `app/out/` | Runtime output (audit log, bundles); ignored by `.gitignore`. |
| `ui/node_modules/`, `ui/dist/` | Dependencies and build output (about 99 MB). |

## What changed
* `scripts/prepush-check.sh`: now also catches long random-looking tokens and pasted credential labels (Client ID, secret key, password), and prints only `file:line`, never the matched text. New test `app/test/prepush.test.js` (fake credentials; clean repository; env/zip/raw directories).
* `.gitignore`: adds `draft*.txt`, `*.local`, build output.
* README: web interface section, `ui/` in the layout, LICENSE line (LICENSE with Apache-2.0 text is present in the tree).
* IVM generator rows BR-13 and SR-N-10 and finding D-9 updated for the LICENSE; TDD section 8 UI row updated.
* `ui/` (the frontend agent's first build) is included as received. Not yet evidenced in the repository: the 68 screenshots, the axe report, the network-panel check.

Not done: Git history scan (this copy is not a repository), any push.
