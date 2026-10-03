# 반복 변경에서 구조는 어떻게 무너지는가

작성일: 2026-10-03  
상태: 리서치 v0.1

## 1. 왜 이 자료가 필요한가

Agentic Clean Code의 중요한 주장은 "지금 한 번 잘 고치는 코드"보다 "다음 Agent가 다시 고치기 쉬운 코드"를 만들어야 한다는 것이다.

이 주장을 검증하려면 단일 issue 해결률만 보면 부족하다. 같은 저장소를 Agent가 연속해서 수정할 때 다음이 누적되는지 봐야 한다.

- 불필요한 구조 증가
- 중복 구현
- validation/error handling의 일관성 저하
- cross-file dependency 증가
- 다음 task의 난이도 증가
- 앞선 Agent가 만든 구조에 대한 후속 Agent의 적응 비용

이 문서는 단발성 SWE-bench류 평가와 달리 **시간축을 가진 Agent 유지보수** 자료를 모은다.

---

## 2. SlopCodeBench — 반복 개발 자체가 구조적 열화를 만드는가

출처:

- SlopCodeBench
- https://arxiv.org/abs/2603.24755
- 2026, 최신 v2 기준

최신 공개본은 36개 문제, 196개 checkpoint에서 15개 모델·6개 provider를 평가한다. 하나의 task를 매 checkpoint마다 초기화하지 않고 Agent가 이전에 만든 workspace 위에서 계속 기능을 확장한다.

주요 결과:

- strict checkpoint solve rate 최고값도 14.8%
- 모든 checkpoint를 끝까지 완전히 해결한 문제는 없음
- 77%의 trajectory에서 structural erosion 증가
- 75.5%에서 verbosity 증가
- Agent 코드가 비교한 473개 오픈소스 Python 저장소보다 약 2.3배 verbose
- structural erosion은 약 2.0배 높게 관찰
- checkpoint가 진행될수록 verbosity 증가 속도는 사람 코드 history 대비 약 6.6배, erosion은 약 5.0배
- quality-aware prompt는 초기 품질을 낮추는 데는 도움이 되었지만 장기 열화 추세를 막지 못함
- quality-aware prompt 조건은 평균 비용이 12.1% 늘고 correctness는 2.3%p 낮아짐

### 의미

이 결과는 "프롬프트에 Clean Code를 써 두면 된다"는 설명으로는 부족하다는 강한 신호다.

Agent가 매번 합리적인 작은 결정을 내리더라도, 이전 Agent가 만든 구조가 다음 Agent의 입력이 되면 작은 복잡성이 증폭될 수 있다.

따라서 Entropy Resistance는 선택적 부가 품질이 아니라 장기 Agent 개발의 핵심 후보로 볼 가치가 있다.

### 주의

SlopCodeBench는 통제된 benchmark다.

- 실제 조직의 code review
- 사람이 중간에 하는 대규모 refactoring
- 장기 제품 운영에서의 요구사항 우선순위 조정

을 그대로 포함하지 않는다.

따라서 "Agent를 쓰면 실제 모든 저장소의 구조가 2배 나빠진다"처럼 일반화하면 안 된다.

---

## 3. CodeThread — Agent가 만든 코드가 다음 Agent에게 더 어려운가

출처:

- Is Agent Code Less Maintainable Than Human Code?
- https://arxiv.org/abs/2606.21804
- 2026

이 연구는 같은 기능을 사람 코드와 Agent 코드로 준비한 뒤 **후속 유지보수 task**를 다시 Agent에게 시킨다.

보고된 결과에서는 Agent-authored code 위에서 작업할 때 follow-up task resolve rate가 최대 13.1% 낮아졌다.

특히 중요한 점은 전통적인 maintainability metric만으로 이 차이를 충분히 설명하기 어려웠다는 것이다.

차이는 다음과 같은 실제 후속 작업 비용에서 나타났다.

- validation/error handling 방식
- downstream 변경량
- 후속 변경에서 필요한 code size
- 기존 구조를 이해하고 수정해야 하는 난이도

### 연구 의미

Agentic Clean Code에서 코드 품질을 다음처럼 재정의할 근거가 된다.

> 이 코드가 현재 사람이 보기 깨끗한가?

뿐 아니라:

> 다음 Agent가 새로운 요구사항을 넣을 때 성공 가능성을 높이는가?

