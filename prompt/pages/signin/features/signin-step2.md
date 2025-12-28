<aside>
💡

WPAY PIN Auth를 수행 한다.
WPAY 회원 가입 요청 웹페이지를 window.open(popup)으로 오픈한다.

- WPAY 서비스 연동 가이드 참고
  - prompt/external/service-wpay/wpay_development_guide.md

</aside>

## WPAY PIN Auth Web Page Open

### WPAY 서비스 연동 가이드 선택
- localStorage key "sign-in-page" value(JSON)의 service 값에 따라 결정 된다.
  - wpaystd: "prompt/external/service-wpay/wpaystd/2. WPAY PIN Auth.md"
  - wpaystd2: "prompt/external/service-wpay/wpaystd2/2. WPAY PIN Auth.md"
  - wpaycst: "prompt/external/service-wpay/wpaycst/2. WPAY PIN Auth.md"
  - wpaypro: "prompt/external/service-wpay/wpaypro/2. WPAY PIN Auth.md"

### WPAY PIN Auth 처리 결과 데이터 View Modal Open.
- WPAY PIN Auth 처리 결과를 Response Data가 ReturnUrl로 전달 받으면 부모 페이지에 WPAY 서비스 연동 결과 View Modal을 오픈하고 팝업은 닫는다.
- WPAY 서비스 연동 결과 View Modal에 WPAY PIN Auth 처리 결과 Response Data를 전달 한다.
- WPAY 서비스 연동 결과 View Modal에 WPAY로 부터 받은 암호화된 데이터 리스트와 복호화된 데이터 리스트를 테이블 형태로 표시 한다.
  - resultMsg의 경우 URL Decode를 수행한 후 "+" 문자가 포함된 경우 공백으로 변경 한다.
- WPAY 서비스 연동 결과 View Modal 하단에 "확인" 버튼을 표시 한다.
  - "확인" 버튼을 클릭하면
    - WPAY PIN Auth 성공인 경우.
      - accessToken을 생성한다. (prompt/types/accessToken.md 참고.)
      - 메인 페이지로 이동하고, WPAY 서비스 연동 결과 View Modal을 닫는다.
      - "X" 닫기 버튼도 동일하게 동작 한다.
    - WPAY PIN Auth 실패인 경우.
      - localStorage key "sign-in-page" value(JSON)에 wpayUserKey를 제거 한다.
      - WPAY 서비스 연동 결과 View Modal을 닫는다.
      - "X" 닫기 버튼도 동일하게 동작 한다.
