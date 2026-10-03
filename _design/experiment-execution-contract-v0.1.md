# 실험 실행 계약 v0.1

작성일: 2026-10-03
상태: **REVIEWED** (2026-10-03). 인증 방식을 사용자의 Claude Max 구독으로 바꿨다(§4.4). 실행 기계 변경 검토와 함께 재검토한다.
기준 설계: `_design/experiment-codebase-design-v0.1.md` (이하 "설계")

이 문서는 설계 §19.2 의 Phase 0B 결정과, A/B 실행에서 Variant 이외의 조건을 고정하는 방법을 정한다.
harness(`lab/harness/`)는 이 문서의 값과 규칙을 구현한다. 이 문서와 harness 가 다르면 이 문서를 따르고 harness 를 고친다.

---

# 1. 적용 범위와 변경 규칙

- pilot(체크리스트 9단계), 보정 실행(7단계), 실험 실행(10단계)에 같은 값을 쓴다. pilot 과 보정 실행의 결과는 분석에서 뺀다
- 실험(`exp1`, `exp2`, `exp3`)마다 첫 집계 실행이 시작되기 전에는 이 문서를 고칠 수 있다. 고치면 §11 에 이유를 적고 실행 설정 파일의 `id` 를 바꾼다
- **첫 집계 실행이 시작된 실험은 끝날 때까지 실행 조건(§3, §4, §5.1)을 바꾸지 않는다.** 바꿔야 하면 그 실험의 두 Variant 실행을 모두 버리고 새 실험 ID(`exp1.r2` 처럼 `.r<n>` 를 붙인다)로 처음부터 다시 실행한다
- harness 는 실험 ID 마다 처음 사용한 실행 조건 hash 를 잠금 파일에 기록하고, hash 가 다른 실행 시작을 거부한다(§8.3)

---

# 2. Phase 0B 결정표

| 항목 | 결정 | 근거 |
|---|---|---|
| Agent 제품 | Claude Code CLI **2.1.287** | 설계 §14.2 의 기록 형식을 이 버전으로 확인했다 |
| 모델 | **`claude-opus-5-5`** (전체 ID, alias 아님). subagent 도 같은 모델 | 공식 비교표의 "long-running agentic coding" 용 모델. Fable 5.1 은 토큰 가격 2.5배 |
| effort | **`medium`** (명시 고정) | Claude Code 의 Opus 5.5 기본값이다. 실험이 측정하는 대상은 기본 사용 조건의 Agent 다 |
| 실행당 한도 | `--max-budget-usd 15`, 시간 45분 | §5.1 |
| 전체 사용량 | 사용자의 Claude Max 구독 사용 한도 안에서 실행한다. USD 청구는 없다. 계산 비용(`total_cost_usd`)과 token 을 실행마다 기록한다 | §5.2 |
| 실행 기계 | 이 Mac(Apple M5, 10 core, 32GB, macOS 26.5.2)의 Docker Desktop 4.48.0(Engine 28.5.1), `linux/arm64` | §4.1 |
| 인증 | 사용자의 Claude Max 구독. `claude setup-token` 으로 만든 장기 인증 token 을 환경 변수 `CLAUDE_CODE_OAUTH_TOKEN` 으로 컨테이너에 넣는다. API key 는 쓰지 않는다 | §4.4 |
| 원본 로그 보관 | 실행 기계의 결과 root(`~/lab-runs/v0.1/`). 실험이 끝나면 archive 를 private GitHub 저장소의 release asset 으로 올린다. Git commit 하지 않는다 | §8.4 |
| timeout | Agent 45분, 종료 유예 30초, 준비 15분, 판정 채점 30분, 진단 채점 15분 | §6.5 |
| retry | Agent 관찰 결과는 다시 실행하지 않는다. Agent 관찰 전에 생긴 harness 실패와 API 오류(구독 사용 한도 도달 포함)만 새 attempt 로 실행한다. 반복 단위당 최대 3회 | §7 |
| 병렬 실행 | 실험 1 · 3 은 1개씩, 실험 2 는 2개씩 | §4.2 |
| 실행 환경 고정 | 이미지 digest, 버전 확인, 환경 변수 허용 목록, 실행 조건 hash 와 실험 잠금 | §3, §4, §8.3 |

출처(2026-10-03 확인):
- 모델 ID · 가격 · 학습 기준일: https://platform.claude.com/docs/en/about-claude/models/overview . `claude-opus-5-5` 는 입력 $4, 출력 $20 / MTok, `claude-fable-5-1` 은 입력 $10, 출력 $50 / MTok
- Claude Code effort 기본값: https://code.claude.com/docs/en/model-config . 인용: "Opus 5.5 defaults to `medium`, one level below Opus 5's default of `high`"
- subagent 모델: https://code.claude.com/docs/en/sub-agents 「Choose a model」. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` 는 v2.1.257 이상

모델 학습 기준일과 설계 §3.4 의 관계: `claude-opus-5-5` 의 reliable knowledge cutoff 와 training data cutoff 는 모두 2026-06 이다.
§3.4 결정표의 major line 최초 stable 출시일은 모두 2026-06 이전이다(가장 늦은 것은 TypeScript 6, 2026-03-23).
학습 기준일 이후에 나온 것은 같은 major 안의 minor · patch 다. 예: React 19.3.0(2026-09-09), Vite 8.3.2(2026-10-01). 설계 §3.4 는 major 만 한계 기록 대상으로 정했으므로 §17 에 더하지 않는다.

---

# 3. 고정 실행 조건

A 와 B 의 실행은 아래 값이 모두 같다. "강제" 열은 harness 가 기계로 확인하는 방법이다.