이것을 별도의 **Agent-to-Agent Maintainability** 관점으로 측정할 수 있다.

---

## 4. ChainSWE — 연속 수정이 길어지면 성능이 얼마나 떨어지는가

출처:

- ChainSWE
- https://arxiv.org/abs/2607.02606
- 2026
- 54개 Python project, 304개 chronological issue

기존 benchmark는 각 issue마다 repository를 깨끗한 초기 상태로 되돌리는 경우가 많다.

ChainSWE는 이전 issue를 해결한 코드 위에서 다음 issue를 계속 해결하게 한다.

즉 실제 유지보수에 더 가까운 조건이다.

보고된 결과에서는 chain이 길어질수록 Agent 성능이 최대 70%까지 감소했다.

### 의미

단일 task success만으로 repository의 Agent 친화성을 평가하면 장기 비용을 놓칠 수 있다.

예:

~~~text
Task 1 성공
Task 2 성공
Task 3 성공

이라고 해서

Task 50에서도 같은 성공률
~~~

을 보장하지 않는다.

책의 실험도 가능하면 단발 A/B 다음에 **연속 변경 실험**을 별도 단계로 두어야 한다.

---

## 5. SWE-CI — 한 번의 patch가 아니라 진화하는 저장소를 평가한다

출처:

- SWE-CI
- https://arxiv.org/abs/2603.03823
- 2026
- 100 tasks
- 평균 233일, 71 consecutive commits 규모의 evolution history

SWE-CI는 issue 하나를 고친 뒤 끝나는 평가가 아니라 시간에 따라 저장소가 계속 변하는 상황을 평가한다.

이 자료는 다음 구분을 명확하게 해 준다.

~~~text
Functional Patch Quality
≠
Long-Term Maintenance Quality
~~~

Agentic Clean Code가 독립된 주장으로 살아남으려면 두 번째를 설명해야 한다.

---

## 6. 실제 GitHub의 AI 작성 코드에서도 문제가 누적되는가

출처:

- The Debt Behind the AI Boom
- https://arxiv.org/abs/2603.28592
- 2026
- 304,362 verified AI-authored commits
- 6,275 repositories

연구는 484,606개의 AI-introduced issue를 추적한다.

주요 관찰:

- issue의 89.1%가 code smell 범주
- 조사한 assistant마다 15%가 넘는 commit이 적어도 하나의 issue를 도입
- 추적 가능한 AI-introduced issue 중 24.2%가 최신 revision까지 남음

이 결과는 benchmark가 아닌 실제 repository 관찰이라는 점에서 가치가 있다.

다만 provenance 판별, static-analysis issue와 실제 유지보수 비용 사이의 차이는 주의해야 한다.

---

## 7. 실제 Agent 파일은 누가 유지보수하는가

출처:

- To What Extent Does Agent-generated Code Require Maintenance?
- https://arxiv.org/abs/2605.06464
- 2026
- 100개 인기 repository, 1,000개 이상 파일, 약 3,200 changes

이 연구에서는 Agent-generated file도 이후 계속 수정되며, extension이 흔한 변경 유형으로 관찰됐다. 후속 유지보수의 상당 부분은 여전히 사람이 수행했다.

Agent가 코드를 만들었다고 그 코드가 "완료된 생성물"이 되는 것이 아니다.

그 코드 역시 기존 코드와 마찬가지로:

- 기능 추가
- bug fix
- API 변화
- refactoring
- cleanup

을 반복해서 받는다.

---

## 8. EvoCode-Bench — 지속 상태 benchmark와 verifier integrity 문제

출처:

- EvoCode-Bench
- https://github.com/UniPat-AI/EvoCodeBench
- https://unipat.ai/benchmarks/EvoCode-Bench
- 2026
- 26 stateful tasks, 227 rounds
- 같은 workspace와 Agent session을 5~15 round 유지

이 benchmark는 매 round마다 repository를 초기화하지 않고 이전 구현 결정, dependency, file layout, API choice가 다음 round에 그대로 남는 조건을 평가한다.

다만 이 자료는 **성능 수치보다 benchmark history 자체가 더 중요하다.**

