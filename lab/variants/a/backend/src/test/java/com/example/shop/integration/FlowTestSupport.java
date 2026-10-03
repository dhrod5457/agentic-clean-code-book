package com.example.shop.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/** 실제 Spring context 와 seed 를 넣은 H2 로 API 흐름을 확인한다. 시계는 기준 시각에 고정한다. */
@SpringBootTest(properties = "shop.clock.fixed-instant=2026-01-15T10:00:00+09:00")
@AutoConfigureMockMvc
abstract class FlowTestSupport {

  /** seed 의 VIP 활성 회원. */
  protected static final long VIP_MEMBER_ID = 4L;

  @Autowired protected MockMvc mockMvc;

  protected MockHttpSession loginAsAdmin() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"loginId\":\"admin\",\"password\":\"test1234!\"}"))
            .andExpect(status().isOk())
            .andReturn();
    return (MockHttpSession) result.getRequest().getSession(false);
  }

  protected long createOrder(long memberId, String linesJson) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/orders")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"memberId\":%d,\"lines\":%s}".formatted(memberId, linesJson)))
            .andExpect(status().isCreated())
            .andReturn();
    return idOf(result);
  }

  protected static long idOf(MvcResult result) throws Exception {
    return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
  }
}
