package com.example.shop.service;

import com.example.shop.common.error.BusinessException;
import com.example.shop.common.error.ErrorCode;
import com.example.shop.domain.Role;
import com.example.shop.domain.Staff;
import com.example.shop.repository.StaffRepository;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffService {

  private final StaffRepository staffRepository;
  private final PasswordEncoder passwordEncoder;
  private final Clock clock;

  public StaffService(
      StaffRepository staffRepository, PasswordEncoder passwordEncoder, Clock clock) {
    this.staffRepository = staffRepository;
    this.passwordEncoder = passwordEncoder;
    this.clock = clock;
  }

  public List<Staff> findAll() {
    return staffRepository.findAll();
  }

  @Transactional
  public Staff create(
      String loginId, String name, String department, Role role, String rawPassword) {
    if (staffRepository.findByLoginId(loginId).isPresent()) {
      throw new BusinessException(ErrorCode.STAFF_LOGIN_ID_DUPLICATED);
    }
    String passwordHash = passwordEncoder.encode(rawPassword);
    OffsetDateTime now = OffsetDateTime.now(clock);
    long id;
    try {
      id = staffRepository.insert(loginId, passwordHash, name, department, role, now);
    } catch (DuplicateKeyException e) {
      throw new BusinessException(ErrorCode.STAFF_LOGIN_ID_DUPLICATED);
    }
    return new Staff(id, loginId, passwordHash, name, department, role, true, now);
  }

  /** 비활성 계정과 자기 계정도 바꿀 수 있다. */
  @Transactional
  public Staff changeRole(long id, Role role) {
    Staff staff = get(id);
    staffRepository.updateRole(id, role);
    return staff.withRole(role);
  }

  @Transactional
  public Staff deactivate(long id) {
    Staff staff = get(id);
    if (!staff.active()) {
      return staff;
    }
    staffRepository.deactivate(id);
    return staff.deactivated();
  }

  private Staff get(long id) {
    return staffRepository
        .findById(id)
        .orElseThrow(() -> new BusinessException(ErrorCode.STAFF_NOT_FOUND));
  }
}
