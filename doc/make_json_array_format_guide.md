# 연동문서 JSON Array 포멧으로 구성.

## WPAY.STD 2.0 API 연동문서의 API 연동규약을 JSON Array 포멧으로 구성 한다.

### WPAY.STD 2.0 API 연동문서.
- 파일위치: ./doc/WPAY.STD 2.0 API 연동가이드_v2.1.0.pdf

### WPAY.STD 2.0 API 연동문서 내 Json Array 포멧 변환 대상 API 목록.

- [27 페이지] 3.4 WPAY 회원 가입 (Web UI)
- [31 페이지] 3.5 WPAY 회원 서비스 해지
- [33 페이지] 3.6.1 결제정보 등록 – 신용카드(Web UI)
- [37 페이지] 3.6.2 결제정보 등록 – 오픈뱅킹 계좌(Web UI)
- [140 페이지] 3.22 WPAY 회원설정 – 마이페이지(화면UI)

- [43 페이지] 3.6.4 결제정보 등록 – 신용카드 + billkey (Web UI)


- [47 페이지] 3.7 WPAY 결제정보 삭제
- [49 페이지] 3.8.1 결제 비밀번호 인증(Web UI)
- [52 페이지] 3.8.2 결제 비밀번호 변경(Web UI)
- [54 페이지] 3.9.1 결제 인증 – 신용카드(Web UI)
- [59 페이지] 3.9.2 결제 인증 – 오픈뱅킹 계좌(Web UI)
- [63 페이지] 3.9.3 결제 인증 – 휴대폰 (WEB UI)
- [67 페이지] 3.9.4 결제 요청 – 표준 (WEB UI)

- [78 페이지] 3.10.1 자동결제 신청 (정기결제) (Web UI)
- [82 페이지] 3.10.2 자동결제 신청 표준 (정기결제) (Web UI)
- [86 페이지] 3.11.1 결제 승인 – 신용카드
- [91 페이지] 3.11.2 결제 승인 – 오픈뱅킹 계좌
- [95 페이지] 3.11.3 결제 승인 – 휴대폰
- [98 페이지] 3.11.4 결제 승인 – WPAYPLUS 자동결제 승인
- [102 페이지] 3.12 WPAY 결제 승인 망취소
- [104 페이지] 3.13 WPAY 회원정보 조회
- [112 페이지] 3.15.1 결제정보 등록 상태 조회 (일반결제 토큰)
- [116 페이지] 3.15.2 결제정보 등록 상태 조회 (정기결제 토큰)
- [129 페이지] 3.17 WPAY 주 결제수단 설정
- [131 페이지] 3.18 WPAY 결제정보 별칭 설정
- [138 페이지] 3.21 WPAY 자동결제 해지 (정기결제)
- [143 페이지] 3.23 결제취소 환불 및 부분취소 (INIAPI 연동)


### WPAY.STD 2.0 API 연동문서 내 Json Array 포멧 변환 제외 대상 API 목록.

- [132 페이지] 3.19 현금영수증 정보 조회
- [135 페이지] 3.20 현금영수증 정보 변경(등록,수정,삭제)
- [70 페이지] 3.9.5 결제 요청 – 신용카드 장바구니 결제 (WEB UI)
- [75 페이지] 3.9.6 결제 요청 – 표준 장바구니 결제 (WEB UI)
- [40 페이지] 3.6.3 결제정보 등록 – 휴대폰 (WEB UI)
- [120 페이지] 3.16.1 WPAY 결제정보 리스트 조회 (일반결제)
- [125 페이지] 3.16.2 WPAY 결제정보 리스트 조회 (정기결제)
- [106 페이지] 3.14 WPAY 가맹점정보 통합 조회


### Json Array 포멧 변환 규칙.

