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
- WPAY 회원 가입 처리 결과 Response Data를 받는다.
- 연동 가이드에 따라 Response Data를 검증 한다.
- Response Data 검증이 완료되면 부모 페이지를 통해 "WPAY 서비스 응답 결과 데이터 View Modal"을 오픈 한다.
- View Modal로 WPAY로 부터 받은 암호화된 Response Data와 복호화된 Response Data를 전달 한다.
  - resultMsg의 경우 URL Decode를 수행한 후 "+" 문자가 포함된 경우 공백으로 변경 한다.

### WPAY 서비스 응답 결과 데이터 View Modal.
- Modal 헤더 문구를 "WPAY Member Sign-up Result"로 변경 한다.
- ReturnUrl로 부터 받은 암호화된 데이터와 복호화된 데이터 리스트를 테이블 형태로 표시 한다.
- View 모달 하단에 "Confirm" 버튼을 표시 한다.
  - button "Confirm" click event:
    - WPAY 회원 가입이 성공인 경우:
      - localStorage key "sign-in-page" value(JSON)에 wpayUserKey를 추가 한다.
      - accessToken을 생성한다. (prompt/types/accessToken.md 참고.)
      - 메인화면으로 이동하고, View Modal을 닫는다.
      - 헤더 영역 "X" 닫기 버튼 click event 동일하게 동작 한다.
    - WPAY 회원 가입이 실패인 경우:
      - View Modal을 닫는다.
      - 헤더 영역 "X" 닫기 버튼 click event 동일하게 동작 한다.
