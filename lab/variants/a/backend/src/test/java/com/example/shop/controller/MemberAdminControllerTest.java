package com.example.shop.controller;

import static com.example.shop.support.TestFixtures.member;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.controller.admin.MemberAdminController;
import com.example.shop.domain.MemberGrade;
import com.example.shop.domain.MemberStatus;
import com.example.shop.service.MemberService;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@WebMvcTest(MemberAdminController.class)
class MemberAdminControllerTest extends WebSliceTestSupport {

  @MockitoBean MemberService memberService;

  @Test
  @DisplayName("[MBR-06] 상태 변경 본문 WITHDRAWN 은 400 VALIDATION_FAILED")
  void withdrawnIsNotAcceptedAsStatusChange() throws Exception {
    mockMvc
        .perform(
            patch("/api/admin/members/5/status")
                .session(loginAsAdmin())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"WITHDRAWN\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
        .andExpect(jsonPath("$.message").value("요청 값이 올바르지 않습니다."));
    verify(memberService, never()).changeStatus(anyLong(), any());
  }

  @Test
  @DisplayName("[MBR-07] 없는 회원 조회는 404 MEMBER_NOT_FOUND")
  void unknownMember() throws Exception {
    when(memberService.get(9999L)).thenThrow(new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

    mockMvc
        .perform(get("/api/admin/members/9999").session(loginAsAdmin()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"))
        .andExpect(jsonPath("$.message").value("회원을 찾을 수 없습니다."));
  }

  @Test
  @DisplayName("[MBR-08] 회원 목록은 ID 오름차순 배열, 각 항목에 회원 응답 필드")
  void listMembers() throws Exception {
    when(memberService.findAll())
        .thenReturn(
            List.of(
                member(1L, MemberGrade.GENERAL, MemberStatus.ACTIVE),
                member(13L, MemberGrade.VIP, MemberStatus.WITHDRAWN)));

    mockMvc
        .perform(get("/api/admin/members").session(loginAsOperator()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].id").value(1))
        .andExpect(jsonPath("$[1].id").value(13))
        .andExpect(jsonPath("$[0].name").value("회원1"))
        .andExpect(jsonPath("$[0].email").value("member1@example.com"))
        .andExpect(jsonPath("$[0].grade").value("GENERAL"))
        .andExpect(jsonPath("$[0].status").value("ACTIVE"))
        .andExpect(jsonPath("$[0].joinedAt").value("2025-01-15T10:00:00+09:00"))
        .andExpect(jsonPath("$[0].lastLoginAt").value("2026-01-14T10:00:00+09:00"))
        .andExpect(jsonPath("$[0].withdrawnAt").doesNotExist())
        .andExpect(jsonPath("$[1].withdrawnAt").value("2026-01-14T10:00:00+09:00"));
  }

  @Test
  @DisplayName("[AUT-04] 로그인 없이 회원 목록을 조회하면 401 AUTH_REQUIRED")
  void loginRequired() throws Exception {
    mockMvc
        .perform(get("/api/admin/members"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"))
        .andExpect(jsonPath("$.message").value("로그인이 필요합니다."));
  }

  @Test
  @DisplayName("[AUT-05] 운영자가 회원 등급을 바꾸면 403 ACCESS_DENIED")
  void operatorCannotChangeGrade() throws Exception {
    mockMvc
        .perform(
            patch("/api/admin/members/5/grade")
                .session(loginAsOperator())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"grade\":\"VIP\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
        .andExpect(jsonPath("$.message").value("권한이 없습니다."));
    verify(memberService, never()).changeGrade(anyLong(), any());
  }
}
