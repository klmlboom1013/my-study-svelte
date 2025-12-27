<aside>
💡

- 로그인 여부를 확인 한다.
- Cookie에 저장 한다.
- 포맷: JWT (JSON Web Token)
(소스코드 기준 현행화 됨: `src/lib/types/accessToken.ts`)

</aside>

## 구성 요소
- **Header**:
  - `alg` : HS256
  - `typ` : JWT
- **Payload**:
  - `iss` (Issuer): "my_study_svelte"
  - `sub` (Subject): {userId}
  - `iat` (Issued At): {생성 시간 (Unix Timestamp)}
  - `exp` (Expiration Time): {만료 시간 (iat + 6시간)}
  - `server` : {server type}
  - `site` : {site name}
  - `service` : {service option}
  - `wpayUserKey` : {wpayUserKey}
  - `wtid` : {wtid}
  - `uu` : {6자리 10진수 랜덤}
- **Signature**:
  - HMACSHA256(
      base64UrlEncode(header) + "." +
      base64UrlEncode(payload),
      hashKey
    )
  - `hashKey`는 `merchants` 설정의 `hashKey`를 사용 한다.


## 관리 방식
- 생성 및 검증을 위해 `jsonwebtoken` 또는 `jose` 라이브러리 사용을 권장 한다.
- 로그인 상태 확인
  - Cookie에서 accessToken 값 확인.
  - 토큰이 존재하면 JWT `verify` 함수로 서명 및 `exp` 만료 여부를 검증 한다.