2026-06-20 프로젝트는 Harbor shared multi-step verifier mode의 evaluation-integrity leak, contaminated task 1개, task/test defect 11개를 수정한 뒤 benchmark 전체를 다시 실행했다. 프로젝트는 그 날짜 이전 leaderboard와 trajectory를 superseded로 명시한다.

따라서 초기 paper/legacy runner의 MT@4 등 이전 수치를 현재 근거로 사용하지 않는다.

### 연구 의미

1. persistent workspace benchmark라는 설계는 장기 유지보수 연구에 직접 유용하다.
2. 동시에 verifier defect 하나가 long-horizon 결과 전체를 오염시킬 수 있음을 보여준다.
3. 장기 실험에서는 verifier version과 benchmark revision을 결과와 함께 고정해야 한다.

이 사례는 `22-verifier-validity.md`의 주장과 직접 연결된다.

## 9. 기존 원칙에 미치는 영향

### 9.1 Entropy Resistance를 더 강하게 정의해야 한다

기존:

> Agent가 나쁜 패턴을 복제하지 않도록 지속적으로 탐지·정리한다.

보정 후보:

> **각 변경이 다음 변경의 탐색·이해·검증 비용을 증가시키지 않도록 구조적 복잡성의 증가 속도를 감시하고 되돌릴 수 있어야 한다.**

### 9.2 "Clean"을 snapshot이 아니라 derivative로 볼 필요가 있다

현재 코드 품질을 Q(t)라고 하면 중요한 것은 현재 값만이 아니다.

~~~text
Q(t)
그리고
dQ/dt
~~~

가 모두 중요하다.

현재는 조금 복잡하더라도 장기 변경에서 안정적인 저장소가 있을 수 있고, 현재는 깔끔하지만 Agent가 계속 기능을 넣을수록 빠르게 붕괴하는 저장소도 있을 수 있다.

---

## 10. 추가 Metric 후보

### Structural Erosion Velocity

연속 N개 task 후 구조 metric 변화량.

예:

- cycles
- architectural smells
- duplicate code
- public API surface
- cross-module dependency
- file/module count
- unreachable/dead code

단순 값보다 task당 증가율을 본다.

### Follow-up Resolve Delta

~~~text
후속 task 성공률 on baseline code
-
후속 task 성공률 on Agent-evolved code
~~~

### Context Growth Rate

같은 난이도의 task를 처리하는 데 필요한:

- files read
- tokens
- search count
- commands

가 시간에 따라 얼마나 증가하는지 본다.

### Cleanup Debt

N개 feature task 뒤 independent cleanup Agent가 제거한:

- duplicate
- dead code
- broken abstraction
- stale instruction
- architecture violation

의 양과 cleanup 비용.

---

## 11. A/B 실험에 미치는 영향

현재 v0.1 실험은 단발성 세 과제이므로 그대로 유지하는 것이 좋다.

여기에 장기 변경까지 섞으면 변수 통제가 어려워진다.

대신 후속 실험을 별도로 둔다.

### Experiment L1 — Sequential Evolution

- A/B 각각 같은 초기 기능
- 동일한 10~30개 작은 요구사항을 순차 실행
- 이전 결과를 그대로 다음 task의 base로 사용
- 중간 reset 금지

측정:

- task success curve
- verification time curve
- files-read curve
- architectural violation
- duplicate/dead code
- hidden regression
- cleanup cost

### Experiment L2 — Next-Agent Maintainability

중간 checkpoint에서 새로운 Agent에게 같은 follow-up task를 준다.

비교:

- clean baseline
- Agent-evolved A
- Agent-evolved B

이 실험은 "B가 지금 고치기 쉬운가"뿐 아니라 "B에서 만든 코드가 다음 Agent에게도 쉬운가"를 본다.

---

## 12. 현재 판단

이 분야의 자료는 Agentic Clean Code의 핵심 명제를 강하게 만든다.

다만 결론은:

> Agent가 코드를 쓰면 구조가 반드시 나빠진다.

가 아니다.

더 안전한 결론은 다음이다.

> **단발성 correctness benchmark는 반복적인 Agent 개발에서 발생하는 구조적 누적 비용을 충분히 설명하지 못한다. 따라서 Agent 친화적 코드 품질은 시간축의 유지보수성과 구조적 열화 속도를 포함해 평가해야 한다.**

이 명제는 현재 자료들 사이의 공통분모로 유지할 수 있다.
