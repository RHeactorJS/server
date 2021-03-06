Feature: /api
  All API endpoints should be discoverable

  Background: Client defaults

    Given "application/vnd.rheactorjs.core.v2+json; charset=utf-8" is the Accept header
    Given "application/vnd.rheactorjs.core.v2+json; charset=utf-8" is the Content-Type header

  Scenario: GET

    When I GET /api
    Then the status code should be 200
    And the Content-Type header should equal "application/vnd.rheactorjs.core.v2+json; charset=utf-8"
    And "$context" should equal "https://github.com/RHeactorJS/models#Index"
    And I store the link to "status" as "statusEndpoint"
    And I store the link to "login" as "loginEndpoint"
    And I store the link to "register" as "registrationEndpoint"
    And I store the link to "password-change" as "passwordChangeEndpoint"
    And I store the link to "password-change-confirm" as "passwordChangeConfirmEndpoint"
    And I store the link to "activate-account" as "accountActivationEndpoint"
    And I store the link to "create-user" as "createUserEndpoint"
    And I store the link to "create-token" as "createTokenEndpoint"
    And I store the link to the list "https://github.com/RHeactorJS/models#User" as "userList"
