# Agent가 실제로 Architecture를 무너뜨리는가

작성일: 2026-10-03  
상태: 리서치 v0.1

## 1. 검증할 주장

Agentic Clean Code에서는 다음 이야기가 쉽게 나온다.

> Agent가 빠르게 코드를 추가하면 architecture drift가 빨라질 것이다.

가능성은 충분하지만 현재 단계에서 이것을 사실처럼 쓰면 안 된다.

실제 repository 관찰 연구는 더 복잡한 결과를 보여준다.

---

## 2. 151개 Java 저장소의 Agentic AI 도입 전후 분석

출처:

- Mining Architectural Quality Under Agentic AI Adoption
- https://arxiv.org/abs/2606.13298
- SEAA 2026 STREAM
- 151 Java repositories
  - treatment 74
  - matched controls 77
- 13개월 per-repository window
- 1,811 monthly Arcan snapshots

연구는 Agentic AI adoption 전후 architectural smell을 추적하고 matched control과 비교한다.

보고된 주요 결과:

- raw architectural smell count: +1.1%, p=.82
- LOC: +12.8%, p=.003
- smell density: -6.7%, p=.004
- pre-trend: 유의한 차이 없음, p=.90

### 해석

raw smell count는 사실상 유의한 변화가 없었다.

그런데 코드량이 크게 늘어났기 때문에:

~~~text
smell / KLOC
~~~

같은 density metric은 좋아진 것처럼 보였다.

즉 density만 보면:

> Agent 도입 후 architecture가 개선됐다.

고 잘못 해석할 수 있다.

연구 자체는 Agentic AI adoption이 architecture-level degradation 또는 improvement를 명확히 만들었다는 근거를 찾지 못했다.

### Agentic Clean Code에 중요한 이유

이것은 좋은 반례다.

SlopCodeBench처럼 통제된 반복 실험에서는 erosion이 보이지만, 실제 OSS observational data에서는 같은 결론이 단순하게 재현되지 않는다.

두 자료를 함께 써야 한다.

---

## 3. 이 결과가 "문제가 없다"는 뜻도 아니다

관찰 연구에는 다음 제한이 있다.

- Agent adoption 식별 정확도
- 어느 commit이 실제 Agent 작성인지
- review와 사람의 수정 효과
- Arcan smell이 포착하지 못하는 구조적 문제
- repository selection
- adoption 이후 기간의 길이

따라서 결론은:

> Agent는 architecture를 망치지 않는다.

가 아니다.

더 정확한 결론:

> **현재 실제 OSS 자료만으로 Agent 도입이 architecture smell을 일방적으로 악화시킨다고 말할 근거는 충분하지 않다.**

---

## 4. Architecture Erosion의 기존 연구

출처:

- Software Architecture Erosion: A Systematic Mapping Study
- https://doi.org/10.1002/smr.2423
- 2022
- 73 studies

기존 연구에서 architecture erosion은 Agent 이전부터 존재하던 문제다.

관찰 범주:

- architecture violation
- structural degradation
- quality degradation
- evolution 문제

원인도 기술적 원인만 있는 것이 아니다.

- 시간 압박
- knowledge loss
- architectural decision drift
- organization/process
- dependency evolution

등이 함께 나타난다.

### 연구 의미

Agentic Clean Code에서 architecture erosion을 AI만의 새로운 문제라고 설명하면 안 된다.

AI는 기존 erosion mechanism의:

- 속도
- 빈도
- 탐지 난이도
- 자동 증폭 가능성

을 바꾸는 요인으로 보는 편이 맞다.

---

## 5. Architecture Decay는 미래 변경 비용을 예측하는가

출처:

- Architectural Decay as Predictor of Issue- and Change-Proneness
- ICSA 2021
- https://arxiv.org/abs/2102.09835
- DOI: 10.1109/ICSA51549.2021.00017
- 10 open-source systems

연구는 architecture decay signal이 이후:

- issue-proneness
- change-proneness

와 연결되는지 분석한다.

결과는 일부 architecture decay 지표가 미래 변경 위험을 예측하는 데 유용할 수 있음을 보여준다.

### Agentic Clean Code와 연결

architecture smell을 미학적 문제로만 보면 안 된다.

다음 Agent가 더 자주 건드리고 더 많은 변경을 만들어야 하는 영역과 연결될 수 있다.

---

