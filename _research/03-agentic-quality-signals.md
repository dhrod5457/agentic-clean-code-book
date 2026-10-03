# Empirical Signals for Agentic Code Quality

작성일: 2026-10-03  
상태: 리서치 메모

## 목적

"Agent가 코드를 더 빨리 쓰므로 개발도 빨라진다"는 가정과 "test를 통과하면 충분하다"는 가정을 실제 연구로 검토한다.

---

## 1. Functional Correctness와 Maintainability는 별도 문제다

2025년 *Quality Assurance of LLM-generated Code* 연구는 108개 논문에 대한 systematic review, 산업 워크숍, 실제 issue patch 실험을 결합했다.

주요 관찰:

- 기존 연구는 security와 performance에 상대적으로 집중
- 산업 실무자는 maintainability/readability를 중요하게 평가
- functionally correct patch도 maintainability/security/performance 측면에서 trade-off가 존재
- "tests pass"만으로 non-functional quality를 보장할 수 없음

Agentic Clean Code의 직접적인 근거다.

Definition of Done을 다음처럼 분리해야 한다.

1. Functional correctness
2. Architectural conformance
3. Maintainability
4. Security
5. Performance constraints
6. Change isolation
7. Agent verifiability

---

## 2. 실제 AI-authored commit에서도 기술 부채가 남는다

2026년 *Debt Behind the AI Boom*은 6,275 GitHub repository의 304,362 verified AI-authored commit을 분석했다.

연구진은 static analysis를 이용해 AI change 전후의 code smell, bug, security issue를 추적했다.

보고된 주요 결과:

- 484,606개의 issue 식별
- 그중 code smell이 89.1%
- 분석한 각 AI coding assistant에서 15%를 넘는 commit이 최소 한 개의 issue를 도입
- 추적된 AI-introduced issue 중 24.2%가 latest revision까지 남음

이 결과를 그대로 모든 Agent 코드에 일반화할 수는 없지만 다음 주장에는 강한 근거가 된다.

> AI가 만드는 작은 품질 저하는 자동으로 사라지지 않으며 repository history 속에 누적될 수 있다.

따라서 Agentic Clean Code에는 **Entropy Resistance / Continuous Garbage Collection**이 독립 원칙으로 필요하다.

---

## 3. Code Smell은 Agent output에도 존재하고 복제된다

2025년 연구들은 LLM generated code에 code smell이 지속적으로 나타나며, 생성 전략·prompt·model 특성에 따라 smell propensity가 달라질 수 있음을 보고한다.

또 smell-cleaned dataset으로 모델을 fine-tune할 경우 downstream quality가 바뀔 수 있다는 연구도 있다.

이것은 코드베이스 자체가 중요한 이유와 연결된다.

Coding Agent는 현재 repository의 기존 pattern을 읽고 따라 한다.

따라서 repository에 다음이 존재하면:

- duplicated helper
- giant service
- weak error handling
- hidden global state
- broad abstraction

Agent는 이를 "local convention"으로 인식해 재생산할 가능성이 있다.

즉 bad code는 사람 유지보수 비용만 만드는 것이 아니라 **future Agent output의 prior**가 된다.

---

## 4. Requirement Smell도 Agent correctness에 영향을 준다

2026년 9월 연구에서는 요구사항에 semantic/syntactic/lexical smell이 증가할수록 LLM-generated implementation의 functional correctness가 전반적으로 낮아지는 경향이 관찰됐다.

이는 Agentic Clean Code가 source code만 다뤄서는 안 된다는 근거다.

Agent task 입력도 engineering artifact다.

따라서 책에서는 다음을 분리해 다룰 필요가 있다.

- Code Cleanliness
- Repository Cleanliness
- Task Specification Cleanliness
- Verification Cleanliness

---

## 5. Flaky Test는 Agent의 feedback channel을 오염시킨다

2025년 systemic flakiness 연구에서는 24개 Java project, 10,000 suite run, 810 flaky tests를 분석했다.

연구에서는 flaky test가 독립적으로 나타나기보다 cluster를 이루는 경우가 많았고, external dependency/network 문제가 주요 root cause로 확인됐다.

Google의 장기 운영 경험에서도 flaky test는 개발 workflow를 방해하는 문제로 다뤄져 왔다.

Agent 관점에서는 flaky verifier가 특히 위험하다.

Agent는 test output을 observation으로 받아 다음 action을 선택하기 때문이다.

따라서 다음 식을 연구 가설로 둘 수 있다.

