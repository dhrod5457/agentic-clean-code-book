package com.example.shop.service;

import static com.example.shop.support.TestFixtures.CLOCK;
import static com.example.shop.support.TestFixtures.NOW;
import static com.example.shop.support.TestFixtures.staff;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.domain.Role;
import com.example.shop.domain.Staff;
import com.example.shop.repository.StaffRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

class StaffServiceTest {

  private final StaffRepository staffRepository = mock(StaffRepository.class);
  private final PasswordEncoder passwordEncoder =
      PasswordEncoderFactories.createDelegatingPasswordEncoder();
  private final StaffService staffService =
      new StaffService(staffRepository, passwordEncoder, CLOCK);

  @Test
  @DisplayName("[STF-01] 관리자 계정을 만들면 활성, 현재 시각, 비밀번호는 원문이 아닌 encoder 일치 값")
  void createStoresEncodedPassword() {
    when(staffRepository.findByLoginId("new.staff")).thenReturn(Optional.empty());
    when(staffRepository.insert(
            eq("new.staff"), anyString(), eq("신규"), eq("물류팀"), eq(Role.OPERATOR), eq(NOW)))
        .thenReturn(1001L);

    Staff created = staffService.create("new.staff", "신규", "물류팀", Role.OPERATOR, "secret-pw1");

    ArgumentCaptor<String> hash = ArgumentCaptor.forClass(String.class);
    verify(staffRepository).insert(eq("new.staff"), hash.capture(), any(), any(), any(), any());
    assertThat(created.active()).isTrue();
    assertThat(created.createdAt()).isEqualTo(NOW);
    assertThat(hash.getValue()).isNotEqualTo("secret-pw1");
    assertThat(passwordEncoder.matches("secret-pw1", hash.getValue())).isTrue();
  }

  @Test
  @DisplayName("[STF-02] 이미 있는 로그인 ID 로 만들면 STAFF_LOGIN_ID_DUPLICATED")
  void duplicatedLoginId() {
    when(staffRepository.findByLoginId("admin"))
        .thenReturn(Optional.of(staff(1L, "admin", Role.ADMIN, true)));

    assertThatThrownBy(() -> staffService.create("admin", "이름", "운영팀", Role.ADMIN, "secret-pw1"))
        .isInstanceOfSatisfying(
            BusinessException.class,
            e -> assertThat(e.errorCode()).isEqualTo(ErrorCode.STAFF_LOGIN_ID_DUPLICATED));
    verify(staffRepository, never())
        .insert(anyString(), anyString(), anyString(), anyString(), any(), any());
  }

  @Test
  @DisplayName("[STF-03] 운영자 역할을 관리자로 바꾼다")
  void operatorToAdmin() {
    when(staffRepository.findById(2L))
        .thenReturn(Optional.of(staff(2L, "operator", Role.OPERATOR, true)));

    Staff result = staffService.changeRole(2L, Role.ADMIN);

    assertThat(result.role()).isEqualTo(Role.ADMIN);
    verify(staffRepository).updateRole(2L, Role.ADMIN);
  }

  @Test
  @DisplayName("[STF-04] 활성 계정을 비활성화하고, 비활성 계정을 다시 비활성화해도 그대로 비활성")
  void deactivateIsIdempotent() {
    when(staffRepository.findById(2L))
        .thenReturn(Optional.of(staff(2L, "operator", Role.OPERATOR, true)));
    when(staffRepository.findById(12L))
        .thenReturn(Optional.of(staff(12L, "oh.log", Role.OPERATOR, false)));

    assertThat(staffService.deactivate(2L).active()).isFalse();
    assertThat(staffService.deactivate(12L).active()).isFalse();
    verify(staffRepository).deactivate(2L);
    verify(staffRepository, never()).deactivate(12L);
    verify(staffRepository, never()).updateRole(anyLong(), any());
  }
}
