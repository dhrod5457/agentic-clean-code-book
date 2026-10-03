package com.example.shop.controller.admin;

import com.example.shop.dto.member.MemberGradeChangeRequest;
import com.example.shop.dto.member.MemberResponse;
import com.example.shop.dto.member.MemberStatusChangeRequest;
import com.example.shop.service.MemberService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/members")
public class MemberAdminController {

  private final MemberService memberService;

  public MemberAdminController(MemberService memberService) {
    this.memberService = memberService;
  }

  @GetMapping
  public List<MemberResponse> list() {
    return memberService.findAll().stream().map(MemberResponse::from).toList();
  }

  @GetMapping("/{id}")
  public MemberResponse get(@PathVariable long id) {
    return MemberResponse.from(memberService.get(id));
  }

  @PatchMapping("/{id}/status")
  public MemberResponse changeStatus(
      @PathVariable long id, @Valid @RequestBody MemberStatusChangeRequest request) {
    return MemberResponse.from(memberService.changeStatus(id, request.status()));
  }

  @PatchMapping("/{id}/grade")
  public MemberResponse changeGrade(
      @PathVariable long id, @Valid @RequestBody MemberGradeChangeRequest request) {
    return MemberResponse.from(memberService.changeGrade(id, request.grade()));
  }

  @PostMapping("/{id}/withdraw")
  public MemberResponse withdraw(@PathVariable long id) {
    return MemberResponse.from(memberService.withdraw(id));
  }
}