| 항목 | 값 | 강제 |
|---|---|---|
| Agent 실행 방식 | `claude -p <과제 문구> <고정 인자>`. 과제 문구를 `-p` 바로 뒤에 두어 여러 값을 받는 옵션(`--disallowedTools`, `--mcp-config`)의 값으로 들어가지 않게 한다 | 실행 인자는 실행 설정 파일에서만 만든다. Variant 를 인자로 받지 않는다 |
| CLI 버전 | 2.1.287 | 준비 단계에서 `claude --version` 을 읽어 다르면 `harness_failed` |
| 모델 | `--model claude-opus-5-5` | 실행 설정 파일, 실험 잠금 |
| subagent 모델 | `CLAUDE_CODE_SUBAGENT_MODEL=claude-opus-5-5`, `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` | 실행 설정 파일, 실험 잠금 |
| effort | `--effort medium` | 실행 설정 파일, 실험 잠금 |
| 예산 한도 | `--max-budget-usd 15` | 실행 설정 파일, 실험 잠금 |
| system prompt | CLI 기본값. `--system-prompt`, `--append-system-prompt`, output style 을 쓰지 않는다 | 실행 인자 생성 코드에 해당 인자가 없다 |
| 지침 파일 | 없음. 실행마다 빈 `CLAUDE_CONFIG_DIR`, 실행용 저장소에 `CLAUDE.md` · `AGENTS.md` · `.claude/` 없음 | 내보내기 검사(설계 §15.1) |
| 도구 | 2.1.287 기본 도구 중 `WebSearch`, `WebFetch` 를 뺀 전부. `--disallowedTools WebSearch WebFetch` | 실행 설정 파일 |
| 권한 | `--dangerously-skip-permissions`. non-root 컨테이너와 egress 제한 조건에서만 쓴다(설계 §15.3) | 컨테이너 실행 단계 |
| MCP | `--strict-mcp-config --mcp-config '{"mcpServers":{}}'` | 실행 인자 생성 코드 |
| settings · hook | `--settings <harness 설정>`. 기록용 hook 만 있고 `env` 블록이 없다(설계 §14.2) | 설정 파일 내용의 sha256 을 실행 조건 hash 에 넣는다 |
| 출력 형식 | `--output-format stream-json --verbose --include-hook-events` | 실행 인자 생성 코드 |
| 세션 ID | 실행마다 새 UUID v4, `--session-id`. `run.json` 에 기록 | 실행 인자 생성 코드 |
| fallback 모델 | 쓰지 않는다(`--fallback-model` 없음) | 실행 인자 생성 코드 |
| 과제 문구 | 과제 정의(`lab/harness/config/tasks.json`)가 가리키는 `prompt.md` 의 바이트 그대로. sha256 을 `run.json` 에 기록 | 시험(문구 전달) |
| 작업 디렉터리 | 컨테이너 안 `/work/shop-admin`. 실행용 저장소를 source commit 으로 clone 하고 `origin` remote 와 reflog(`.git/logs`, `ORIG_HEAD`)를 지운다. harness 의 git 명령은 host 전역 · 시스템 git 설정과 사용자 정보 없이 실행한다 | 준비 단계에서 HEAD 와 source commit 비교. `.git` 안에 원본 경로 · host 사용자 이름이 없는지 시험 |
| 시간 제한 | Agent 시작부터 45분. 넘으면 SIGTERM, 30초 뒤 SIGKILL | 시험(timeout) |
| 환경 변수 | 허용 목록만 넘긴다(표 아래) | 실행 인자 생성 코드. `ANTHROPIC_MODEL`, `CLAUDE_CODE_EFFORT_LEVEL` 같은 실행자 환경 변수가 Agent 에 들어가지 않는다 |

Agent 환경 변수 허용 목록:
- 고정 값: `TZ=Asia/Seoul`, `LANG=ko_KR.UTF-8`, `DISABLE_AUTOUPDATER=1`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, subagent 모델 2개, `CLAUDE_CONFIG_DIR`
- 컨테이너 단계에서 더하는 값: `GRADLE_USER_HOME`, `GRADLE_RO_DEP_CACHE`, `PLAYWRIGHT_BROWSERS_PATH`(설계 §15.2)
- 실행자 환경에서 넘기는 값: `CLAUDE_CODE_OAUTH_TOKEN` 뿐이다. `ANTHROPIC_API_KEY` 는 넘기지 않는다(§4.4)
- `PATH` 와 `HOME=/home/agent` 는 이미지 값을 쓴다. 3단계 host 골격만 실행자의 `PATH` · `HOME` 을 넘긴다

`WebSearch` · `WebFetch` 를 빼는 이유: 이 연구 저장소는 GitHub 에 공개돼 있고(`dhrod5457/agentic-clean-code-book`, PUBLIC) 설계와 숨김 채점이 들어 있다. `WebSearch` 는 Anthropic 서버에서 실행되므로 컨테이너 egress 제한으로 막히지 않는다. 두 Variant 에 같게 적용한다.

백그라운드 기능(대화 요약 같은 보조 기능)은 Claude Code 가 Haiku 계열 모델로 실행한다(model-config 문서의 `ANTHROPIC_DEFAULT_HAIKU_MODEL` 설명). 이 동작은 바꾸지 않고, 실제로 쓰인 모델 목록을 실행마다 기록한다(§9). 주 모델 · subagent 이외의 모델 사용량은 두 Variant 에서 따로 집계한다.

실행 설정 파일(`lab/harness/config/exec-v0.1.json`)이 위 값의 기준 위치다. 실행 조건 hash 는 §8.3 에서 정한다.

---

# 4. 실행 기계와 환경

## 4.1 실행 기계

이 Mac 의 Docker Desktop 에서 실행한다.

- 사내 Linux 노드(`vm94` 등)는 다른 세션의 시험 실행과 공유된다. 실행 중 부하가 시간 지표를 바꾸고 노드 잠금 경쟁이 생긴다
- 이 Mac 은 개인 작업 기계라 같은 위험이 있다. 실험 1 · 3 실행 중에는 다른 Docker 작업을 하지 않고, 실행 시작 시 host load average 를 fingerprint 에 기록한다. 이 위험은 설계 §17 에 적었다
- 실험 기간에는 Docker Desktop 자동 갱신을 끄고, harness 를 `caffeinate -i` 아래에서 실행해 잠자기를 막는다
- CPU 아키텍처는 `arm64` 다. 실험 3 기준 screenshot 은 같은 이미지에서 만든다(체크리스트 7단계)

선행 조치: 2026-10-03 확인 시 Docker Desktop VM 메모리는 5.8GB(CPU 10)다. 실험 2 의 동시 2개 실행에 16GB 가 필요하므로 이미지 작업 전에 VM 메모리를 20GB 이상으로 바꾼다(체크리스트 3단계).

## 4.2 컨테이너와 동시 실행

- 실행 1개는 준비부터 채점까지 동시 실행 자리 하나를 쓴다. Agent 컨테이너와 채점 컨테이너는 모두 CPU 4개, 메모리 8GB, non-root 사용자(설계 §15.2)이고 한 실행 안에서 순서대로 실행한다. CPU · 메모리 제한은 실행 설정 파일의 `environment` 에 있어 실행 조건 hash 에 포함된다
- 실험 1 · 3: 한 번에 1개(설계 §14.6)
- 실험 2: 한 회의 8개 실행을 같은 기준 commit 에서 2개씩 실행한다. 실행마다 별도 clone 과 별도 컨테이너를 쓰고 서로의 작업을 볼 수 없으므로, 동시 실행 수는 쌍별 3-way merge 결과에 영향을 주지 않는다. 동시 8개는 32 CPU · 64GB 가 필요해 이 기계에서 실행할 수 없다
- 통합 Agent(실험 2 순차 통합)는 1개씩 실행한다

## 4.3 Agent 가 볼 수 있는 경로

실행 디렉터리(§8.2)에는 `run.json` 의 `variant`, `experiment` 처럼 실험 의도를 드러내는 값이 있다. Agent 컨테이너에는 다음만 연결한다.

| 컨테이너 안 경로 | host 원본 | 쓰기 |
|---|---|---|
| `/work/shop-admin` | `runs/<run_id>/workspace/shop-admin` | 가능 |
| `/home/agent/.claude` (`CLAUDE_CONFIG_DIR`) | 실행마다 새로 만든 빈 디렉터리. 실행이 끝나면 harness 가 `raw/agent/claude-config/` 로 복사 | 가능 |
| `/home/agent/hooks-out` | 실행마다 새로 만든 빈 디렉터리. 실행이 끝나면 `raw/agent/hooks/` 로 복사 | 가능 |
| `/opt/cc/` | harness 설정 · hook 스크립트(`lab/harness/config/` 의 해당 파일만) | 읽기 전용 |

hook 이 복사하는 시험 산출물(설계 §14.3 의 `artifacts/test-<순번>/`)은 `/home/agent/hooks-out/artifacts/` 에 쓰고 `raw/agent/hooks/artifacts/` 로 복사한다.
Gradle 읽기 전용 cache(`GRADLE_RO_DEP_CACHE`)와 Playwright 브라우저는 host 연결이 아니라 이미지 안 경로다. root 소유로 두어 non-root Agent 가 쓸 수 없다.

