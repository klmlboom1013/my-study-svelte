API 관계부터 정리를 해보자

1. Endpoint
- 실제 API 연동 정보와 방법를 정의하고 설정 한다.
- HTTP Method, header, uri, Rest API or Form.submit(window.popup)
- Request & Response (Encrypt/Decrypt, URL Encoded/Decoded, Signature 생성/검증)

2. API Cetecories
- 동일한 유형별 Endpoint 들을 묶어 놓은 것이다.
- Member Token 관련 또는 Payment Token 관련 등의 Endpoint 들을 묶어서 그룹핑 한 것이다.

3. API Collections
- 비즈니스 유형 흐름대로 Endpoint들을 묶어 놓은 것이다.
- 예를 들면 wpayUserKey 유실 가맹점 결제수단 등록 요청 컬렉션은 아래와 같이 동작을 할 것이다.
  - 회원 가입 정보 조회
  - 회원 가입 정보 조회 결과 성공 시 wpayUserKey를 Response Data 로 받으므로 Paytoken 발급 요청 진행.
  - 회원 가입 정보 조회 결과 실패 비회원인 경우 wpay 회원 가입을 먼저 진행 후 Paytoken 발급 요청 진행.

4. Test Suite
- 여러개의 Endpoint를 특수한 목적으로 연결해서 그룹팡 한 형태 이다.
- 비정상 테스트를 위한 목적.
- 여러번 반복 수행이 필요한 경우.
- 특수한 상황 재현을 위한 목적.