> Agent autonomy ∝ verifier reliability × diagnostic quality / verification latency

정확한 수학식이라기보다 실험 모델 후보다.

---

## 6. 자동 진단 가능성도 별도의 품질 특성이다

Google의 flaky root-cause localization 연구는 428개 프로젝트의 flaky test에 대해 code-level 원인 위치를 자동 식별하는 기법을 평가했고, case study 기준 82% accuracy를 보고했다.

중요한 실무 관찰은 다음이다.

- debugging aid는 단순해야 한다.
- developer workflow에 자연스럽게 통합되어야 한다.
- 가능한 경우 automated fix가 선호된다.

Agentic Clean Code에서 이 원리를 확장하면:

> 오류의 품질은 사람이 읽었을 때 친절한지뿐 아니라 machine localization에 얼마나 도움이 되는지로도 평가해야 한다.

후보 signal:

- stable error code
- operation name
- invariant name
- source/module hint
- structured fields
- correlation id
- artifact path
- minimal summary + detailed drill-down

---

## 7. Agent-generated Code 연구에서 아직 부족한 부분

현재 자료를 보면 다음 영역은 상대적으로 연구가 부족하다.

### 7.1 Multi-Agent Change Conflict

- 10~100개의 coding Agent가 실제 동일 repository에서 병렬 작업할 때
- hot file
- change coupling
- shared schema
- build output
- generated file

이 conflict rate에 어떤 영향을 주는지 정량 연구가 부족하다.

### 7.2 Agent Context Cost와 Architecture

repository structure가:

- files read
- token consumed
- localization attempts
- retry count

에 미치는 영향은 연구 초기 단계다.

### 7.3 UI State Reproducibility

frontend Agent가 browser navigation 없이 fixture/state story로 오류를 재현할 때 productivity와 correctness가 얼마나 향상되는지 직접 비교한 자료는 아직 추가 조사가 필요하다.

### 7.4 Long-term Architecture Drift

AI-authored commit의 smell/debt 연구는 생기고 있으나:

- domain boundary 침식
- dependency cycle 증가
- shared abstraction 증가
- hidden coupling 증가

같은 architecture-level drift를 장기간 추적한 연구는 더 찾아봐야 한다.

---

## 8. 책의 주장에 사용할 수 있는 강도

### 강하게 말할 수 있음

- test pass만으로 code quality를 설명할 수 없다.
- AI-generated code에도 maintainability/code smell 문제가 존재한다.
- flaky verifier는 자동화된 feedback loop의 신뢰성을 훼손한다.
- repository change history에는 static dependency로 보이지 않는 coupling 정보가 존재한다.
- architecture rule을 automated fitness function으로 만들 수 있다.

### 아직 가설로 둬야 함

- Agentic Clean Code 구조가 일반적으로 개발 생산성을 X% 향상한다.
- 100 Agent 병렬 작업이 사람 팀보다 효율적이다.
- 특정 파일 크기나 함수 길이가 Agent 성능을 직접 높인다.
- 특정 architecture style이 Agent에게 항상 우월하다.
- AGENTS.md가 항상 해롭거나 항상 유익하다.

---

## 주요 출처

- Sun et al., *Quality Assurance of LLM-generated Code: Addressing Non-Functional Quality Characteristics*, 2025
  - https://arxiv.org/abs/2511.10271
- Liu et al., *Debt Behind the AI Boom: A Large-Scale Empirical Study of AI-Generated Code in the Wild*, 2026
  - https://arxiv.org/abs/2603.28592
- Velasco et al., *A Causal Perspective on Measuring, Explaining and Mitigating Smells in LLM-Generated Code*, 2025
  - https://arxiv.org/abs/2511.15817
- Xue et al., *Clean Code, Better Models: Enhancing LLM Performance with Smell-Cleaned Dataset*, 2025
  - https://arxiv.org/abs/2508.11958
- Villamizar et al., *On the Impact of Requirement Smells in LLM-Based Code Generation*, 2026
  - https://arxiv.org/abs/2609.29208
- Parry et al., *Systemic Flakiness: An Empirical Analysis of Co-Occurring Flaky Test Failures*, 2025
  - https://arxiv.org/abs/2504.16777
- Google Research, *De-Flake Your Tests: Automatically Locating Root Causes of Flaky Tests in Code At Google*
  - https://research.google/pubs/de-flake-your-tests-automatically-locating-root-causes-of-flaky-tests-in-code-at-google/
