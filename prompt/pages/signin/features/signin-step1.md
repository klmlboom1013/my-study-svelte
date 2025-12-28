<aside>
💡

WPAY 회원 가입 정보 조회를 통해 회원 여부를 확인 한다.
WPAY 서비스 간 Server 통신을 한다.

- WPAY 서비스 연동 가이드 참고
  - prompt/external/service-wpay/wpay_development_guide.md

</aside>

## WPAY 회원 가입 정보 조회 API 연동

### WPAY 서비스 연동 가이드 참고
  - prompt/external/service-wpay/common-APIs/WPAY 회원 가입 정보 조회.md

### WPAY 회원 가입 정보 조회 성공.
- localStorage key "sign-in-page" value(JSON)에 wpayUserKey를 추가 한다.

### WPAY API Response Process.
- HTTP 통신 Status를 확인 한다. (OK: Http Status 200)
- 연동 가이드에 따라 Response Data를 검증 한다.
- Response Data 검증이 완료되면 "WPAY 서비스 응답 결과 데이터 View Modal"을 오픈 한다.
- View Modal로 WPAY로 부터 받은 암호화된 Response Data와 복호화된 Response Data를 전달 한다.
  - resultMsg의 경우 URL Decode를 수행한 후 "+" 문자가 포함된 경우 공백으로 변경 한다.

### WPAY 서비스 응답 결과 데이터 View Modal.
- Modal 헤더 문구를 "WPAY Member Auth Result"로 변경 한다.
- 암호화된 데이터와 복호화된 데이터 리스트를 테이블 형태로 표시 한다.
- 헤더 영역 "X" 닫기 버튼 click event:
  - 모달을 닫는다.
- View 모달 하단에 API 연동이 성공이면 "Confirm" 실패면 "Signup" 버튼을 표시 한다.
  - button "Confirm" click event: "prompt/pages/signin/features/signin-step2.md" 수행 한다.
  - button "Signup" click event: "prompt/pages/signin/features/signup.md" 수행 한다.
