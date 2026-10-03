# 실험 harness

실험 실행 1개(실험 · 과제 · Variant · 반복 번호)를 준비, Agent 실행, 최종 diff, 숨김 채점, 결과 기록 순서로 처리한다.
값과 규칙의 기준은 `_design/experiment-execution-contract-v0.1.md`(실행 계약)다. 이 디렉터리는 체크리스트 3단계의 골격이다.

## 현재 범위

| 구분 | 상태 |
|---|---|
| 실행 입력, 실행 조건 hash, 실험 잠금 | 구현 |
| 상태 모델과 실패 원인 구분(실행 계약 §6) | 구현 |
| `run.json` · `result.json` · `raw/` · `artifacts/` 기록(실행 계약 §8) | 구현 |
| environment fingerprint | 구현. harness 를 실행한 기계에서 측정 |
| `lab/grading/run.sh` 호출(판정 · 진단 묶음) | 구현 |
| 재실행(새 attempt) | 구현 |
| 컨테이너 실행, egress 제한, 연결 경로, OOM 판정, 재채점, hook(hook 스크립트 내용의 실행 조건 hash 포함), 세션 기록 복사, harness 종료 시 Agent process 정리, 실행 명령(CLI) | 미구현. 체크리스트 3단계 남은 항목 |

**실제 Claude Code 를 실행하지 않는다.** 컨테이너가 없으면 Agent 가 작업 디렉터리 밖의 `run.json`(Variant, 실험 이름)을 읽을 수 있고, 사용자 전역 설정과 분리되지 않는다(실행 계약 §4.3). 그래서 실행 명령을 두지 않았고, 시험은 가짜 Agent · 가짜 채점 스크립트로만 실행한다.

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
| `src/run.ts` | 실행 1개 orchestration(`executeRun`), 실험 잠금, 재실행(`executeWithRetry`. 결측 표시, 구독 사용 한도 도달 시 멈춤) |

## 실행 1개의 흐름

1. 입력 확인, 결과 root 가 Git 작업 트리 밖인지 확인, 집계 실험이면 `lab/` 미commit 변경이 없는지 확인, 실험 잠금(실행 조건, 과제 문구 · 채점 정의, Variant 별 source commit) 확인. 여기서 실패하면 실행 디렉터리를 만들지 않는다
2. `runs/<run_id>/` 를 새로 만든다. 같은 ID 가 있으면 실패한다. `run.json` 기록
3. 준비: fingerprint, Claude Code 버전 확인, 구독 인증 확인(`claude auth status --json` 의 `authMethod` 가 `oauth_token`), source commit clone(`origin` · reflog 제거), diff 용 harness 소유 bare 저장소 → `prepared`
4. Agent 실행 → `running` → `agent_succeeded` · `agent_failed` · `timed_out`
5. 최종 diff(`artifacts/final.patch`, harness 소유 git 과 임시 index 로 생성), 채점용 복사본(source commit + `final.patch`)
6. 판정 묶음 채점 → `grading_succeeded` · `grading_failed`. 판정을 내지 못한 채점(port 사용 중, `run.sh` 시작 실패 · 외부 중단)은 `harness_failed` 이고 채점 결측이다
7. 진단 묶음 채점(기록만) → `completed`

어느 단계든 harness · 환경 문제면 `harness_failed` 와 실패 단계(`prepare`, `agent_start`, `agent`, `after_agent`)를 기록한다. 상태가 바뀔 때마다 `result.json` 을 다시 만든다.

## 시험

host 의 Node.js 22.18 이상에서 TypeScript 를 그대로 실행한다.

```
pnpm install
pnpm typecheck
pnpm test
```

시험은 임시 디렉터리에 가짜 실행용 저장소, 가짜 Agent(`claude` 대신 셸 스크립트), 가짜 `run.sh` 를 만들어 실행한다. 네트워크와 실제 Claude 호출을 쓰지 않는다.
