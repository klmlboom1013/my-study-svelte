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

### WPAY API 서비스 HTTP 통신 후처리

- WPAY 서비스 연동 가이드 내 WPAY Response Data 성공(Success) 여부 판단 조건을 참고 한다.
  - WPAY 회원 가입 정보 조회 성공인 경우:
    - localStorage key "sign-in-page" value(JSON)에 wpayUserKey를 추가 한다.
    - signin 2단계 "prompt/pages/signin/features/signin-step2.md"를 수행 한다.
  - WPAY 회원 가입 정보 조회 실패인 경우:
    - WPAY Result Fail View Modal을 오픈 한다.
    - View Modal로 WPAY 암호화된 Response Data와 복호화된 Response Data를 모두 전달 한다.

### WPAY Result Fail View Modal (wpay Response Data의 Success Rule 검증 실패 시 오픈)

- Modal 헤더 문구를 "WPAY Member Auth Result"로 변경 한다.
- 전달 받은 WPAY 암호화된 Response Data와 복호화된 Response Data를 테이블 형태로 표시 한다.
- 헤더 영역 "X" 닫기 버튼 click event:
  - View Modal을 닫는다.
- Modal 하단영역 "Signup" 버튼 click event:
  - "prompt/pages/signin/features/signup.md" 수행 한다.
