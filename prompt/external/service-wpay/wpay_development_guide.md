<aside>
💡

- WPAY 서비스 API Request Data, Response Data 설정 정보를 제공 한다.
- WPAY 서비스는 Web Page를 호출하는 방식과 서버 간 API 통신하는 방식을 제공 한다.

</aside>

## WPAY 서비스 Request URL 세팅
- Domain (`prompt/constants/wpayUrls.md 참고`)
  - localStorage key "sign-in-page" value(JSON)의 service, server 값에 따라 Domain을 설정 한다.
  - "prompt/external/service-wpay/common-APIs/" 경로의 서비스를 연동하는 경우
    - service값은 무조건 "wpaystd"로 고정하여 사용할 Domain을 찾는다.
- {site name}
  - localStorage key "sign-in-page" value(JSON)의 site 값에 따라 {site name}을 설정 한다. 

### Request Data의 returnUrl
- {site name}
  - localStorage key "sign-in-page" value(JSON)의 site 값에 따라 {site name}을 설정 한다.

## 데이터 암호화/복호화

- Request Data 테이블 row 중 Encrypt 컬럼이 "○" 인 필드는 암호화 대상이다.
- Response Data 테이블 row 중 Encrypt 컬럼이 "○" 인 필드는 복호화 대상이다.
- 암호화/복호화 Key, IV는 cryptoKeys.ts의 MERCHANT_KEYS를 참고 한다.
- 암호화/복호화는 cryptoSeed.ts의 encryptSeed, decryptSeed 함수를 사용 한다.

## 데이터 URL Encoding

- Request Data 테이블 row 중 Encode 컬럼이 "○" 인 필드는 URL Encoding 대상이다.
- Response Data 테이블 row 중 Encode 컬럼이 "○" 인 필드는 URL Decoding 대상이다.

## 요청 데이터 무결성 검증

- WPAY 서비스는 Client로 부터 받은 Request Data 의 signature 필드를 이용해 무결성을 검증 한다.

## 응답 데이터 무결성 검증

- WPAY는 Response Data 무결성 검증을 위해 signature 필드 값을 세팅 한다.
- Client는 Response Data를 받아 signature를 생성하여 WPAY로 부터 받은 signature와 비교 검증 할 수 있다.
- WPAY는 Web Page로 제공하는 서비스만 Response Data에 signature를 세팅 한다.

## signature 생성 규칙

- Request Data, Response Data의 row 중 Signing Order 컬럼에 값이 존재하는 필드만 signature를 생성하는데 사용 된다.
- Signing Order 필드 순서대로 문자열 메시지 을 만든다.
  - 필드명=필드값
  - 필드정보 간 연결은 “&” 문자로 한다.
  - 문자열 메시지 가장 마지막에 hash={hashKey 값} 문자열을 추가로 연결 한다.
    - hashKey는 cryptoKeys.ts의 MERCHANT_KEYS를 참고 한다.
  - 아래는 java로 된 예제 코드 이다.

    ```java
    String mid = "INIwpayT03";
    String wpayUserKey = "SQvRwbGJb2rruRfMrUgHzVMSp7C8jyH59XwP7MVki0Q=";
    String wpayTokenValue = "gB09oEE4gECiuU3KImQbIW5EwxFZa9F+Odt0/keu5kY=";
    String email = "";
    
    String message = "mid=INIwpayT03" +
    "&" + "wpayUserKey=SQvRwbGJb2rruRfMrUgHzVMSp7C8jyH59XwP7MVki0Q=" +
    "&" + "wpayTokenValue=gB09oEE4gECiuU3KImQbIW5EwxFZa9F+Odt0/keu5kY=" +
    "&" + "email=" +
    "&" + "hashKey=" + hashKey;
    ```

- signture 생성 문자열이 완성되면 SHA256 으로 암호화 한다.
- SHA256 으로 암호화된 signture byte[] 은 hex로 인코딩 한다.
  - 아래는 java로 된 예제 코드 이다.

    ```java
    import java.security.MessageDigest;
    ...
    
    public String makeSignature (String message) {
        MessageDigest md MessageDigest.getInstance("SHA-256");
        md.update(message.getByte());
    
        StringBuilder sb = new StringBuilder();
    
        for(byte b : md.digest()) {
            String hex = Integer.toHexString(0xff & b);
            if(hex.length() == 1) {
                sb.append("0");
            }
                sb.append(hex);
        }
        return sb.toString();
    }
    ```
