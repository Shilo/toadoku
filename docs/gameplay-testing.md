# Reproducing gameplay checks

The declared Node minimum is 24.11.0, matching the locked toolchain; this environment tested 25.0.0. That declaration is not a claim of an exhaustive runtime-version matrix. Run commands from the repository root. Machine reports, traces, screenshots, downloaded source and temporary clean clones stay under ignored `prototypes/gameplay-validation`. The [validation matrix](gameplay-validation-matrix.md) remains the acceptance contract; a successful fast command does not replace the other gates.

```text
npm ci
npm run check
npm test
npm run build
npm run test:browsers:install
npm run test:browser
npm run test:storage
npm run test:models
npm run test:coverage
```

`test:models` runs the independent 2,000-sequence, 250-command session model. `test:coverage` checks every configured critical pure file at 100% statements, branches, functions and lines, including the raw-recovery encoder. Narrow unreachable exclusions require the separately recorded proofs. Neither percentage proves correctness.

Browser tests use owned localhost test origins and isolated browser contexts. The ordinary browser configuration starts port 5179; native storage uses 5187 and all three installed engines. The native suite includes realistic retained-history capacity and deliberate failure/mutation cases. Do not run test setup against a real player's origin/database. Never kill an unknown listener to obtain a test port: use a recorded isolated configuration with identical assertions, timeouts and explicit base URLs instead. Custom browser contexts need their base URL passed explicitly.

For this Windows native evidence, an owned persistent `npm run dev -- --port 5187 --strictPort` process was started first. The native configuration's `reuseExistingServer: true` reused it across separate engine commands, avoiding test-runner teardown of the shared owned harness. Stop only that owned process after its checks finish. This changes server lifecycle, not assertions or application storage semantics.

On this restricted Windows environment, the official Firefox process may require narrow execution elevation to create its normal InstallerPrefs state. That is an environment limitation, not an application pass or permission to change browser security preferences. Some browser/OS combinations cannot store particular structured-clone values; native capability flags must record actual support rather than silently claiming a roundtrip. Exact versions and observed limitations belong in the acceptance evidence.

## Complete catalog

```text
npm run catalog:capture
npm run catalog:build
npm run catalog:verify
npm run catalog:checkouts
```

Capture uses the pinned source revision and verifies downloaded/cached bytes. Import writes the derived catalog and provenance. Verification checks all emitted records with independent oracles, source joins and membership proofs and writes the certificate/report. These commands intentionally update generated tracked certification metadata when its inputs change. A second output directory can be supplied directly to `node tools/catalog/import.ts`; pass it as the comparison directory to `node tools/catalog/verify.ts public/catalog/v1 <comparison-directory>` for deterministic byte comparison.

Clean-checkout verification captures committed HEAD, performs fresh installations/imports/builds with `core.autocrlf=true` and `false`, and compares served catalog bytes at root and repository subpath. Commit the accepted source snapshot before this gate; an older successful checkout does not certify later uncommitted source.

## Mutation evidence

```text
npm run test:mutation -- --logLevel debug
npm run test:mutation:capture -- prototypes/gameplay-validation/mutation/rewards-inventory.json src/lib/rewards/index.ts
npm run test:mutation -- --mutate src/lib/rewards/index.ts --logLevel debug
npm run test:mutation:review -- tests/adversarial/mutation-equivalents.v1.json prototypes/gameplay-validation/mutation/jobs.v1.json tests/adversarial/mutation-timeouts.v1.json
```

Stryker generates raw evidence with the unchanged 100% thresholds. It can exit nonzero because a surviving mutation needs a real regression or an individually reviewed exact equivalence/unreachable proof. That exit is not a release pass; the raw report is never rewritten to manufacture one. Timeouts stay a separate raw status and require inspection for real nontermination/resource degradation rather than unexplained host contention. Unloadable mutants require separately replayed import evidence and are never counted as killed.

Run capture before each authoritative job, listing every configured source for a full run. Its inventory binds the selected full source files, complete test-source set, configuration, locked packages and Node version. Capture the debug console output in an ignored job log. Archive the untouched raw report, matching plan event and that complete log before another job overwrites shared output. The jobs document has `version: 1` and a jobs array; each entry declares `name`, explicit full-path `files`, and ignored relative artifact paths for `report`, `plan`, `log` and `inventory`. One authoritative job owns each configured critical file; cached sources in cumulative reports are disclosed and not double-counted.

A full run uses one job entry covering every configured critical file. Per-module runs use the same final wrapper with multiple entries. The latest shared `mutation.json` alone is insufficient. The wrapper binds actual loaded configuration to each report, pins mutator/test options, requires current source/test bytes and complete independent plan inventories, and rejects missing, stale, duplicated or unexpected sources/mutants. Every raw Timeout needs an exact reviewed causal audit with named independent challenge. The low-level `mutation-review.mjs` fingerprint diagnostic explicitly does not establish final acceptance and cannot replace that wrapper. Final source-bound union evidence is still pending.

## Human browser review

The lead personally checks integrated input, hints, rewards, all progression boundaries, replay/frontier independence, multi-tab ownership, save failures and backup/restore through Codex browser. Browser screenshots and DOM measurements must identify the actual frozen build, viewport, DPR and zoom method. CSS text enlargement and DPR emulation are useful separate checks, not actual page zoom or physical Motorola testing. Installability, service-worker cold offline launch and deployment remain outside this phase.
