# 빠른 테스트가 아니라 효율적인 검증 루프

작성일: 2026-10-03  
상태: 리서치 v0.1

## 1. 문제

Agentic Clean Code는 Verification Latency를 중요하게 본다.

이 방향은 맞지만 단순히:

> 테스트가 빠르면 좋다.

로 정의하면 위험하다.

1초짜리 테스트가 실제 regression의 5%만 잡고, 30초짜리 targeted test가 80%를 잡는다면 latency만으로 두 검증기를 비교할 수 없다.

Agent에게 필요한 것은:

> **주어진 시간과 계산 비용 안에서 얼마나 신뢰도 높은 실패 신호를 빨리 얻는가.**

다.

---

## 2. Google Regression Test Selection at Scale

출처:

- Regression Test Selection at Scale
- Google Research
- ICSME 2026 Industry
- https://research.google/pubs/regression-test-selection-at-scale-2/

연구 대상:

- 10 high-impact core libraries
- 평균 test suite 약 220,000

접근:

- call graph
- graph features
- ML ranking

을 결합해 commit마다 실행할 test를 선택한다.

보고된 operating point:

- commit당 2,000 tests
- 전체 execution cost 약 0.9%
- failing commit의 40%에서 regression 탐지

### 의미

모든 test를 매 edit마다 돌리지 않아도 높은 가치의 초기 feedback을 만들 수 있다.

중요한 것은 test count가 아니라 **selection quality**다.

---

## 3. Verification Funnel로 보는 것이 좋다

Agent loop를 다음처럼 구성할 수 있다.

~~~text
Edit
 ↓
L0 static/local check
 ↓
L1 targeted tests
 ↓
L2 affected graph
 ↓
L3 integration
 ↓
L4 full regression
~~~

각 단계는 다른 역할을 가진다.

### L0

몇 초 내 실패.

- compile
- typecheck
- architecture rule
- focused unit test

### L1

수정한 feature의 behavior 확인.

### L2

dependency graph상 영향을 받는 영역.

### L3

cross-module/API/DB/browser integration.

### L4

merge 또는 release gate에서 전체 검증.

Agent에게 매 edit마다 L4를 요구하면 feedback loop가 느려진다.

반대로 L0만 믿으면 false confidence가 생긴다.

---

## 4. Develocity Predictive Test Selection의 산업 모델

출처:

- Develocity Predictive Test Selection
- 2026.2 documentation
- https://docs.gradle.com/develocity/predictive-test-selection/

이 방식은 change/test history를 이용해 관련 test를 예측하고:

- Conservative
- Standard
- Fast

같은 profile을 제공한다.

특히 pre-merge에서 선택된 relevant tests를 돌리고, post-merge에서 remaining tests를 수행해 pipeline 전체에서는 coverage를 보전하는 운영 방식을 제시한다.

항상 포함하는 예:

- 새 test
- 변경된 test
- 최근 failed test
- flaky test

### 의미

"빠른 feedback"과 "전체 coverage"는 같은 시점에 달성할 필요가 없다.

---

## 5. Historical failure가 없을 때도 선택할 수 있는가

출처:

- Predictive Test Selection Without Historical Failure Data
- ICSME 2026 Industry

이 연구는 historical failure label이 충분하지 않은 환경을 다룬다.

test와 production code가 함께 변경된 co-evolution signal을 이용해 selection label을 구성한다.

### Agentic Clean Code와 연결

새로운 repository나 빠르게 변하는 Agent-first codebase에서는 과거 failure history가 적을 수 있다.

따라서 test selection을:

- failure history
- dependency graph
- co-change
- module ownership

등 여러 signal로 구성해야 한다.

---

## 6. 기존 Nx Affected와의 연결

현재 sources에는 Nx affected graph가 이미 있다.

Nx는 changed file과 project/dependency graph를 연결해 affected set을 계산한다.

이것은 중요한 실행 가능한 예다.

~~~text
changed files
  ↓
project graph
  ↓
affected projects
  ↓
targeted test/build
~~~

Agentic Clean Code의 낮은 dependency fan-out은 여기서 직접적인 이점을 만든다.

공용 global input 하나가 바뀌면 affected set이 크게 늘어난다.

즉 architecture가 verification cost를 만든다.

---

## 7. Verification Efficiency라는 Metric

다음처럼 하나의 비율로 단순화할 수는 있다.

~~~text
Verification Efficiency
=
Detected Relevant Regressions
/
Verification Cost
~~~

하지만 실제 실험에서는 분자를 완전히 알기 어렵다.

따라서 여러 지표를 같이 본다.

### Cost

- wall time
- CPU time
- test count
- model idle time
- external service cost

### Signal

- relevant failure detected
- time to first useful failure
- hidden regression caught
- false failure
- flaky failure

---

## 8. Agent용 핵심 Metric 후보

### Time to First Trustworthy Signal

edit 후 처음으로 실제 다음 행동에 도움이 되는 검증 결과가 나올 때까지 시간.

단순 first test completion보다 낫다.

### Regression Detection per Second

통제된 mutant/known regression set으로 calibration할 수 있다.

### Affected Set Ratio

~~~text
selected affected tests
/
full test suite
~~~

### Missed Dependency Rate

affected selection이 놓친 downstream regression 비율.

### Verification Amplification

작은 변경 하나가 유발한 검증 비용.

~~~text
verification time
/
changed LOC 또는 changed module
~~~

작은 feature가 매번 전체 system test를 요구한다면 amplification이 높다.

---

## 9. Flaky test와 함께 봐야 한다

빠른 test라도 flaky하면 Agent에게는 위험하다.

Agent는 failure를 자기 code 문제로 받아들여:

- 불필요한 edit
- retry
- scope expansion

을 만들 수 있다.

따라서 Verification Efficiency는 최소:

~~~text
Latency
× Reliability
× Coverage
~~~

세 축으로 봐야 한다.

---

## 10. A/B 실험에 미치는 영향

현재 A/B는 동일 command를 제공하기 때문에 공정성 면에서는 좋다.

하지만 Agent가 실제로 어떤 verification path를 선택했는지는 별도 기록해야 한다.

예:

- focused test 먼저 실행
- 전체 test 먼저 실행
- browser test 먼저 실행
- test 없이 완료 선언

측정 후보:

- 첫 verifier command
- first trustworthy signal time
- total verification time
- test rerun count
- full-suite count
- hidden failure after declared done

이 정보는 구조가 Agent의 verifier 선택에 실제 영향을 줬는지 보여준다.

---

## 11. 후속 실험

### Experiment V1 — Dependency Fan-out와 Test Cost

같은 기능 수를 가진 두 구조에서 작은 feature 변경을 수행한다.

A:
- shared/global dependency가 상대적으로 많음

B:
- module-local dependency

각 변경의:

- affected module 수
- selected test 수
- full test 대비 비율
- missed regression

을 측정한다.

### Experiment V2 — Verification Funnel

Agent에게 전체 test command와 targeted command를 모두 제공한다.

구조만 보고 적절한 빠른 verifier를 얼마나 잘 찾는지 측정한다.

---

## 12. 현재 판단

Agentic Clean Code에서 검증의 목표는 "모든 것을 항상 돌리는 저장소"가 아니다.

더 좋은 목표는:

> **작은 변경에서는 빠르고 신뢰도 높은 국소 신호를 주고, 영향 범위가 넓어질수록 검증 범위를 기계적으로 확장하며, 최종적으로 전체 품질을 보전하는 저장소.**

따라서 Verification Latency는 유지하되 **Verification Efficiency와 Affected Verification**을 함께 다루는 것이 좋다.
