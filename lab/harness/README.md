# 실험 harness

실험 실행 1개(실험 · 과제 · Variant · 반복 번호)를 준비, Agent 실행, 최종 diff, 숨김 채점, 결과 기록 순서로 처리한다.
값과 규칙의 기준은 `_design/experiment-execution-contract-v0.1.md`(실행 계약)다. 이 디렉터리는 체크리스트 3단계의 골격이다.

## 현재 범위

| 구분 | 상태 |
|---|---|
| 실행 입력, 실행 조건 hash, 실험 잠금 | 구현 |
| 상태 모델과 실패 원인 구분(실행 계약 §6) | 구현 |
| `run.json` · `result.json` · `raw/` · `artifacts/` 기록(실행 계약 §8) | 구현 |
| environment fingerprint | 구현. host 값(docker 실행이면 Docker Engine · Desktop 버전, VM kernel · CPU · 메모리 포함)과, Agent 와 같은 이미지의 별도 컨테이너에서 측정한 도구 버전 |
| `lab/grading/run.sh` 호출(판정 · 진단 묶음) | 구현 |
| 재실행(새 attempt) | 구현 |
| 컨테이너 실행(`runtime: docker`), 실행 이미지와 egress 제한(`image/`), 연결 경로, OOM · Docker 오류 · 외부 원인 종료 판정, 컨테이너별 `docker events` 기록, 채점 컨테이너 | 구현 |
| 기록용 hook(`config/cc/`, 실행 조건 hash 포함), 재채점(`regradeRun`), 실행 명령(`src/cli.ts`), 내보내기(`export.sh`) | 구현 |
| 의존성 offline cache 와 `GRADLE_USER_HOME` 준비, harness 강제 종료 시 컨테이너 정리 | 미구현. 체크리스트 7단계 · 이후 |

실제 Claude Code 는 `runtime: docker`(실행 설정 `config/exec-v0.1.json`)로만 실행한다. `runtime: local` 은 컨테이너 없이 가짜 process 로 orchestration 을 시험할 때만 쓴다. local 에서는 Agent 가 실행 디렉터리의 `run.json` 을 읽을 수 있고 사용자 전역 설정과 분리되지 않는다(실행 계약 §4.3).

## 구성

| 파일 | 내용 |
|---|---|
| `config/exec-v0.1.json` | 실행 설정. 모델, effort, 예산 한도, 시간 제한, 재실행 횟수, 이미지(실행 계약 §3) |
| `config/tasks.json` | 과제 정의. 과제 문구 경로, 판정 · 진단 채점 묶음(실행 계약 §6.4) |
| `src/config.ts` | 입력 확인, 실행 조건 hash, 실행 입력 hash |
| `src/state.ts` | 상태와 허용 전이 |
| `src/process.ts` | process 실행. 시간 제한, process group 종료, 원본 출력 저장, 수신 시각, 잠자기 감지 |
| `src/agent.ts` | Claude Code 실행 인자 · 환경 변수 허용 목록, stream 요약, Agent 종료 분류 |
| `src/workspace.ts` | source commit clone, 최종 diff, 채점용 복사본 |
| `src/fingerprint.ts` | OS, 아키텍처, 익명 machine id, 도구 버전 |
| `src/grader.ts` | `run.sh` 인자, JUnit 해석, 묶음 판정 |
| `src/normalize.ts` | `run.json`, `raw/`, `artifacts/` 에서 `result.json` 생성 |
| `src/run.ts` | 실행 1개 orchestration(`executeRun`), 실험 잠금, 재실행(`executeWithRetry`. 결측 표시, 구독 사용 한도 도달 시 멈춤), 재채점(`regradeRun`) |
| `src/docker.ts` | Agent · 채점 컨테이너 실행 인자, 종료 뒤 컨테이너 정리와 상태(`settleContainer`), 이미지 안 도구 버전 확인 |
| `src/cli.ts` | 실행 명령(`run`, `regrade`, `rebuild-result`). 인자 확인, token 파일 읽기, `caffeinate` |
| `config/cc/settings.json`, `config/cc/record.mjs` | 기록용 hook. 도구 호출 전후(실패 포함) 기록과 시험 결과 파일 복사(설계 §14.3) |
| `image/Dockerfile`, `image/start.sh` | 실행 이미지. 시작 스크립트가 외부 통신을 DNS resolver 와 `api.anthropic.com` 443 으로 제한하고 agent 사용자로 권한을 낮춘다. 제한을 설정하지 못하면 exit 90 |
| `image.lock` | 실험에 쓰는 이미지 id, build 입력 sha256, `docker save` 사본 위치와 sha256 |
| `export.sh` | 실행용 저장소 내보내기(설계 §15.1) |