- `run.json`, `result.json`, `raw/`, `artifacts/`, 다른 실행의 디렉터리, 이 저장소는 연결하지 않는다
- 컨테이너 이름과 hostname 은 `r-<run_id>` 다. 이미지 · 설정 · hook 파일 이름 · 경로 · 내용(주석 포함)에 실험 · Variant 를 나타내는 문자열을 쓰지 않는다
- 3단계 컨테이너 항목의 완료 조건으로, 컨테이너 안에서 환경 변수 · 연결 경로 · hostname · `/opt/cc/` 파일 내용에 `agentic`, `variant`, `실험`, `experiment`, Variant 코드가 없는지 검사한다
- 3단계 골격은 컨테이너 없이 host 에서 가짜 Agent 로만 실행한다. 이 상태에서는 작업 디렉터리에서 실행 디렉터리를 읽을 수 있으므로 실제 Agent 를 실행하지 않는다

## 4.4 인증

- 사용자의 Claude Max 구독으로 실행한다. 실행 기계에서 `claude setup-token` 을 한 번 실행해 장기 인증 token 을 만들고, 실행자 shell 의 환경 변수 `CLAUDE_CODE_OAUTH_TOKEN` 에서 컨테이너로 `-e CLAUDE_CODE_OAUTH_TOKEN` 으로 넘긴다. 저장소, 이미지, 실행 설정 파일, `run.json`, fingerprint 에 값을 쓰지 않는다
- 컨테이너에 `ANTHROPIC_API_KEY` 를 넘기지 않는다. 두 값이 함께 있으면 API key 로 인증될 수 있어 실행마다 인증 경로가 달라진다
- 구독 사용 한도는 이 계정을 쓰는 모든 세션이 함께 쓴다. 실험 실행 중 같은 계정으로 하는 다른 Claude 작업이 실험 실행의 한도 도달 시점을 바꾼다. 실험 1 · 3 실행 중에는 같은 계정의 다른 대량 사용을 하지 않는다
- 사용 한도에 도달해 중단된 실행은 Agent 관찰이 아니다(§6.3). 한도가 풀리는 시각까지 다음 실행을 시작하지 않는다
- Agent 는 Bash 로 환경 변수를 출력할 수 있으므로 원본 로그에 token 이 남을 수 있다. archive 전에 harness 가 원본에서 `sk-ant-` 문자열을 검색하고, 실험이 모두 끝나면 token 을 폐기한다

## 4.5 이미지와 runtime

| 항목 | 값 | 출처 |
|---|---|---|
| Java | Eclipse Temurin 25.0.4.1+1 | `lab/spec/versions.md` |
| Node.js | 24.21.0 | `lab/spec/versions.md` |
| pnpm | 10.34.6 | `lab/spec/versions.md` |
| Playwright Chromium | `@playwright/test` 1.63.0 이 지정하는 빌드 | `lab/spec/versions.md` |
| Claude Code | 2.1.287 | §2 |
| 글꼴 · locale · TZ | 고정 글꼴, `ko_KR.UTF-8`, `Asia/Seoul` | 설계 §11.3 |

- 이미지는 digest 로 고정하고 `lab/harness/image.lock` 에 기록한다(체크리스트 3단계). digest 는 실행 설정 파일의 `environment.image` 에 들어가 실행 조건 hash 에 포함된다
- 숨김 채점은 Agent 컨테이너가 끝난 뒤 같은 이미지의 새 컨테이너에서 실행한다. host 의 Java · Node 버전이 채점 결과에 들어가지 않게 한다
- harness 자체는 host 의 Node.js 로 실행한다. host runtime 은 Agent 조건이 아니므로 fingerprint 에 기록만 한다

---

# 5. 예산

## 5.1 실행당 한도

- `--max-budget-usd 15` 와 45분 시간 제한을 모든 Agent 실행과 통합 Agent 실행에 같게 쓴다. 구독 인증에서 이 값은 실제 청구가 아니라 Claude Code 가 계산한 비용 기준의 실행당 상한이다. 구독 인증에서 적용되는지는 pilot 에서 확인한다(§10)
- 한도에 도달해 끝난 실행은 Agent 관찰 결과다. `agent_failed`, `error_kind = budget_exceeded` 로 기록하고 다시 실행하지 않는다. 결과 보고에 Variant 별 `budget_exceeded` 건수를 적는다

