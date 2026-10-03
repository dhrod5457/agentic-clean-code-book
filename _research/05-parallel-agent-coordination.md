# Parallel Agent Coordination and Conflict

작성일: 2026-10-03  
상태: 리서치 메모

## 1. 왜 별도 장이 필요한가

Agentic Clean Code가 기존 Clean Code와 가장 크게 갈라지는 지점 중 하나가 **동시성의 단위**다.

기존 Clean Code의 대표 독자는 한 명의 개발자 또는 한 팀이었다.

Agentic 환경에서는 동시에 다음이 가능하다.

- 10개 Agent가 서로 다른 feature 수정
- 각 Agent가 독립 worktree/container 사용
- 일부 Agent가 동일 contract를 간접적으로 변경
- merge 자체는 성공하지만 의미적으로 충돌
- test가 충분하지 않으면 충돌이 뒤늦게 발견

따라서 "파일을 충돌 없이 나눴다"는 것만으로 병렬 개발이 안전하지 않다.

---

## 2. CooperBench: 두 Agent가 같이 일할 때 오히려 성능 저하

2026년 CooperBench는 12개 open-source library, 4개 언어에서 600개가 넘는 collaborative coding task를 구성했다.

각 task는 두 Agent에게 개별적으로 구현 가능한 feature를 주지만, 함께 작업할 경우 coordination이 필요하도록 설계됐다.

보고된 핵심 결과:

- Agent들은 함께 작업할 때 단독 수행 대비 평균 성공률이 약 30% 낮아짐
- 일부 모델에서는 cooperative success가 solo 대비 거의 절반 수준
- communication은 merge conflict를 줄이기도 했지만 전체 성공률을 충분히 회복하지 못함
- 실패 유형:
  - expectation failure
  - communication failure
  - commitment failure

Agentic Clean Code 관점에서 중요한 해석:

> Agent 간 대화를 잘 시키는 것만으로는 부족하며, **코드베이스 자체가 coordination 요구량을 줄여야 한다.**

---

## 3. "Coordination을 잘하자"보다 "Coordination이 덜 필요하게 만들자"

사람 조직에서도 loose coupling의 핵심은 coordination skill을 무한히 높이는 것이 아니다.

DORA가 설명하듯 좋은 architecture는 작은 팀이 다른 팀과 세밀하게 조율하지 않고 변경·테스트·배포할 수 있게 한다.

Agent에도 같은 원리가 적용될 수 있다.

### 나쁜 병렬 구조

Agent A:
- authentication contract 변경

Agent B:
- 기존 auth contract를 호출하는 export feature 구현

둘은 서로 다른 파일을 수정해서 git conflict는 없다.

그러나 B는 stale assumption 위에서 작업한다.

### 좋은 방향

- versioned/typed contract
- compatibility test
- dependency notification
- local verifier
- cross-task dependency metadata

를 통해 semantic conflict를 즉시 드러낸다.

---

## 4. Textual Conflict와 Semantic Conflict를 분리한다

### Textual Conflict

같은 file/line을 수정.

Git이 어느 정도 감지 가능.

### Structural Conflict

다른 파일이지만 동일 symbol/interface/schema를 수정.

static dependency graph로 일부 탐지 가능.

### Semantic Conflict

서로 다른 파일이고 compile도 되지만 behavior assumption이 충돌.

예:

- 한 Agent가 validation rule 강화
- 다른 Agent는 예전 validation assumption으로 batch import 작성
- 각각의 branch test는 통과
- 합친 뒤 실제 workflow에서 실패

Agentic Clean Code는 특히 세 번째를 다뤄야 한다.

---

## 5. 2026년 Multi-Agent Benchmark 흐름

### CooperBench

- independent feature + potential conflict
- communication/coordination 능력 측정

### AsynCodeBench

최근 연구는 task final pass만 보지 않고 cross-agent dependency 자체를 explicit graph로 표현하고 Dependency Checker를 두는 방향을 제안한다.

이 접근은 Agentic Clean Code와 매우 잘 맞는다.

중요한 생각:

> 병렬 task 사이의 dependency가 암묵적으로 존재하면 실패가 늦게 발견된다.  
> dependency를 executable artifact로 만들면 coordination quality를 측정할 수 있다.

후보 artifact:

- API/schema contract
- compatibility matrix
- feature dependency graph
- invariant test
- shared resource declaration

---

## 6. Agent Parallelism을 위한 Codebase Rule 후보

### P1. Independent-by-default

새 feature는 가능한 한 기존 module 수정 없이 추가 가능해야 한다.

### P2. No Mandatory Central Registration

새 기능마다 아래 파일을 수정해야 하는 구조를 경계한다.

- global route table
- central registry
- shared index
- permission mega-map
- single global config

### P3. Explicit Cross-Task Contract

두 module이 의미적으로 연결되면 그 관계를 type/schema/test로 드러낸다.

### P4. Contract Compatibility

