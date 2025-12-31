<aside>
💡

WPAY 회원 가입 요청 프로세스를 처리한다.
WPAY 회원 가입 요청 웹페이지를 window.open(popup)으로 오픈한다.

- WPAY 서비스 연동 가이드 참고
  - prompt/external/service-wpay/wpay_development_guide.md

</aside>

## WPAY 회원 가입 Web Page Open

### WPAY 서비스 연동 가이드 선택

- localStorage key "sign-in-page" value(JSON)의 service 값에 따라 결정 된다.
  - wpaystd: "prompt/external/service-wpay/wpaystd/1. 회원 가입 요청.md"
  - wpaystd2: "prompt/external/service-wpay/wpaystd2/1. 회원 가입 요청.md"
  - wpaycst: "prompt/external/service-wpay/wpaycst/1. 회원 가입 요청.md"
  - wpaypro: "prompt/external/service-wpay/wpaypro/1. 회원 가입 요청.md"

### ReturnUrl Process

- WPAY 서비스 연동 가이드 내 WPAY Response Data 성공(Success) 여부 판단 조건을 참고 한다.
  - WPAY 회원 가입 성공인 경우:
    - localStorage key "sign-in-page" value(JSON)에 wpayUserKey를 추가 한다.
    - accessToken을 생성한다. (prompt/types/accessToken.md 참고.)
    - ReturnUrl 팝업을 닫고 부모(signin) 페이지를 메인 페이지로 전환한다.
  - WPAY 회원 가입 실패인 경우:
    - WPAY Result Fail View Modal을 오픈 한다.
    - View Modal로 WPAY 암호화된 Response Data와 복호화된 Response Data를 모두 전달 한다.
    - ReturnUrl 팝업을 닫는다.

### WPAY Result Fail View Modal (wpay Response Data의 Success Rule 검증 실패 시 오픈)

- Modal 헤더 문구를 "WPAY Member Sign-up Result"로 변경 한다.
- 전달 받은 WPAY 암호화된 Response Data와 복호화된 Response Data를 테이블 형태로 표시 한다.
- 헤더 영역 "X" 닫기 버튼 click event:
  - View Modal을 닫는다.
- Modal 하단 영역 "Close" click event:
  - View Modal을 닫는다.
