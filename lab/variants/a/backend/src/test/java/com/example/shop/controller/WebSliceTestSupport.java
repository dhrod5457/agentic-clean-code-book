package com.example.shop.controller;

import static com.example.shop.support.TestFixtures.staff;
import static org.mockito.Mockito.when;

import com.example.shop.config.ClockConfig;
import com.example.shop.config.SecurityConfig;
import com.example.shop.domain.Role;
import com.example.shop.domain.Staff;
import com.example.shop.repository.StaffRepository;
import com.example.shop.service.SessionUserService;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * web slice 시험의 공통 설정. 실제 {@link SecurityConfig} 와 {@link SessionUserService} 를 쓰고 관리자 계정 저장소만 바꿔
 * 끼운다.
 */
@Import({SecurityConfig.class, SessionUserService.class, ClockConfig.class})
@TestPropertySource(properties = "shop.clock.fixed-instant=2026-01-15T10:00:00+09:00")
public abstract class WebSliceTestSupport {

  protected static final long ADMIN_ID = 1L;
  protected static final long OPERATOR_ID = 2L;

  @Autowired protected MockMvc mockMvc;

  @MockitoBean protected StaffRepository staffRepository;

  protected MockHttpSession loginAsAdmin() {
    return sessionOf(staff(ADMIN_ID, "admin", Role.ADMIN, true));
  }

  protected MockHttpSession loginAsOperator() {
    return sessionOf(staff(OPERATOR_ID, "operator", Role.OPERATOR, true));
  }

  /** 세션에는 관리자 계정 ID 만 둔다. 계정은 요청마다 저장소에서 다시 읽는다. */
  protected MockHttpSession sessionOf(Staff staff) {
    givenStoredStaff(staff);
    MockHttpSession session = new MockHttpSession();
    session.setAttribute(SessionUserService.SESSION_STAFF_ID, staff.id());
    return session;
  }

  protected void givenStoredStaff(Staff staff) {
    when(staffRepository.findById(staff.id())).thenReturn(Optional.of(staff));
    when(staffRepository.findByLoginId(staff.loginId())).thenReturn(Optional.of(staff));
  }
}
