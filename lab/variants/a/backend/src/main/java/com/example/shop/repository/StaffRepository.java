package com.example.shop.repository;

import com.example.shop.domain.Role;
import com.example.shop.domain.Staff;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class StaffRepository {

  private static final String SELECT =
      """
      SELECT id, login_id, password_hash, name, department, role, active, created_at
      FROM staff
      """;

  private final JdbcClient jdbcClient;

  public StaffRepository(JdbcClient jdbcClient) {
    this.jdbcClient = jdbcClient;
  }

  public List<Staff> findAll() {
    return jdbcClient.sql(SELECT + " ORDER BY id").query(StaffRepository::map).list();
  }

  public Optional<Staff> findById(long id) {
    return jdbcClient
        .sql(SELECT + " WHERE id = :id")
        .param("id", id)
        .query(StaffRepository::map)
        .optional();
  }

  public Optional<Staff> findByLoginId(String loginId) {
    return jdbcClient
        .sql(SELECT + " WHERE login_id = :loginId")
        .param("loginId", loginId)
        .query(StaffRepository::map)
        .optional();
  }

  /** 활성 계정을 저장하고 새 관리자 계정 ID 를 돌려준다. */
  public long insert(
      String loginId,
      String passwordHash,
      String name,
      String department,
      Role role,
      OffsetDateTime createdAt) {
    KeyHolder keyHolder = new GeneratedKeyHolder();
    jdbcClient
        .sql(
            """
            INSERT INTO staff (login_id, password_hash, name, department, role, active, created_at)
            VALUES (:loginId, :passwordHash, :name, :department, :role, TRUE, :createdAt)
            """)
        .param("loginId", loginId)
        .param("passwordHash", passwordHash)
        .param("name", name)
        .param("department", department)
        .param("role", role.name())
        .param("createdAt", createdAt)
        .update(keyHolder);
    return keyHolder.getKeyAs(Long.class);
  }

  public void updateRole(long id, Role role) {
    jdbcClient
        .sql("UPDATE staff SET role = :role WHERE id = :id")
        .param("role", role.name())
        .param("id", id)
        .update();
  }

  public void deactivate(long id) {
    jdbcClient.sql("UPDATE staff SET active = FALSE WHERE id = :id").param("id", id).update();
  }

  private static Staff map(ResultSet rs, int rowNum) throws SQLException {
    return new Staff(
        rs.getLong("id"),
        rs.getString("login_id"),
        rs.getString("password_hash"),
        rs.getString("name"),
        rs.getString("department"),
        Role.valueOf(rs.getString("role")),
        rs.getBoolean("active"),
        rs.getObject("created_at", OffsetDateTime.class));
  }
}
