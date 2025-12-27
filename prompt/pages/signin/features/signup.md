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
  - WPAYSTD: "prompt/external/service-wpay/wpaystd/1. 회원 가입 요청.md"
  - WPAYSTD2: "prompt/external/service-wpay/wpaystd2/1. 회원 가입 요청.md"
  - WPAYCST: "prompt/external/service-wpay/wpaycst/1. 회원 가입 요청.md"
  - WPAYPRO: "prompt/external/service-wpay/wpaypro/1. 회원 가입 요청.md"

### WPAY 회원 가입 성공.
- localStorage key "sign-in-page" value(JSON)에 wpayUserKey를 추가 한다.
- accessToken을 생성한다.
  - prompt/types/accessToken.md 참고.

### WPAY 회원 가입 처리 결과 데이터 View Modal Open.
- WPAY 회원 가입 처리가 완료 되고 팝업이 닫히면 View 모달을 오픈한다.
- WPAY 회원 가입 처리 결과 Response Data를 받는다.
- WPAY로 부터 받은 암호화된 데이터 리스트와 복호화된 데이터 리스트를 테이블 형태로 View 모달에 표시 한다.
  - resultMsg의 경우 URL Decode를 수행한 후 "+" 문자가 포함된 경우 공백으로 변경 한다.
- View 모달 하단에 "확인" 버튼을 표시 한다.
  - "확인" 버튼을 클릭하면 WPAY 회원 가입 성공인 경우 메인화면으로 이동하고, 실패한 경우 모달을 닫는다.
    - 상단의 "X" 버튼 클릭도 동일하게 동작 한다.
