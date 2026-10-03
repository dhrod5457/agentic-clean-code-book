package com.example.shop.controller;

import static com.example.shop.support.TestFixtures.SEED_PASSWORD;
import static com.example.shop.support.TestFixtures.member;
import static com.example.shop.support.TestFixtures.staff;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.shop.controller.admin.MemberAdminController;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import com.example.shop.domain.Role;
import com.example.shop.domain.Staff;
import com.example.shop.service.MemberService;
import com.example.shop.service.SessionUserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;

@WebMvcTest({AuthController.class, MemberAdminController.class})
class AuthControllerTest extends WebSliceTestSupport {

  private static final String[] ALL_PERMISSIONS = {
    "MEMBER_READ", "MEMBER_WRITE", "ORDER_READ", "ORDER_WRITE", "DELIVERY_READ",
    "DELIVERY_WRITE", "REFUND_READ", "REFUND_WRITE", "STAFF_READ", "STAFF_WRITE"
  };

  @MockitoBean MemberService memberService;

  @Test
  @DisplayName("[AUT-01] admin / test1234! 로그인은 200, 권한 10개, 세션 발급")
  void adminLogin() throws Exception {
    givenStoredStaff(staff(ADMIN_ID, "admin", Role.ADMIN, true));

    mockMvc
        .perform(login("admin", SEED_PASSWORD))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(1))
        .andExpect(jsonPath("$.loginId").value("admin"))
        .andExpect(jsonPath("$.name").value("관리자1"))
        .andExpect(jsonPath("$.role").value("ADMIN"))
        .andExpect(jsonPath("$.permissions").value(contains(ALL_PERMISSIONS)))
        .andExpect(request().sessionAttribute(SessionUserService.SESSION_STAFF_ID, ADMIN_ID));
  }

  @Test
  @DisplayName("[AUT-02] admin / 틀린 비밀번호는 401 AUTH_FAILED")
  void wrongPassword() throws Exception {
    givenStoredStaff(staff(ADMIN_ID, "admin", Role.ADMIN, true));

    mockMvc
        .perform(login("admin", "wrong-password"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTH_FAILED"))
        .andExpect(jsonPath("$.message").value("아이디 또는 비밀번호가 올바르지 않습니다."))
        .andExpect(request().sessionAttributeDoesNotExist(SessionUserService.SESSION_STAFF_ID));
  }

  @Test
  @DisplayName("[AUT-03] 비활성 계정 oh.log / test1234! 는 401 AUTH_FAILED")
  void inactiveStaffCannotLogin() throws Exception {
    givenStoredStaff(staff(12L, "oh.log", Role.OPERATOR, false));

    mockMvc
        .perform(login("oh.log", SEED_PASSWORD))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTH_FAILED"));
  }

  @Test
  @DisplayName("[AUT-07] 로그아웃 후 현재 사용자 조회는 401 AUTH_REQUIRED")
  void meAfterLogout() throws Exception {
    MockHttpSession session = loginAsAdmin();
    mockMvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk());

    mockMvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isNoContent());

    assertThat(session.isInvalid()).isTrue();
    mockMvc
        .perform(get("/api/auth/me").session(session))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
  }

  @Test
  @DisplayName("[AUT-08] operator 의 현재 사용자 권한은 READ 다섯 개와 DELIVERY_WRITE")
  void operatorPermissions() throws Exception {
    mockMvc
        .perform(get("/api/auth/me").session(loginAsOperator()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.role").value("OPERATOR"))
        .andExpect(
            jsonPath("$.permissions")
                .value(
                    contains(
                        "MEMBER_READ",
                        "ORDER_READ",
                        "DELIVERY_READ",
                        "DELIVERY_WRITE",
                        "REFUND_READ",
                        "STAFF_READ")));
  }

  @Test
  @DisplayName("[AUT-11] 같은 세션에서 역할 변경은 다음 요청부터 적용되고, 비활성화되면 401 AUTH_REQUIRED")
  void roleAndActiveAreReadPerRequest() throws Exception {
    Staff operator = staff(OPERATOR_ID, "operator", Role.OPERATOR, true);
    givenStoredStaff(operator);
    MvcResult loggedIn =
        mockMvc.perform(login("operator", SEED_PASSWORD)).andExpect(status().isOk()).andReturn();
    MockHttpSession session = (MockHttpSession) loggedIn.getRequest().getSession(false);
    when(memberService.changeGrade(5L, MemberGrade.VIP))
        .thenReturn(member(5L, MemberGrade.VIP, MemberStatus.ACTIVE));
    mockMvc.perform(changeGradeToVip(session)).andExpect(status().isForbidden());

    givenStoredStaff(operator.withRole(Role.ADMIN));
    mockMvc.perform(changeGradeToVip(session)).andExpect(status().isOk());

    givenStoredStaff(operator.withRole(Role.ADMIN).deactivated());
    mockMvc
        .perform(get("/api/auth/me").session(session))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
  }

  @Test
  @DisplayName("[AUT-12] 로그인 ID 형식은 검사하지 않아 AB 는 401 AUTH_FAILED, 빈 로그인 ID 는 400 VALIDATION_FAILED")
  void loginValidatesPresenceOnly() throws Exception {
    mockMvc
        .perform(login("AB", "x"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTH_FAILED"));
    mockMvc
        .perform(login("", "x"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
  }

  private static RequestBuilder login(String loginId, String password) {
    return post("/api/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"loginId\":\"%s\",\"password\":\"%s\"}".formatted(loginId, password));
  }

  private static RequestBuilder changeGradeToVip(MockHttpSession session) {
    return patch("/api/admin/members/5/grade")
        .session(session)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"grade\":\"VIP\"}");
  }
}
