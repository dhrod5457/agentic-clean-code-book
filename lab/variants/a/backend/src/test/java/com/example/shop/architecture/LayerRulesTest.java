package com.example.shop.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "com.example.shop", importOptions = ImportOption.DoNotIncludeTests.class)
class LayerRulesTest {

  @ArchTest
  static final ArchRule L1 =
      noClasses()
          .that()
          .resideInAPackage("com.example.shop.controller..")
          .should()
          .dependOnClassesThat()
          .resideInAPackage("com.example.shop.repository..")
          .as("L1: controller 는 repository 를 참조하지 않는다");

  @ArchTest
  static final ArchRule L2 =
      noClasses()
          .that()
          .resideInAnyPackage(
              "com.example.shop.service..",
              "com.example.shop.repository..",
              "com.example.shop.domain..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage("com.example.shop.controller..", "com.example.shop.dto..")
          .as("L2: service · repository · domain 은 controller · dto 를 참조하지 않는다");
}