## 실행 1개의 흐름

1. 입력 확인, 결과 root 가 Git 작업 트리 밖인지 확인, 집계 실험이면 `lab/` 미commit 변경이 없는지 확인, 실험 잠금(실행 조건, 과제 문구 · 채점 정의, Variant 별 source commit) 확인. 여기서 실패하면 실행 디렉터리를 만들지 않는다
2. `runs/<run_id>/` 를 새로 만든다. 같은 ID 가 있으면 실패한다. `run.json` 기록
3. 준비: fingerprint, Claude Code 버전 확인, 구독 인증 확인(`claude auth status --json` 의 `authMethod` 가 `oauth_token`), source commit clone(`origin` · reflog 제거), 작업 디렉터리의 지침 파일(`CLAUDE.md` · `CLAUDE.local.md` · `AGENTS.md` · `.claude/`) 검사, diff 용 harness 소유 bare 저장소 → `prepared`
4. Agent 실행 → `running` → `agent_succeeded` · `agent_failed` · `timed_out`
5. 최종 diff(`artifacts/final.patch`, harness 소유 git 과 임시 index 로 생성), 채점용 복사본(source commit + `final.patch`)
6. 판정 묶음 채점 → `grading_succeeded` · `grading_failed`. 판정을 내지 못한 채점(port 사용 중, `run.sh` · 채점 컨테이너 시작 실패, 외부 중단)은 `harness_failed` 이고 채점 결측이다
7. 진단 묶음 채점(기록만) → `completed`

어느 단계든 harness · 환경 문제면 `harness_failed` 와 실패 단계(`prepare`, `agent_start`, `agent`, `after_agent`)를 기록한다. 상태가 바뀔 때마다 `result.json` 을 다시 만든다.

재채점(`regrade`)은 실패 단계가 `after_agent` 인 실행(비종료 상태로 남은 실행 포함)에서 판정 결과가 없는 묶음만 다시 채점한다. 새 attempt 대상(API 오류, 사용 한도)은 거부한다. 집계 실험은 `lab/` 미commit 변경이 있으면 거부하고, 회차마다 harness 코드 상태를 `harness_code`(`regrade-<회차>`)로 남긴다.

## 실행

```
pnpm lab run --experiment pilot-1 --task pilot --variant a --repetition 1 --source-repo <실행용 저장소> --source-commit <40자리 SHA>
pnpm lab regrade --run-dir <실행 디렉터리>
pnpm lab rebuild-result --run-dir <실행 디렉터리>
./export.sh <Variant 디렉터리> <출력 상위 디렉터리>
```

- 결과 root 기본값은 `~/lab-runs/v0.1` 이다(`--results-root` 로 바꾼다). Git 작업 트리 밖이고 경로에 금지 문자열이 없어야 한다
- 구독 token 은 `CLAUDE_CODE_OAUTH_TOKEN` 이 없으면 `~/.config/agentic-lab/claude-oauth-token` 에서 읽는다. 값은 출력 · 기록하지 않는다
- macOS 에서는 실행 중 `caffeinate` 로 잠자기를 막는다
- 실행 이미지는 `image/` 에서 build 하고 id 를 `image.lock` 과 실행 설정 `environment.image` 에 기록한다. apt 패키지를 고정하지 않으므로 다시 build 하지 않고, 이미지를 잃으면 `image.lock` 의 `saved` 사본을 `docker load` 한다
- 구독 token 이 없거나 이어서 실행 인자(`--resume-attempt`, `--resume-retry-of`, `--resume-counted`)가 맞지 않으면 실행을 시작하지 않고 exit 2 다

## 시험

host 의 Node.js 22.18 이상에서 TypeScript 를 그대로 실행한다.

```
pnpm install
pnpm typecheck
pnpm test
```

시험은 임시 디렉터리에 가짜 실행용 저장소, 가짜 Agent(`claude` 대신 셸 스크립트), 가짜 `run.sh` 를 만들어 실행한다. 실제 Claude 호출은 하지 않는다. `test/container.test.ts` 는 `image.lock` 의 이미지 위에 가짜 `claude` 만 더한 이미지로 실제 컨테이너 경로를 실행하고, Docker 나 이미지가 없으면 건너뛴다.