#### 1. Request Data Format을 JSON Array로 구성한다.
```json
[
    {
      "name": "", /* 요청 필드명}*/
      "type": "", /* 데이터 타입 (string, number, boolean)*/
      "required": "", /* 필수 여부 (true, false)*/
      "encrypt": "", /* 데이터 암호화 여부 (true, false), signature 필드는 무조건 false*/
      "encoded": "", /* 데이터 URL인코딩 여부 (true, false)*/
      "description": "", /* 필드 설명*/
      "length": "", /* 필드 길이 (number type 으로)*/
      "signingOrder": "", /* signature 생성 순서 (number type 으로 1부터 시작)*/
    }
]
```
#### 2. Response Data Format을 JSON Array로 구성한다.
```json
[
  {
    "name": "", /* 응답 필드명*/
    "type": "", /* 데이터 타입 (string, number, boolean)*/
    "encrypt": "", /* 데이터 암호화 여부 (true, false), signature 필드는 무조건 false*/
    "decoded": "", /* 데이터 URL디코딩 여부 (true, false)*/
    "description": "", /* 필드 설명*/
    "length": "", /* 필드 길이 (number type 으로)*/,
    "signingOrder": "", /* signature 생성 순서 (number type 으로 1부터 시작)*/
  }
]
```

#### 3. Request의 encoded, Response의 decoded 값 세팅
- 연동전문의 Note 컬럼에 "UTF-8 URLEncoding" 가 있는지 여부로 확인 한다.

#### 4. signOrder 필드 생성 규칙.
- 각 API 연동 전문 내 signature 필드값 생성 안내 항목을 참고한다.


#### 5. signingOrder 필드 제거 규칙.
- Json Array 생성 결과에서 signingOrder가 0이면 Json Member에서 signingOrder 필드를 제거 한다.
- WPAY와 Server to Server 통신을하는 API통신의 경우 Response에 signature 필드가 없으므로 signingOrder 필드를 제거 한다.

#### 6. description 작성 방법.
- () 안의 설명은 무시 하고 description에 작성 하지 않는다.
- wpayUserKey는 "WPAY 고객 고유 식별 값" 으로 작성 한다.
- ci는 "본인인증기관으로부터 받은 고유식별 값" 으로 작성 한다.
- mid는 "Merchant ID" 로 작성 한다.
- signature는 "데이터 무결성 검증을 위한 SHA256 해시값" 으로 작성 한다.
- returnUrl은 "WPAY 처리 결과를 전달 받을 callback URL" 으로 작성 한다.
- wpayToken은 "결제토큰" 으로 작성 한다.
- cardPdName은 "카드상품명" 으로 작성 한다.
- cardPdNum는 "카드상품번호" 으로 작성 한다.
- bankCardNo는 "마스킹된 카드번호" 으로 작성 한다.
- cardIsscoCode는 "발급사 코드 (사용카드사: KB, BC, 하나)" 으로 작성 한다.
- checkFlg는 "카드유형 (0:신용, 1:체크, 2:선불)" 으로 작성 한다.
- cardTypeFlg는 "개인/법인 구분 (0:개인, 1:법인)" 으로 작성 한다.

#### 7. Json 필드 정렬
- signingOrder를 기준으로 오름차순 정렬 한다.
- signature 필드 위치는 signingOrder가 가장 큰 필드 다음에 위치 한다.

### Json Array 포멧 변환 파일 생성.
- Json Array 포멧 변환이 완료되면 "./doc/convert-json" 경로에 해당 연동 전문 이름으로 Json 파일을 생성하여 저장 한다.
  - 예시: 3.4 WPAY 회원 가입 (Web UI) 전문을 Json Array 포멧 변환하여 "./doc/convert-json/WPAY_회원_가입.json" 파일로 저장 한다.