실행당 예상 비용은 [추정] USD 2 ~ 6 이다. 가정: 45분 안에 80 turn, 평균 context 60k token. cache read 4.8M token × $0.20 = $0.96, cache write 0.24M token × $5.00 = $1.20, 출력 0.04M token × $20 = $0.80. 단가는 `claude-opus-5-5` 의 입력 $4, 출력 $20, cache read $0.20, 5분 cache write $5 / MTok(https://platform.claude.com/docs/en/about-claude/pricing)이다.
한도 15는 추정 상단의 2.5배다. 정상 실행이 한도에 걸려 잘리는 것을 막으면서 이상 실행의 비용을 제한한다.

pilot 확인 규칙: pilot 실행 중 하나라도 비용이 한도의 50%(USD 7.5)를 넘거나 한도에 도달하면, 10단계 전에 한도를 올리고 §5.2 를 다시 계산해 §11 에 기록한다. 

## 5.2 전체 사용량

USD 예산 대신 구독 사용 한도 안에서 실행한다. 아래 세션 수가 실험 전체의 최대 실행 수다.

| 구분 | 세션 수(최대) |
|---|---|
| 보정 실행(7단계) | 2 |
| pilot(9단계): 실험 1 · 3 Variant 당 1회, 실험 2 Variant 당 2개, 통합 Agent | 10 |
| 실험 1 | 10 |
| 실험 3 | 10 |
| 실험 2 Agent 실행 | 48 |
| 실험 2 통합 Agent(회당 최대 7, 6회) | 42 |
| 합계 | 122 |

- 실행마다 `total_cost_usd`(Claude Code 가 계산한 API 기준 비용)와 token 을 기록해 사용량을 비교한다. 실제 청구는 없다
- 구독 사용 한도의 구간 길이와 남은 양을 harness 가 읽는 방법은 확인하지 않았다. pilot 의 사용량으로 하루 실행 가능 수를 추정해 실험 일정(§7.1 순서 파일)을 정한다 [pilot 후 결정]
- 한 실험은 사용 한도 도달로 중단되지 않게 나눠 실행할 수 있다. 실행 순서 파일의 순서는 바꾸지 않고 시작 시각만 미룬다

# 6. 실행 상태 모델

## 6.1 상태

| 상태 | 뜻 | 종료 상태 |
|---|---|---|
| `prepared` | 실행 디렉터리 생성, `run.json` 기록, 작업 디렉터리 clone, fingerprint · 버전 확인 완료 | 아니오 |
| `running` | Agent process 시작 | 아니오 |
| `agent_succeeded` | Agent 가 exit 0 으로 끝나고 마지막 `result` 가 오류가 아님 | 아니오 |
| `agent_failed` | Agent 가 0 이 아닌 exit code 나 오류 `result` 로 끝남 | 아니오 |
| `timed_out` | harness 가 시간 제한으로 Agent 를 종료함 | 아니오 |
| `grading_succeeded` | 판정 채점 묶음이 모두 `passed` | 아니오 |
| `grading_failed` | 판정 채점 묶음 중 하나 이상이 `failed`, `error`, `timed_out` | 아니오 |
| `completed` | 산출물 정리가 끝남 | 예 |
| `harness_failed` | harness 나 실행 환경의 문제로 실행을 이어갈 수 없음. 실패 단계(`stage`)를 함께 기록 | 예 |

## 6.2 전이

```
(없음) ──▶ prepared ──▶ running ──┬─▶ agent_succeeded ──┐
                                   ├─▶ agent_failed ─────┼─▶ grading_succeeded ──▶ completed
                                   └─▶ timed_out ────────┤   grading_failed ─────▶ completed
                                                         └────────────────────────▶ completed (판정 채점 묶음이 없는 과제)
(없음) · prepared · running · agent_* · timed_out · grading_* ──▶ harness_failed
```

- 숨김 채점은 Agent 결과와 관계없이 실행한다. Agent 가 실패하거나 시간 초과로 끝나도 남은 변경을 채점한다. 성공 여부는 숨김 채점으로 판정하고 Agent 종료 상태는 따로 기록한다
- 최종 diff 는 Agent 종료 직후에 만든다. diff 는 Agent 작업 디렉터리의 `.git` 이 아니라 harness 가 준비 단계에서 만든 bare 저장소와 임시 index 로 만든다. Agent 가 `.git` 을 지우거나 잠가도 diff 를 만들 수 있다. Agent 가 작업 디렉터리 안에 만든 별도 git 저장소는 diff 에 gitlink 로만 들어가 채점용 복사본에서 빈 디렉터리가 된다(확인한 한계). 채점은 Agent 작업 디렉터리가 아니라 source commit 을 새로 clone 하고 `final.patch` 를 적용한 채점용 복사본(`grading-workspace/`)으로 한다. 모든 실행과 재채점이 같은 입력으로 채점되고, 채점 대상이 기록된 최종 diff 와 같아진다. `.gitignore` 대상 파일은 채점에 들어가지 않는다
- 상태 이력은 원본 기록(`raw/events.jsonl`)에 전이마다 한 줄씩 남는다. `result.json` 은 마지막 상태와 전체 이력을 담는다
- harness process 가 강제 종료되면 마지막 상태가 비종료 상태로 남는다. 분석에서는 비종료 상태로 남은 실행을 `harness_failed` 로 취급하고, 마지막 상태로 `stage` 를 정한다. 기록 없음 · `prepared` 는 `prepare`, `running` 은 `agent`(새 attempt). 단 `running` 이어도 Agent 종료 기록(`agent_process`)이 있고 그 분류가 Agent 관찰(`agent_succeeded`, `agent_failed`, `timed_out`)이면 `after_agent` 다. `agent_succeeded` · `agent_failed` · `timed_out` · `grading_succeeded` · `grading_failed` 는 `after_agent`. 재채점 여부는 §7 의 조건을 따른다

## 6.3 원인 구분

| 원인 | 상태 · 결과 | `stage` · `error_kind` |
|---|---|---|
| 작업 디렉터리 clone · checkout 실패, source commit 불일치 | `harness_failed` | `prepare` |
| CLI 버전 불일치, 필수 도구(java, node, pnpm, claude) 없음 | `harness_failed` | `prepare` |
| Agent 실행 파일을 시작하지 못함 | `harness_failed` | `agent_start` |
| Agent exit 0, `result` 성공 | `agent_succeeded` | `result` 줄이 없으면 exit code 로만 판정하고 `result_missing` 을 기록 |
| Agent exit ≠ 0 또는 오류 `result` | `agent_failed` | `error_kind`: `budget_exceeded`, `api_error`, `other` |
| 구독 사용 한도 도달로 중단(`api_error_status` 429 포함) | `agent_failed` | `error_kind = api_error`. Agent 관찰이 아니므로 새 attempt 대상이다. 한도가 풀릴 때까지 다음 실행을 시작하지 않는다 |
| Agent 가 비정상 종료했고 컨테이너가 메모리 제한 초과로 종료됨(`docker inspect` 의 `State.OOMKilled`). Agent 가 exit 0 이면 이 행을 쓰지 않는다 | `agent_failed` | `error_kind = oom`. 메모리 제한은 실행 조건이므로 관찰 결과다 |
| harness 가 보내지 않은 signal 로 종료했고 외부 원인 근거가 있음. 근거는 Docker daemon · VM 재시작 기록(`docker events`, `docker inspect` 의 `State.Error`)이나 잠자기 감지뿐이다 | `harness_failed` | `agent` |
| harness 가 보내지 않은 signal 로 종료했고 외부 원인 근거가 없음 | `agent_failed` | `error_kind = signal`. Agent 가 Bash 로 보낸 signal 일 수 있어 관찰 결과로 본다. 마지막 Bash 명령을 함께 기록 |
| 잠자기 감지: 한 단계의 wall 시각 경과와 monotonic 경과의 차이가 60초 초과 | `harness_failed` | 준비는 `prepare`, Agent 는 `agent`, diff · 채점 · 정리는 `after_agent` |
| 45분 초과 | `timed_out` | harness 가 종료한 경우만 |
| 최종 diff 생성 실패 | `harness_failed` | `after_agent` |
| 판정 묶음 exit 0, JUnit 실패 0, 시험 1개 이상 | 묶음 `passed` | |
| 판정 묶음 JUnit 에 실패 1개 이상 | 묶음 `failed` | |
| 판정 묶음 exit ≠ 0 이고 JUnit 이 없거나, 읽을 수 없거나, 시험이 0개 | 묶음 `error` | Variant build 실패 · 애플리케이션 시작 실패. Agent 변경이 원인일 수 있어 채점 실패로 본다 |
| 판정 묶음 exit 0 인데 JUnit 이 없거나 시험이 0개 | 묶음 `error` | |
| 판정 묶음 30분 초과 | 같은 산출물로 그 묶음을 1회 다시 실행하고, 다시 초과하면 묶음 `timed_out` | 채점 실패로 본다. 기준 commit 은 시간 안에 채점되는 것을 실험 전에 확인하므로, 반복 초과는 Agent 변경(build 정지 같은)이 원인일 가능성이 높다. 같은 산출물을 다시 보는 것이라 Agent 결과를 다시 뽑지 않는다 |
| 판정 채점 port 사전 확인 실패, `run.sh` 시작 실패, harness 시간 초과가 아닌데 `run.sh` 가 exit 130(INT · TERM trap)이나 signal 로 끝남(외부 중단), Agent 실행 중 harness 저장소의 commit · `lab/` 변경이 바뀜 | `harness_failed` | `after_agent`. 채점이 결과를 내지 못했다 |
| `run.sh` 가 exit 137 · 143 으로 끝남 | 묶음 `error` | `set -e` 인 `run.sh` 에서 build 자식(gradlew, pnpm)이 signal 로 죽은 경우다. 메모리 제한 안의 build 실패처럼 Agent 변경이 원인일 수 있어 채점 실패로 본다 |
| 판정 묶음의 판정 기록 | harness 가 묶음 판정을 정한 경우에만 남긴다 | 판정 기록이 없는 묶음은 결과 없음(채점 결측)이다. 판정 묶음 중 하나라도 결과가 없으면 `grading.outcome` 은 정하지 않는다 |
| 진단 묶음의 결과와 진단 단계의 모든 예외 | 상태에 영향 없음 | `result.json` 의 `grading.diagnostic` 에 기록만 한다 |
| 그 밖의 harness 내부 예외 | `harness_failed` | 예외가 난 단계. `stage` 값은 `prepare`, `agent_start`, `agent`, `after_agent` 넷뿐이고 diff · 채점 · 정리 단계는 `after_agent` 다 |

판정 묶음의 `error` · `timed_out` 은 Variant 를 build 하거나 띄우거나 채점을 끝내지 못했다는 뜻이다. 실행 환경 문제로 생긴 경우와 Agent 변경으로 생긴 경우를 harness 가 구분하지 못한다. 그래서 준비 단계에서 필수 도구와 버전을 먼저 확인하고, 기준 commit 이 채점을 통과하는지 실험 전에 확인한다(설계 §9). 판단 근거는 `raw/grading/<묶음>/` 의 build · 애플리케이션 로그로 사후에 확인하고, 결과 보고에 Variant 별 `error` · `timed_out` 건수를 적는다.

## 6.4 과제별 채점 묶음

| 과제 | 판정 묶음 | 진단 묶음 |
|---|---|---|
| `exp1` | `exp1` | 없음 |
| `T2-M1` ~ `T2-R2` | `exp2/<과제>` | 없음 |
| `exp3` | `exp3` | `diag-exp3-1024` |

- 판정 묶음을 모두 실행한 뒤 진단 묶음을 실행한다. 묶음마다 `run.sh` 를 따로 호출한다. 첫 호출은 Variant 를 build 하고(`GRADING_SKIP_BUILD=0`), 이후 호출은 `GRADING_SKIP_BUILD=1` 이다. 직전 호출이 시간 초과였으면 build 산출물을 믿을 수 없어 다음 호출도 build 한다
- `run.sh` 에는 허용 목록 환경 변수만 넘긴다(`PATH`, `HOME`, `JAVA_HOME`, `PLAYWRIGHT_BROWSERS_PATH`, `TZ`, `LANG`, `GRADING_LOG_DIR`, `GRADING_SKIP_BUILD`). 호출마다 build 여부를 원본에 기록한다
- 실험 1 의 "Variant 자체 시험 전체 통과"(설계 §8.1)는 Variant 의 `verify-all.sh` 가 생긴 뒤 판정 묶음과 같은 규칙의 판정 항목으로 더한다. 실패하면 `grading_failed` 다. 3단계 골격에는 없다
- 실험 2 에서 실행마다 하는 채점은 "개별 과제 판정" 이다. 설계 §8.2 의 순차 통합 뒤 채점 8개가 "실험 2 숨김 채점 결과" 이고 통합 단계 harness 가 맡는다. 3단계 골격은 실행 1개 단위만 다룬다

## 6.5 시간 제한

| 단계 | 제한 | 초과 시 |
|---|---|---|
| 준비(clone, 의존성 offline 설치, fingerprint) | 15분 | `harness_failed`, `stage = prepare` |
| Agent | 45분 | `timed_out` |
| 종료 유예(SIGTERM 후) | 30초 | SIGKILL |
| 판정 채점(묶음마다, build 포함) | 30분 | 묶음 `timed_out`, `grading_failed` |
| 진단 채점(묶음마다) | 15분 | 진단 결과 `timed_out` 기록, 상태 영향 없음 |

판정 채점의 30분은 `run.sh` 의 애플리케이션 시작 대기(120초)와 Playwright 시험별 제한으로 정상 실행이 닿지 않는 값이다. build 시간은 체크리스트 6단계의 cold build 측정값으로 다시 확인한다.

---

# 7. 재실행 정책

| 실행 결과 | 재실행 |
|---|---|
| `completed` 이고 Agent 가 `agent_succeeded` · `timed_out` · `agent_failed`(`budget_exceeded`, `oom`, `signal`, `other`) | 하지 않는다. 관찰 결과다 |
| `agent_failed` 이고 `error_kind = api_error` | 새 attempt. API 장애는 Variant 의 성질이 아니다 |
| `harness_failed`, `stage` 가 `prepare` · `agent_start` · `agent` | 새 attempt. Agent 관찰이 없거나 실행 환경 때문에 깨졌다 |
| `harness_failed`, `stage = after_agent` | Agent 를 다시 실행하지 않는다. 보존된 작업 디렉터리로 채점만 다시 실행한다(재채점) |

- 판정 순서: `error_kind = api_error` 를 먼저 본다. `api_error` 이면서 Agent 이후 단계에서 harness 가 실패한 실행도 새 attempt 다. 그다음 `harness_failed` 의 `stage` 를 본다. 비종료 상태로 남은 실행은 §6.2 의 규칙으로 정한 `stage` 를 쓴다
- `api_error` 판정 근거: `is_error` 인 result 의 `api_error_status`(HTTP 상태 숫자)가 429 이거나 500 이상. 보조로 오류 result 의 `subtype` · `error` · `errors`, `API Error:` 로 시작하는 `result` 문구와 stderr 줄. CLI 2.1.287 의 result schema 에 `api_error_status` 가 있는 것을 설치된 CLI 로 확인했다. Agent 가 쓴 그 밖의 문장과 stderr 는 보지 않는다
- 새 attempt 는 같은 실험 · 과제 · Variant · 반복 번호, 새 실행 ID, `attempt + 1`, `retry_of = <이전 실행 ID>` 다. 실패한 attempt 바로 다음 순서에 실행한다
- 반복 번호당 최대 3 attempt. 3번 모두 재실행 대상으로 끝나면 그 반복을 결측(`missing`)으로 기록하고 반복을 더하지 않는다. 결측 반복의 마지막 attempt 는 분석 데이터로 쓰지 않는다
- 재채점은 Agent 관찰을 바꾸지 않으므로 attempt 를 늘리지 않는다. 재채점 결과는 원래 실행 디렉터리 안에 따로 기록한다. 재채점 기능은 pilot 전에 구현한다(체크리스트 3단계)
- 재채점 대상은 결과가 기록되지 않은 판정 묶음이다. 이미 결과가 기록된 판정 묶음은 그 뒤에 harness 예외가 나도 기록된 결과를 쓴다
- 재채점도 첫 채점과 같이 source commit 을 새로 clone 하고 `final.patch` 를 적용한 복사본으로 한다(§6.2). `final.patch` 가 없으면(최종 diff 생성 실패) 보존된 작업 디렉터리에서 diff 를 먼저 다시 만든다
- 실행 하나에 재채점은 최대 2회다. 2회 모두 판정 결과를 내지 못하면 채점 결측으로 기록한다
- 이전 attempt 의 실행 디렉터리는 지우지 않는다. 분석은 실행 입력 hash(§8.3)마다 마지막 attempt 를 쓰고, 결과 보고에 Variant 별 재실행 · 재채점 수와 원인을 적는다
- 한 실험에서 `harness_failed` 가 실행 수의 10% 를 넘으면 실행을 멈추고 원인을 고친다. 고친 내용이 §3 · §4 의 조건을 바꾸면 §1 에 따라 그 실험을 다시 시작한다
- Claude Code 안의 API 자동 재시도는 harness 가 제어하지 않는다. 원본 stream 의 재시도 메시지 수를 기록한다(§9)

`error_kind` 판정 규칙(마지막 `result` 의 subtype · 오류 문구로 판정)은 실제 출력으로 확인하지 않았다. pilot 에서 확인한다(§10).

## 7.1 실행 순서

- 실험 1 · 3: Variant 당 5회, 모두 10개 실행의 순서를 seed 로 섞는다. seed 와 순서 파일(`lab/tasks/<실험>/schedule.json`)을 체크리스트 8단계의 tag 전에 commit 한다
- 실험 2: 회차 순서는 seed 로 섞은 A · B 교대 순서다. 한 회차의 8개 실행은 같은 Variant 이고 과제 ID 사전순으로 2개씩 실행한다
- 순서 파일을 만드는 스크립트는 체크리스트 8단계에서 작성한다

---

# 8. 실행 식별과 기록

## 8.1 실행 식별

| 키 | 값 | 성격 |
|---|---|---|
| `experiment` | `exp1`, `exp2`, `exp3`(재시작은 `.r<n>`), `pilot-<n>`, `calibration-<n>` | 입력 |
| `task` | `exp1`, `T2-M1` ~ `T2-R2`, `exp3` | 입력 |
| `variant` | `a`, `b` | 입력 |
| `repetition` | 1부터 | 입력 |
| `attempt` | 1부터 | 입력(재실행 시 harness 가 올림) |
| `source.commit` | 실행용 저장소의 40자리 commit SHA | 입력 |
| `session_id` | Claude Code 세션 UUID | 준비 단계에서 만들고 `run.json` 에 기록 |
| `run_id` | `<UTC yyyymmddTHHMMSSZ>-<16진 6자리>` | 관찰. 실행마다 새로 만든다 |
| 시작 · 종료 시각 | UTC ISO-8601, ms 단위 | 관찰 |

`run_id` 에는 Variant · 실험 이름을 넣지 않는다. 컨테이너 이름 · hostname 에 쓰이기 때문이다(§4.3).
`run.json` 은 `variant` 를 `a` · `b` 로 기록한다. 설계 §14.1 의 "Variant 를 모르는 계산" 은 지표 계산 스크립트가 `run.json` 의 `variant` 를 읽지 않는 것으로 지킨다. 설계 §14.7 의 사람 검토에는 실행 ID 만 보여 준다.

## 8.2 디렉터리

```
<결과 root>/
  experiments/<experiment>/             실험 잠금(§8.3). condition, task-<과제>, source-<variant>, grading-code 키별 파일
  runs/<run_id>/
    run.json                             실행 설정. 준비 단계에서 한 번 쓰고 바꾸지 않는다
    result.json                          정규화 결과. run.json, raw/, artifacts/ 에서 다시 만들 수 있다
    raw/                                 원본. 만든 그대로 둔다
      events.jsonl                       harness 기록(실행 시작, 상태 전이, process 종료, 채점 판정, harness 코드 상태, 오류)
      fingerprint.json                   환경 확인 명령의 출력
      harness-lab.diff                   lab/ 미commit 변경(pilot · 보정 실행만)
      prepare/                           clone 로그
      diff/                              최종 diff 생성 로그
      agent/invocation.json              Agent 실행 파일, 인자, 환경 변수 이름
      agent/stdout.jsonl                 Agent 표준 출력(stream-json) 바이트 그대로
      agent/stdout.recv.jsonl            stdout 줄마다 수신 시각
      agent/stderr.log
      agent/claude-config/               세션 기록(transcript) 복사본. 컨테이너 단계
      agent/hooks/                       hook 기록. 컨테이너 단계
      grading/copy-<round>/              채점용 복사본 생성 로그
      grading/<묶음>/<round>-<try>/      run.sh 의 GRADING_LOG_DIR(JUnit, 애플리케이션 로그, Playwright 산출물)와 run.sh 출력
    artifacts/
      final.patch                        source commit 대비 최종 diff(새 파일 포함, binary 포함)
      diff-numstat.txt, diff-name-status.txt
    workspace/shop-admin/                Agent 작업 디렉터리. 실행 후에도 지우지 않는다
    grading-workspace/<round>/shop-admin/  채점용 복사본(source commit + final.patch). 첫 채점 round 는 0
    harness/                             harness 소유 bare 저장소(source.git), 임시 index, git 용 빈 HOME
```

설계 §14.5 의 `stream.jsonl`, `transcript.jsonl`, `hooks.jsonl` 은 각각 `raw/agent/stdout.jsonl`(+ 수신 시각 파일), `raw/agent/claude-config/`, `raw/agent/hooks/` 다.
`verify.json`, `metrics.json`, `review.json` 은 이후 단계에서 실행 디렉터리에 더한다. 설계 §14.5 의 `grading.json` 은 `result.json` 의 `grading` 으로 대신한다.

## 8.3 설정과 관찰의 분리

- `run.json` 은 실행 전에 정해지는 값만 담는다. 실행 식별 입력, `session_id`, source, 실행 설정 파일 사본, 과제 정의, 과제 문구 sha256, 실행 조건 hash, 실행 입력 hash, 채점 port
- `result.json` 은 실행 중 관찰한 값만 담는다. 상태와 이력, 시각, Agent 종료, 사용량, 실제 사용 모델, diff 규모, 채점 결과, fingerprint, 원본 · 산출물 위치
- 실행 조건 hash = sha256(실행 설정 파일 정규화 JSON(key 정렬, 공백 없음) + 실행 설정 파일이 가리키는 파일(harness settings, hook 스크립트)의 sha256 목록). 이미지 digest 는 실행 설정 파일 안에 있다. 같은 실험 ID 의 모든 실행이 같아야 한다
- 실행 입력 hash = (`experiment`, `task`, `variant`, `repetition`, `source.commit`, 과제 문구 sha256, 실행 조건 hash)의 sha256. 같은 값이면 같은 조건의 같은 반복이고, attempt 와 `run_id` 만 다르다
- 실험 잠금: `experiments/<experiment>/` 아래에 키마다 파일 하나를 처음 쓴 값으로 고정한다. 키는 실행 조건 hash, 과제별 과제 문구 sha256 · 채점 묶음 정의, Variant 별 source commit 이다. 이후 값이 다른 실행은 실행 디렉터리를 만들기 전에 거부한다. 과제 문구를 읽은 뒤에 잠금을 쓴다
- harness 코드 버전: 집계 실험(`exp1` ~ `exp3`)은 `lab/` 에 미commit 변경이 없을 때만 시작한다. pilot · 보정 실행은 변경이 있어도 실행하고, 변경 목록, `git diff HEAD -- lab`, 미추적 파일 내용(1MB 넘으면 sha256)을 `raw/harness-lab.diff` 에 남긴다. 채점 직전에 `lab/` 의 commit 된 tree hash 와 미commit 변경 기록의 hash 를 시작 때와 비교하고, 다르면 `harness_failed(after_agent)` 다. 저장소의 `lab/` 밖 commit 은 비교하지 않는다
- 채점 · 과제 코드 잠금: `lab/grading`, `lab/tasks` 의 commit 된 tree hash 를 실험 잠금 키로 고정한다. harness 코드(`lab/harness`)는 §7 이 실험 중 수정을 허용하므로 잠그지 않고 실행마다 commit SHA 를 기록한다
- 결과 root 는 실행 기계마다 §2 의 경로 하나만 쓴다. 잠금은 결과 root 안에 있으므로 다른 경로를 주면 잠금이 적용되지 않는다

## 8.4 원본과 정규화 결과

- 원본(`raw/`)은 process 출력을 바이트 그대로 저장한다. 수신 시각은 원본 줄을 바꾸지 않고 별도 파일에 둔다. 설계 §14.5 의 "각 줄에 수신 시각을 붙인다" 를 이 방식으로 대신한다. 원본 바이트를 감사할 수 있게 하기 위해서다
- 정규화 결과(`result.json`)는 `run.json`, `raw/`, `artifacts/` 만 읽는 함수가 만든다. 실행 시작 시각은 실행 디렉터리를 만든 직후의 기록(`run_started`)이다. 같은 입력이면 같은 바이트를 낸다. key 순서 고정, 묶음 목록은 실행 순서, 이력은 기록 순서, 시각은 원본에 기록된 문자열, 경로는 실행 디렉터리 기준 상대 경로
- harness 는 상태가 바뀔 때마다 `result.json` 을 다시 만든다. 실패로 끝난 실행도 그때까지의 원본과 산출물을 지우지 않는다
- 실험 중 harness 코드를 고칠 수 있으므로(§7) 실행마다 `result.json` 을 만든 정규화 코드 버전이 다를 수 있다. 분석 전에 모든 `result.json` 을 한 harness commit 으로 다시 만들고, 그 commit 을 결과 문서에 적는다
- 결과 root 는 Git 작업 트리 밖이어야 한다. harness 는 결과 root 가 Git 작업 트리 안이면 시작하지 않는다
- 실험이 끝나면 그 실험의 실행 디렉터리를 archive 하고 sha256 목록을 만든다. 다시 만들 수 있는 디렉터리(`node_modules`, `build`, `.gradle`, `dist`)는 뺀다. GitHub release 파일 한도(파일당 2 GiB 미만, docs.github.com 「About releases」)를 넘으면 실행 단위로 나눈다
- archive 는 private GitHub 저장소의 release asset 으로 올리고, sha256 목록만 결과 문서와 함께 이 저장소에 commit 한다. 공개 여부는 결과 문서 단계에서 정한다 [결정 필요, 체크리스트 11단계]

---

# 9. 계측 항목

| 항목 | 출처 | 3단계 골격 |
|---|---|---|
| 경과 시간(실행 전체, Agent, 채점 묶음별) | harness 기록 시각 | 구현 |
| Agent exit code · signal · 종료 상태 | harness | 구현 |
| 시간 초과 여부, 잠자기 감지(wall · monotonic 차이) | harness | 구현 |
| attempt · `retry_of` | harness | 구현 |
| API 재시도 수 | stream 의 재시도 메시지 수 | 구현(형식은 pilot 확인) |
| input · output · cache token, 비용(USD), turn 수 | stream 마지막 `result` 의 `usage`, `total_cost_usd`, `num_turns`, `duration_ms` | 구현(형식은 pilot 확인) |
| 실제 사용 모델 | stream `system` init 의 `model`, `result.modelUsage` 의 key | 구현(형식은 pilot 확인). 주 모델과 다른 모델은 목록으로 표시 |
| 도구 호출 수(도구 이름별) | stream `assistant` 메시지의 `tool_use` 블록 | 구현(형식은 pilot 확인) |
| 생성 · 수정 · 삭제 파일 수 | `git diff --name-status`(새 파일 포함) | 구현 |
| diff 규모(추가 · 삭제 줄) | `git diff --numstat` | 구현 |
| 채점 묶음별 결과(시험 수, 실패 수, 실패 시험 이름) | JUnit XML | 구현 |
| environment fingerprint | §9.1 | 구현 |
| OOM 종료 | `docker inspect` | 컨테이너 단계 |
| 세션 기록 · hook 기록 · 시험 산출물 | 설계 §14.2, §14.3 | 컨테이너 단계 |

## 9.1 environment fingerprint

host(harness 를 실행한 기계): OS 종류와 release, CPU 아키텍처, 익명 machine id(hostname 의 sha256 앞 12자리), load average(1분), harness 의 Node.js 버전.
harness: 저장소 commit SHA, `lab/` 미commit 변경 여부.
Agent 환경: Java · Node.js · pnpm · Claude Code 버전(명령 출력 원문과 추출 값).
실행 설정: source commit SHA, 모델, effort.
fingerprint 는 clone 전에 남겨 준비 단계 실패 실행에도 기록이 있게 한다.
실행 단계에서는 Agent 컨테이너 안에서 측정한다. 3단계 골격은 harness 가 실행되는 기계에서 측정한다.

---

# 10. pilot 에서 확인할 항목

- stream-json 의 `result` · 재시도 메시지 · `system` init · `tool_use` 형식이 harness 의 정규화 코드와 맞는지. 공식 문서(https://code.claude.com/docs/en/agent-sdk/typescript)의 형식을 기준으로 썼고 실제 출력으로 확인하지 않았다
- `error_kind` 판정 규칙(`budget_exceeded`, `api_error`)
- 실행당 비용(§5.1 의 pilot 확인 규칙)
- `WebSearch` · `WebFetch` 호출이 subagent 를 포함해 0건인지. `--dangerously-skip-permissions` 와 `--disallowedTools` 를 함께 쓸 때 deny 가 적용되는지는 확인하지 않았다
- subagent 가 `claude-opus-5-5` 로 실행되는지(`modelUsage`)
- 구독 인증(`CLAUDE_CODE_OAUTH_TOKEN`)이 컨테이너 안 비대화 실행에서 동작하는지, `ANTHROPIC_API_KEY` 가 없을 때 구독으로 인증되는지
- `--max-budget-usd` 가 구독 인증에서도 계산 비용 기준으로 적용되는지
- 사용 한도 도달 시의 `api_error_status`, 오류 문구, 한도 해제 시각 표시 형식
- 인증 실패(401) · 권한 실패(403) 시의 `api_error_status` 와 종료 형식. 지금 규칙은 429 · 500 이상만 `api_error` 로 보고, 401 · 403 은 `other`(Agent 관찰)로 분류한다. 실행 환경 문제이므로 pilot 결과로 분류 규칙을 정한다
- 사용자 전역 설정이 세션 기록에 나타나지 않는지(체크리스트 3단계 다음 단계 진입 조건)

확인한 한계: Agent process 가 시간 제한과 거의 같은 시각에 스스로 끝나면 `timed_out` 으로 기록될 수 있다. harness 는 시간 초과 판정을 timer 다음 check 단계로 미뤄, 그사이 처리된 exit 이 있으면 시간 초과로 보지 않는다. 같은 event loop 회차 안에서 끝난 경우는 남는다

---

# 11. 변경 기록

| 날짜 | 변경 | 이유 |
|---|---|---|
| 2026-10-03 | 최초 작성 | 설계 §19.2 Phase 0B 결정 |
| 2026-10-03 | effort `high` → `medium`, subagent 모델 고정, 환경 변수 허용 목록, Agent 가 볼 수 있는 경로, 실패 원인 단계별 재실행, 실행 순서 | 1차 독립 검토(§12) |
| 2026-10-03 | signal 종료 분류, 비종료 상태의 stage, 재채점 규칙, 판정 채점 시간 초과 1회 재실행, 연결 경로 보완 | 2차 독립 검토(§12) |
| 2026-10-03 | 채점 입력을 채점용 복사본으로 통일, stage 값 4개로 한정, 재채점 대상을 판정 묶음 단위로 | 3차 확인(§12) |
| 2026-10-03 | 작업 디렉터리 reflog 제거와 git 설정 고정, harness 소유 git 으로 diff, `run.sh` 외부 중단 분류, 판정 기록 규칙, 채점 환경 변수 허용 목록, 재실행 판정 순서와 `api_error` 판정 근거, 잠금 키, `lab/` 미commit 변경 규칙, fingerprint 구성 | harness 골격 검토(§12 4차) |
| 2026-10-03 | `api_error_status` 판정 근거, `run.sh` 137 · 143 은 묶음 `error`, `running` 의 Agent 종료 기록 처리, 채점 · 과제 코드 잠금, 채점 직전 harness 코드 재확인, §8.2 디렉터리 표 | harness 골격 재확인(§12 5차) |
| 2026-10-03 | 채점 직전 확인을 `lab/` tree · 변경 기록 hash 로, `running` 판정 조건, 분석 전 정규화 버전 통일, §8.2 잠금 · 정규화 입력 줄, pilot 확인 항목(401 · 403) | harness 골격 최종 확인(§12 6차) |
| 2026-10-03 | 인증을 API key 에서 사용자의 Claude Max 구독(`CLAUDE_CODE_OAUTH_TOKEN`)으로 변경, USD 전체 예산을 구독 사용 한도 기준 실행 수로 변경, 사용 한도 도달 분류 | 사용자 결정 |

---

# 12. 검토 경과

1차(독립 검토, 문서 맥락을 공유하지 않는 별도 세션): blocker 0, major 4, minor 14. 근거 사실(모델 가격 · 학습 기준일, CLI 플래그, §5.2 산술)은 모두 맞다고 확인됐다.

| major | 수정 |
|---|---|
| subagent 가 다른 모델로 실행될 수 있고, settings `env` · 이미지 ENV 의 모델 변수가 실험 잠금에 잡히지 않음 | subagent 모델 고정 변수 2개(§3), 환경 변수 허용 목록(§3), 실행 조건 hash 에 참조 파일 sha256 포함(§8.3), 실제 사용 모델 기록(§9) |
| Agent 가 `run.json` 의 variant · experiment 를 읽을 수 있는 연결 경로를 막는 규칙 없음 | 컨테이너 연결 경로 표와 금지 문자열 검사(§4.3) |
| Docker · VM 재시작, 잠자기로 생긴 종료가 Agent 관찰로 분류되고 재실행되지 않음 | OOM 은 `error_kind = oom`, 그 밖의 외부 signal 과 잠자기 감지는 `harness_failed`(§6.3). `caffeinate`, 자동 갱신 끄기(§4.1) |
| Agent 종료 뒤의 harness 실패가 Agent 재실행으로 이어져 Variant 에 따라 재실행 여부가 갈림 | `stage = after_agent` 는 재채점만(§7). 판정 채점 시간 초과는 묶음 `timed_out` 으로 채점 실패(§6.3, §6.5). 진단 단계 예외는 기록만(§6.3) |

minor 14건은 모두 반영했다: JUnit 시험 0개 분류(§6.3), 실험 잠금 키와 재시작 ID(§1, §8.1), 실행 순서(§7.1), effort 근거(§2), cache write 단가(§5.1), 월 spend limit(§4.4, §5.2), pilot 한도 재계산 처리와 `budget_exceeded` 보고(§5.1), Docker Desktop 버전 표기(§2), 과제 문구 경로와 인자 위치(§3), pilot 확인 항목(§10), 실험 2 판정 이름(§6.4), 기록 형식 대응(§8.2, §8.4), 동시 실행 자리와 채점 컨테이너(§4.2), archive 크기(§8.4). 설계 · 체크리스트 쪽 대응은 설계 §20.5 와 체크리스트 0B · 3단계에 적었다.

2차(같은 검토자의 재확인): 1차 major 4건 중 3건 해소, 1건(환경 원인 종료 분류)은 수정이 넓어 새 major 가 됐다. blocker 0, 새 major 2, minor 9.

| major | 수정 |
|---|---|
| harness 가 보내지 않은 signal 을 모두 `harness_failed` 로 보내 Agent 가 원인인 종료(Bash 의 `kill`)도 재실행됨 | 외부 원인 근거(daemon · VM 재시작 기록, 잠자기 감지)가 있을 때만 `harness_failed`. 근거가 없으면 `agent_failed`, `error_kind = signal`(§6.3) |
| harness 가 `running` 에서 죽은 실행의 `stage` 미정 | 마지막 상태별 `stage` 를 정함. `running` 은 `agent`(§6.2) |

minor 9건은 모두 반영했다: 절 번호 참조(§2, 설계 §15.3 · §19.2), 연결 경로와 이미지 안 경로 구분(§4.3, 설계 §15.2 · §15.3), `PATH` · `HOME` 범위(§3), 설정 파일 내용 검사와 `/opt/cc/`(§4.3), 잠자기 감지를 모든 단계에 적용하고 판정 채점 시간 초과는 1회 다시 실행(§6.3), 재채점 조건 · 상한 · 깨끗한 복사본(§7), OOM 행 조건(§6.3), 순서 파일 commit 시점(§7.1), 컨테이너 제한의 hash 포함(§4.2).

3차(같은 검토자의 재확인): N1 · N2 와 2차 minor 9건 해소. blocker 0, major 0, minor 4. 검토자는 FROZEN 에 동의했다.
minor 4건 반영: 비종료 상태의 재채점 문구를 §7 조건으로 통일(§6.2), `stage` 값 4개로 한정(§6.3), 첫 채점도 채점용 복사본으로 실행(§6.2), 설계 §20.5 에 검토 기록 추가.

판정: blocker 0, major 0. 상태를 FROZEN 으로 정한다.

4차(harness 골격 독립 검토 A · B · C, 각각 별도 세션): Review A(실험 타당성) major 2 · minor 4, Review B(재현성) major 2 · minor 10, Review C(실패 의미) major 3 · minor 9, blocker 0. 계약 규칙으로 명시할 필요가 있는 지적을 위 변경 기록 행에 반영하고 상태를 REVIEWED 로 되돌렸다. harness 쪽 수정은 `lab/harness/` 에 있다.

5차(같은 검토자 세 명의 재확인): Review A blocker 0 · major 0 · minor 3(FROZEN 동의), Review B blocker 0 · major 0 · minor 5(§8.2 표 갱신 조건으로 FROZEN 동의), Review C blocker 0 · major 2 · minor 3. Review C 의 major 2건은 이번 수정에서 생긴 규칙 오류다. `api_error` 를 구조화된 문자열 필드로만 판정하면 CLI 2.1.287 의 `api_error_status` 를 놓친다는 것과, `run.sh` 137 · 143 을 외부 중단으로 보면 build 실패가 채점 결측이 된다는 것이다. 둘 다 위 변경 기록 행대로 고쳤고 minor 11건도 반영했다.

6차(Review B · C 최종 확인): Review B blocker 0 · major 0 · minor 4, Review C blocker 0 · major 0 · minor 3. 두 검토자 모두 FROZEN 에 동의했다(Review B 는 §8.2 두 줄 수정을 조건으로 했다). Review A 는 5차에서 동의했다. 남은 minor 7건은 위 변경 기록 행대로 반영했고, 401 · 403 분류는 §10 pilot 확인 항목으로 남겼다.

6차 판정: blocker 0, major 0. 실행 계약을 다시 FROZEN 으로 정한다.
