
<aside>

💡

- Service: Rest API
- HTTP Method: GET
- URI: /{site name}/apis/schMemRegInfo
- content-type: application/x-www-form-urlencoded
- accept: application/json

</aside>

## Request Data

- Request Data 암호화 및 인코딩.
  - WPAY 연동 가이드.md의 Request Data 암호화 및 인코딩 규칙을 참고 한다.

| Name | Type | Length | Required | Encrypt | Encoded | Signing Order | Description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mid | String | 10 | ○ | | | 1 | 로그인 페이지에서 선택한 Merchant ID 또는 localStorage에 저장된 mid 값을 세팅 한다. |
| ci | String | 100 | △ | ○ | | 2 | 빈 값으로 세팅 |
| userId | String | 20 | ▲ | ○ | | 3 | 로그인 페이지에서 입력한 Member ID 또는 localStorage에 저장된 userId 값을 세팅 한다. 빈 값인 경우 "wpayTestUser01" 값을 세팅 한다. |
| hNum | String | 100 | ▲ | ○ | | 4 | localStorage에 저장된 hNum 값을 세팅 한다. |
| signature | String | 100 | | | | | 무결성 검증을 위한 값이다. "../WPAY 연동 가이드.md" 의 signature 생성 규칙을 참고 한다. |

## Response Data

- Response Data 암호화 및 인코딩.
  - WPAY 연동 가이드.md의 Response Data 암호화 및 인코딩 규칙을 참고 한다.

| Name | Type | Length | Encrypt | Encoded | Description |
| --- | --- | --- | --- | --- | --- |
| resultCode | String | 6 | | | |
| resultMsg | String | 150 | | ○ | |
| wpayUserKey | String | 100 | ○ | | |
| userId | String | 20 | ○ | | |
| status | String | 2 | | | |
| ci | String | 100 | ○ | | |

- WPAY Response Data 성공(Success) 여부 판단 조건.
  - HTTP 통신 Status Code가 200 이다.
  - Response Data의 resultCode 값이 "0000" 이다.
  - Response Data의 wpayUserKey 값이 존재 한다.
  - Response Data의 userId 값이 존재 한다.
  - Response Data의 ci 값이 존재 한다.
  - Response Data의 status 값이 "00" 이다.
  - Encrypt 속성 필드는 복호화 한다.
  - Encoded 속성 필드는 URL Decode 한다. (URL Decode 수행 후 "+" 문자가 포함된 경우 공백으로 치환 한다.)
  - Response Data의 복호화된 userId 값이 Request Data의 userId 값과 일치 한다.
