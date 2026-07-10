# Portfolio Operation Pipeline

## Command Flow

1. User -> Codex decomposes the request and defines acceptance checks.
2. vfimpl implements the change and runs local self-checks.
3. If implementation is not accepted, return to vfimpl for rework.
4. If implementation is accepted, vftest runs the full test pass.
5. If tests fail, return to vfimpl for rework.
6. If tests pass, Codex performs a code spot check.
7. If the spot check fails, return to vfimpl for rework.
8. If the spot check passes, Codex delivers the report to the user.

## Backup Rule For Every Rework Loop

All failed-return loops to vfimpl keep a three-layer backup trail on D drive:

- `snapshots`: low-frequency full baseline snapshots used as anchors.
- `incremental`: two-hour and save-time diff archives containing only changed project data.
- `daily`: daily merged full archives rebuilt from the baseline snapshot plus all matching incremental files.

The backup config lives at `portfolio-backup.config.json`. Rollback in the editor calls the local API, which reconstructs the selected version automatically.
