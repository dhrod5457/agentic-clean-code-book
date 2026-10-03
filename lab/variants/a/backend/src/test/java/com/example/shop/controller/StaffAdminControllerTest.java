package com.example.shop.controller;

import static com.example.shop.support.TestFixtures.staff;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.shop.controller.admin.StaffAdminController;
import com.example.shop.domain.Role;
import com.example.shop.service.StaffService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@WebMvcTest(StaffAdminController.class)
class StaffAdminControllerTest extends WebSliceTestSupport {

  @MockitoBean StaffService staffService;

  @Test
  @DisplayName("[STF-05] 부서명 201자로 만들면 400 VALIDATION_FAILED, 200자는 201")
  void departmentLength() throws Exception {
    when(staffService.create(
            eq("new.staff"), anyString(), anyString(), eq(Role.OPERATOR), anyString()))
        .thenReturn(staff(1001L, "new.staff", Role.OPERATOR, true));

    mockMvc
        .perform(createStaff("new.staff", "가".repeat(201)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    mockMvc
        .perform(createStaff("new.staff", "가".repeat(200)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(1001));
  }

  @Test
  @DisplayName("[STF-06] 관리자 계정 목록은 ID 오름차순 배열, 비밀번호 필드 없음")
  void listStaff() throws Exception {
    when(staffService.findAll())
        .thenReturn(
            List.of(
                staff(1L, "admin", Role.ADMIN, true), staff(12L, "oh.log", Role.OPERATOR, false)));

    mockMvc
        .perform(get("/api/admin/staff").session(loginAsOperator()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].id").value(1))
        .andExpect(jsonPath("$[1].id").value(12))
        .andExpect(jsonPath("$[0].loginId").value("admin"))
        .andExpect(jsonPath("$[0].department").value("운영팀"))
        .andExpect(jsonPath("$[0].role").value("ADMIN"))
        .andExpect(jsonPath("$[1].active").value(false))
        .andExpect(jsonPath("$[0].createdAt").value("2025-01-15T10:00:00+09:00"))
        .andExpect(jsonPath("$[0].password").doesNotExist())
        .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
  }

  @Test
  @DisplayName("[STF-08] 로그인 ID AB 로 만들면 400 VALIDATION_FAILED")
  void invalidLoginId() throws Exception {
    mockMvc
        .perform(createStaff("AB", "운영팀"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    verifyNoInteractions(staffService);
  }

  private org.springframework.test.web.servlet.RequestBuilder createStaff(
      String loginId, String department) {
    return post("/api/admin/staff")
        .session(loginAsAdmin())
        .contentType(MediaType.APPLICATION_JSON)
        .content(
            """
            {"loginId": "%s", "name": "신규", "department": "%s",
             "role": "OPERATOR", "password": "secret-pw1"}
            """
                .formatted(loginId, department));
  }
}