## 6. Metric에서 raw count와 density를 함께 봐야 한다

예를 들어:

~~~text
Month 1
LOC = 10,000
Smells = 100
Density = 10 / KLOC

Month 6
LOC = 20,000
Smells = 110
Density = 5.5 / KLOC
~~~

density는 크게 개선됐지만 smell 자체는 증가했다.

Agent가 코드를 빠르게 늘리는 환경에서는 denominator effect가 더 커질 수 있다.

따라서 최소 다음을 동시에 기록한다.

- absolute smell count
- smell density
- new smell introduced
- smell resolved
- architecture violation count
- affected module count
- dependency graph size

---

## 7. 더 중요한 것은 "Smell 존재"보다 "변경 경로"일 수 있다

Agentic Clean Code에서 architecture metric의 목적은 점수를 예쁘게 만드는 것이 아니다.

실제로 궁금한 것은:

> architecture 변화가 Agent의 다음 task를 어렵게 만드는가?

다.

따라서 다음을 함께 연결해야 한다.

~~~text
Architecture Signal
        ↓
Localization Cost
Change Blast Radius
Verification Cost
Conflict Rate
Follow-up Resolve Rate
~~~

이 관계가 없으면 smell count를 Agentic Clean의 목표함수로 삼기 어렵다.

---

## 8. 새로운 Metric 후보

### Architecture Erosion Velocity

N개 task마다 새로 생긴 violation/smell 수.

### Violation Persistence

생긴 architecture violation이 몇 task 동안 살아남는지.

### Boundary Crossing Growth

시간에 따라 한 task가 건너야 하는 module/package boundary 수가 늘어나는지.

### Dependency Inflation

기능 수 증가를 통제한 상태에서 dependency edge가 얼마나 빠르게 늘어나는지.

### Smell-to-Cost Correlation

특정 smell이 실제:

- files read
- files changed
- regression
- conflict
- verification time

증가와 연관되는지 본다.

---

## 9. Mechanical Enforcement의 의미도 조정한다

architecture rule의 목적은:

> architecture smell score를 낮추는 것

이 아니라:

> 중요한 경계가 무의식적인 반복 변경으로 사라지지 않게 하는 것

이다.

따라서 자동 강제 후보는 다음처럼 실제 독립성을 보호하는 규칙이어야 한다.

- module internal dependency 금지
- cycle 금지
- domain → infrastructure 역참조 금지
- public contract 우회 금지
- feature boundary 밖 DB 직접 접근 금지

반대로:

- 파일 수
- 클래스 길이
- package depth

같은 proxy를 hard rule로 만들 때는 더 신중해야 한다.

---

## 10. 장기 실험 설계

앞선 20번 문서의 Sequential Evolution 실험에서 architecture를 함께 측정한다.

각 checkpoint마다:

- dependency graph snapshot
- cycle
- architectural smell
- public API surface
- module boundary violation

을 기록한다.

중요한 것은 A/B 마지막 상태만 비교하지 않는 것이다.

~~~text
Task 0
Task 5
Task 10
Task 20
...
~~~

의 slope를 비교한다.

---

## 11. 반론을 책에 반드시 포함해야 한다

Agentic Clean Code의 신뢰도를 위해 다음을 명시하는 것이 좋다.

> 현재 자료에는 통제된 Agent 반복 개발에서 구조적 열화를 관찰한 연구가 있는 반면, 실제 Java OSS에서 Agentic AI 도입 후 architecture smell이 통계적으로 뚜렷하게 악화되지 않았다는 연구도 있다.

따라서 이 책은:

> AI가 architecture를 망친다.

를 전제로 하지 않는다.

검증할 질문은:

> 어떤 코드/검증 구조가 Agent가 반복적으로 변경해도 architecture boundary를 더 안정적으로 유지하게 하는가.

다.

---

## 12. 현재 판단

Architecture Drift는 추가 연구 가치가 있지만, 이미 결론을 정해 놓고 자료를 고르는 주제가 되어서는 안 된다.

현재 가장 방어적인 명제는 다음이다.

> **Agent 시대에는 코드 생성 속도가 architecture metric의 분모를 빠르게 바꿀 수 있으므로 density 하나로 품질을 판단하면 위험하다. Architecture 품질은 시간축의 violation 생성·해소와 실제 변경 비용을 함께 측정해야 한다.**