interface 변경 시 consumer compatibility를 자동 검증한다.

### P5. Isolated Verification

한 Agent의 verifier가 다른 Agent workspace/runtime state에 의존하지 않는다.

### P6. Shared Resource Declaration

port, DB, filesystem path, cache, generated output 등 exclusive/shared resource를 명시한다.

### P7. Integration Oracle

각 branch test 외에 조합된 변경을 검증하는 oracle이 필요하다.

---

## 7. Hot File은 병렬 Agent의 Lock이다

central file은 사실상 serialized lock과 비슷하다.

예를 들어 20개의 task가 모두 `routes.ts`를 수정해야 한다면:

```
20 independent feature tasks
        ↓
1 shared registration point
        ↓
effective parallelism 감소
```

따라서 병렬성을 평가할 때 code line count보다 **Shared Modification Surface**를 측정해야 한다.

후보 metric:

### Shared Touch Ratio

```
commits touching shared files / feature commits
```

### Cross-Domain Hotness

```
number of bounded contexts touching a file
```

### Parallel Collision Surface

```
files touched by >1 concurrent task / all changed files
```

---

## 8. Dependency Graph가 새로운 설계 산출물이 될 수 있다

AsynCodeBench 흐름을 확장하면, Agentic repository에서는 task dependency 자체가 first-class artifact가 될 수 있다.

예:

```
TASK-A
  produces: UserPermissionSchema.v2

TASK-B
  consumes: UserPermissionSchema >= v1

TASK-C
  independent-of: TASK-A
```

이것을 사람이 매번 적는 방향보다 가능한 한 build/type/schema graph에서 자동 추출하는 것이 좋다.

---

## 9. 병렬 작업에서 Isolation의 역설

worktree/container isolation은 다음 문제를 해결한다.

- filesystem overwrite
- generated output collision
- port collision
- uncommitted change pollution

그러나 isolation이 강하면 다른 Agent의 최신 변경을 보지 못해 stale assumption 문제가 생길 수 있다.

따라서:

> **Execution isolation과 contract visibility를 동시에 가져가야 한다.**

즉:

- source workspace는 격리
- cross-task contract/change signal은 공유
- integration verifier는 별도

구조가 유력하다.

---

## 10. Agentic Clean Code에서의 목표

목표는 Agent들이 더 많은 메시지를 주고받게 하는 것이 아니다.

목표는:

> **서로 대화하지 않아도 안전하게 진행할 수 있는 task 비율을 높이고, 정말 필요한 dependency만 기계적으로 노출하는 것.**

이것이 사람 팀의 low coordination architecture와 Agent parallelism을 연결하는 가장 중요한 원칙 후보다.

---

## 주요 출처

- Khatua et al., *CooperBench: Why Coding Agents Cannot be Your Teammates Yet*, 2026
  - https://arxiv.org/abs/2601.13295
- Zhang et al., *AsynCodeBench: Benchmarking Collaboration of Asynchronous Multi-Agent Systems in Software Engineering*, 2026
  - https://arxiv.org/abs/2609.32662
- DORA, Loosely Coupled Teams
  - https://dora.dev/capabilities/loosely-coupled-teams/
- Anthropic, *Building a C compiler with a team of parallel Claudes*
  - https://www.anthropic.com/engineering/building-c-compiler


---

## 11. Worktree를 줄이는 것이 목표가 될 수 있는가

추가 리서치 결과, Worktree 자체를 줄이는 것을 직접 목표로 삼기보다 **Worktree 없이도 안전한 Task 비율**을 높이는 방향이 더 정확하다.

Git Worktree는 각 작업의 파일뿐 아니라 `HEAD`, `index` 같은 Git 상태도 분리한다. 따라서 같은 checkout을 여러 Agent가 공유하면서 각자 `git add/commit/reset/rebase`까지 수행하는 것은 코드 경계가 좋아도 안전하지 않다.

반면 다음 조건이 갖춰지면 일부 Task는 shared workspace 후보가 될 수 있다.

- write scope가 서로 겹치지 않음
- cross-module contract 변경 없음
- generated output이 task-local
- port/DB/cache 같은 runtime resource가 격리됨
- build/test가 source tree를 오염시키지 않음
- Git write operation은 coordinator가 직렬화

Anthropic의 16-Agent C compiler 실험에서도 Agent마다 container와 clone을 줬지만 하나의 큰 문제에 모든 Agent가 몰리자 병렬성은 나오지 않았다. 문제를 파일/실패 단위로 분해한 뒤에야 병렬성이 살아났다.

따라서 이 문서의 기존 결론을 다음처럼 확장한다.

> **Worktree는 execution isolation을 제공한다. Agentic architecture는 coordination이 필요 없는 change surface를 늘린다. 둘은 대체 관계가 아니다.**

상세 연구와 Hybrid Isolation 실험 설계는 `18-worktree-minimization.md` 참조.
