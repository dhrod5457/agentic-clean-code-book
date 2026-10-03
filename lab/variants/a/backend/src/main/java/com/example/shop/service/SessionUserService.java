package com.example.shop.service;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.domain.Staff;
import com.example.shop.repository.StaffRepository;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/** 로그인한 관리자 계정을 다룬다. 세션에는 관리자 계정 ID 만 두고 요청마다 계정을 다시 읽는다. */
@Service
public class SessionUserService {

  public static final String SESSION_STAFF_ID = "shop.staffId";

  private final StaffRepository staffRepository;
  private final PasswordEncoder passwordEncoder;

  public SessionUserService(StaffRepository staffRepository, PasswordEncoder passwordEncoder) {
    this.staffRepository = staffRepository;
    this.passwordEncoder = passwordEncoder;
  }

  /** ID 가 없거나 비밀번호가 다르거나 비활성 계정이면 모두 {@code AUTH_FAILED} 다. */
  public Staff authenticate(String loginId, String rawPassword) {
    return staffRepository
        .findByLoginId(loginId)
        .filter(Staff::active)
        .filter(staff -> passwordEncoder.matches(rawPassword, staff.passwordHash()))
        .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_FAILED));
  }

  public Optional<Staff> findActive(long id) {
    return staffRepository.findById(id).filter(Staff::active);
  }
}