### Json Array 포멧 변환 예시
- 3.4 WPAY 회원 가입 (Web UI) 전문 Json Array 포멧 변환 예시
```json
/* Request */
[
  {
    "name": "mid",
    "type": "string",
    "required": true,
    "encrypt": false,
    "encoded": false,
    "description": "Merchant ID",
    "length": 10,
    "signingOrder": 1
  },
  {
    "name": "userId",
    "type": "string",
    "required": true,
    "encrypt": true,
    "encoded": false,
    "description": "가맹점 사용자ID",
    "length": 20,
    "signingOrder": 2
  },
  {
    "name": "ci",
    "type": "string",
    "required": false,
    "encrypt": true,
    "encoded": false,
    "description": "본인인증기관으로부터 받은 고유식별 값 ",
    "length": 20,
    "signingOrder": 3
  },
  {
    "name": "userNm",
    "type": "string",
    "required": false,
    "encrypt": false,
    "encoded": true,
    "description": "사용자 이름",
    "length": 100,
    "signingOrder": 4
  },
  {
    "name": "hNum",
    "type": "string",
    "required": false,
    "encrypt": true,
    "encoded": false,
    "description": "휴대폰번호(숫자만 허용)",
    "length": 100,
    "signingOrder": 5
  },
  {
    "name": "hCorp",
    "type": "string",
    "required": false,
    "encrypt": false,
    "encoded": false,
    "description": "통신사코드 #[SKT, KFT, LGT, SKTR, KFTR, LGTR]",
    "length": 3,
    "signingOrder": 6
  },
  {
    "name": "birthDay",
    "type": "string",
    "required": false,
    "encrypt": true,
    "encoded": false,
    "description": "생년월일 (YYYYMMDD)",
    "length": 8,
    "signingOrder": 7
  },
  {
    "name": "sosialNo2",
    "type": "string",
    "required": false,
    "encrypt": false,
    "encoded": false,
    "description": "주민번호 7번째 자리 성별 값",
    "length": 1,
    "signingOrder": 8
  },
  {
    "name": "frnrYn",
    "type": "string",
    "required": false,
    "encrypt": false,
    "encoded": false,
    "description": "외국인여부 #[Y, N]",
    "signingOrder": 9,
    "length": 1
  },
  {
    "name": "returnUrl",
    "type": "string",
    "required": true,
    "encrypt": false,
    "encoded": true,
    "description": "WPAY 처리 결과를 전달 받을 callback URL",
    "signingOrder": 10,
    "length": 256
  },
  {
    "name": "signature",
    "type": "string",
    "required": true,
    "encrypt": false,
    "encoded": false,
    "description": "데이터 무결성 검증을 위한 SHA256 해시값",
    "length": 100
  },
  {
    "name": "agreePayNm",
    "type": "string",
    "required": false,
    "encrypt": false,
    "encoded": true,
    "description": "이용약관 표기 Pay명",
    "length": 256
  },
  {
    "name": "agreeUrl",
    "type": "string",
    "required": false,
    "encrypt": false,
    "encoded": true,
    "description": "간편결제 이용약관 URL",
    "length": 256
  },
  {
    "name": "optReadOnly",
    "type": "string",
    "required": false,
    "encrypt": false,
    "encoded": false,
    "description": "본인인증 화면 ReadOnly Field 설정",
    "length": 100
  }
]

/* Response */
[
  {
    "name": "ResultCode",
    "type": "string",
    "encrypt": false,
    "decoded": false,
    "description": "결과코드",
    "length": 6,
    "signingOrder": 1
  },
  {
    "name": "resultMsg",
    "type": "string",
    "encrypt": false,
    "decoded": true,
    "description": "결과메시지",
    "length": 150,
    "signingOrder": 2
  },
  {
    "name": "mid",
    "type": "string",
    "encrypt": false,
    "decoded": false,
    "description": "Merchant ID",
    "length": 10,
    "signingOrder": 3
  },
  {
    "name": "wtid",
    "type": "string",
    "encrypt": false,
    "decoded": false,
    "description": "WPAY 트랜잭션 ID",
    "length": 40,
    "signingOrder": 4
  },
  {
    "name": "userId",
    "type": "string",
    "encrypt": true,
    "decoded": false,
    "description": "가맹점 사용자 ID",
    "length": 20,
    "signingOrder": 5
  },
  {
    "name": "wpayUserKey",
    "type": "string",
    "encrypt": true,
    "decoded": false,
    "description": "WPAY 고객 고유 식별 KEY",
    "length": 100,
    "signingOrder": 6
  },
  {
    "name": "ci",
    "type": "string",
    "encrypt": true,
    "decoded": false,
    "description": "본인인증 고객 고유 식별 값",
    "length": 100,
    "signingOrder": 7
  },
  {
    "name": "signature",
    "type": "string",
    "encrypt": false,
    "decoded": false,
    "description": "데이터 무결성 검증을 위한 SHA256 해시값",
    "length": 100
  }
]
```

