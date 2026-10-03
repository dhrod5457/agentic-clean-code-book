package com.example.shop.controller.admin;

import com.example.shop.dto.staff.StaffCreateRequest;
import com.example.shop.dto.staff.StaffResponse;
import com.example.shop.dto.staff.StaffRoleChangeRequest;
import com.example.shop.service.StaffService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/staff")
public class StaffAdminController {

  private final StaffService staffService;

  public StaffAdminController(StaffService staffService) {
    this.staffService = staffService;
  }

  @GetMapping
  public List<StaffResponse> list() {
    return staffService.findAll().stream().map(StaffResponse::from).toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public StaffResponse create(@Valid @RequestBody StaffCreateRequest request) {
    return StaffResponse.from(
        staffService.create(
            request.loginId(),
            request.name(),
            request.department(),
            request.role(),
            request.password()));
  }

  @PatchMapping("/{id}/role")
  public StaffResponse changeRole(
      @PathVariable long id, @Valid @RequestBody StaffRoleChangeRequest request) {
    return StaffResponse.from(staffService.changeRole(id, request.role()));
  }

  @PostMapping("/{id}/deactivate")
  public StaffResponse deactivate(@PathVariable long id) {
    return StaffResponse.from(staffService.deactivate(id));
  }
}
