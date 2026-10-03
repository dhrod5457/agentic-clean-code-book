package com.example.shop.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.shop.repository.RefundRepository;
import com.jayway.jsonpath.JsonPath;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.IntFunction;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.InvocationOnMock;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;

class RefundFlowIT extends FlowTestSupport {

  private static final int RACERS = 4;

  @MockitoSpyBean RefundRepository refundRepository;

  @Test
  @DisplayName("[FLW-02] VIP 회원 160,000원 주문 → 결제 → 20,000원 환불 요청 → 승인 → 차감 3,000원, 환불 17,000원")
  void partialRefundDeductsDeliveryFee() throws Exception {
    long orderId = createPaidVipOrder(160_000);
    MockHttpSession admin = loginAsAdmin();

    MvcResult requested =
        mockMvc
            .perform(refundRequest(admin, orderId, 20_000))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("REQUESTED"))
            .andExpect(jsonPath("$.partial").value(true))
            .andReturn();

    mockMvc
        .perform(post("/api/admin/refunds/{id}/approve", idOf(requested)).session(admin))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("APPROVED"))
        .andExpect(jsonPath("$.deliveryFeeDeduction").value(3000))
        .andExpect(jsonPath("$.refundedAmount").value(17000))
        .andExpect(jsonPath("$.processedAt").value("2026-01-15T10:00:00+09:00"));
  }

  @Test
  @DisplayName(
      "[RFD-17] 같은 환불을 동시에 승인 · 거절하면 하나만 처리되고 나머지는 409 REFUND_ALREADY_PROCESSED, 결과 행은 상태와 금액이 맞다")
  void concurrentApproveAndRejectProcessOnce() throws Exception {
    long orderId = createPaidVipOrder(160_000);
    long refundId =
        idOf(
            mockMvc
                .perform(refundRequest(loginAsAdmin(), orderId, 20_000))
                .andExpect(status().isCreated())
                .andReturn());
    List<MockHttpSession> sessions = adminSessions();
    RaceGate gate = new RaceGate(RACERS);
    doAnswer(gate::passThrough).when(refundRepository).findById(refundId);

    List<MvcResult> results =
        race(
            i ->
                post("/api/admin/refunds/{id}/" + (i % 2 == 0 ? "approve" : "reject"), refundId)
                    .session(sessions.get(i)));

    List<MvcResult> succeeded = withStatus(results, 200);
    assertThat(succeeded).hasSize(1);
    assertThat(withStatus(results, 409)).hasSize(RACERS - 1);
    assertThat(codes(withStatus(results, 409))).containsOnly("REFUND_ALREADY_PROCESSED");

    Map<String, Object> stored = storedRefund(refundId);
    String winner = JsonPath.read(succeeded.get(0).getResponse().getContentAsString(), "$.status");
    assertThat(stored.get("status")).isEqualTo(winner);
    if (winner.equals("APPROVED")) {
      assertThat(stored.get("deliveryFeeDeduction")).isEqualTo(3000);
      assertThat(stored.get("refundedAmount")).isEqualTo(17000);
    } else {
      assertThat(stored.get("deliveryFeeDeduction")).isNull();
      assertThat(stored.get("refundedAmount")).isNull();
    }
  }

  @Test
  @DisplayName("[RFD-18] 같은 주문에 환불을 동시에 요청하면 하나만 등록되고 나머지는 409 REFUND_ALREADY_REQUESTED")
  void concurrentRequestsCreateOneRequestedRefund() throws Exception {
    long orderId = createPaidVipOrder(160_000);
    List<MockHttpSession> sessions = adminSessions();
    RaceGate gate = new RaceGate(RACERS);
    doAnswer(gate::passThrough).when(refundRepository).findByOrderId(orderId);

    List<MvcResult> results = race(i -> refundRequest(sessions.get(i), orderId, 10_000));

    assertThat(withStatus(results, 201)).hasSize(1);
    assertThat(withStatus(results, 409)).hasSize(RACERS - 1);
    assertThat(codes(withStatus(results, 409))).containsOnly("REFUND_ALREADY_REQUESTED");
    String refunds =
        mockMvc
            .perform(get("/api/admin/refunds").session(sessions.get(0)))
            .andReturn()
            .getResponse()
            .getContentAsString();
    List<Object> requested =
        JsonPath.read(
            refunds, "$[?(@.orderId == %d && @.status == 'REQUESTED')]".formatted(orderId));
    assertThat(requested).hasSize(1);
  }

  private long createPaidVipOrder(long unitPrice) throws Exception {
    long orderId =
        createOrder(
            VIP_MEMBER_ID,
            "[{\"productName\": \"무선 이어폰\", \"unitPrice\": %d, \"quantity\": 1}]"
                .formatted(unitPrice));
    mockMvc
        .perform(post("/api/orders/{id}/pay", orderId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.deliveryFee").value(0));
    return orderId;
  }

  private static RequestBuilder refundRequest(MockHttpSession session, long orderId, long amount) {
    return post("/api/admin/refunds")
        .session(session)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"orderId\":%d,\"amount\":%d,\"reason\":\"단순 변심\"}".formatted(orderId, amount));
  }

  private List<MockHttpSession> adminSessions() throws Exception {
    List<MockHttpSession> sessions = new ArrayList<>();
    for (int i = 0; i < RACERS; i++) {
      sessions.add(loginAsAdmin());
    }
    return sessions;
  }

  /** 요청 {@code RACERS} 개를 한꺼번에 출발시키고 모두 끝날 때까지 기다린다. */
  private List<MvcResult> race(IntFunction<RequestBuilder> requestOf) throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(RACERS);
    try {
      CountDownLatch start = new CountDownLatch(1);
      List<Future<MvcResult>> futures = new ArrayList<>();
      for (int i = 0; i < RACERS; i++) {
        RequestBuilder request = requestOf.apply(i);
        futures.add(
            executor.submit(
                () -> {
                  start.await();
                  return mockMvc.perform(request).andReturn();
                }));
      }
      start.countDown();
      List<MvcResult> results = new ArrayList<>();
      for (Future<MvcResult> future : futures) {
        results.add(future.get(30, TimeUnit.SECONDS));
      }
      return results;
    } finally {
      executor.shutdownNow();
    }
  }

  private static List<MvcResult> withStatus(List<MvcResult> results, int status) {
    return results.stream().filter(r -> r.getResponse().getStatus() == status).toList();
  }

  private static List<String> codes(List<MvcResult> results) throws Exception {
    List<String> codes = new ArrayList<>();
    for (MvcResult result : results) {
      codes.add(JsonPath.read(result.getResponse().getContentAsString(), "$.code"));
    }
    return codes;
  }

  private Map<String, Object> storedRefund(long refundId) throws Exception {
    String refunds =
        mockMvc
            .perform(get("/api/admin/refunds").session(loginAsAdmin()))
            .andReturn()
            .getResponse()
            .getContentAsString();
    List<Map<String, Object>> found =
        JsonPath.read(refunds, "$[?(@.id == %d)]".formatted(refundId));
    assertThat(found).hasSize(1);
    return found.get(0);
  }

  /**
   * 경쟁 요청이 모두 같은 상태를 읽은 뒤에 쓰도록 맞춘다. 저장소 조회가 끝난 요청은 다른 요청이 모두 조회할 때까지 기다린다. 서버가 요청을 직렬화하면 나머지 요청이 오지
   * 않으므로 잠시 뒤 문을 열어 둔다.
   */
  private static final class RaceGate {

    private final CountDownLatch arrived;

    RaceGate(int parties) {
      this.arrived = new CountDownLatch(parties);
    }

    Object passThrough(InvocationOnMock invocation) throws Throwable {
      Object result = invocation.callRealMethod();
      arrived.countDown();
      if (!arrived.await(500, TimeUnit.MILLISECONDS)) {
        while (arrived.getCount() > 0) {
          arrived.countDown();
        }
      }
      return result;
    }
  }
}
