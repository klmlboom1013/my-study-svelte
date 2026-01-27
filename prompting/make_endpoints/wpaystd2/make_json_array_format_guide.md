## WPAY.STD 2.0 API 연동문서 JSON Array 포멧으로 구성.

MCP 연결된 Notion "WPAYSTD 2.0 연동 규격" 내 API 연동 규격을 JSON Array 포멧으로 변환한다.

### 노션 "WPAYSTD 2.0 연동 규격" 연동규격 테이블 정보를 Json Array 포멧으로 변환 방법

* 1. 연동규격 테이블 Request 전문을 JSON Array로 구성한다.
```json
[
    {
      "name": "", /* 연동규격 Request전문 테이블의 Name 필드의 값 */
      "type": "", /* 연동규격 Request전문 테이블의 Type 필드의 값 */
      "required": "", /* 연동규격 Request전문 테이블의 Req 필드의 값 [Boolean type: true, false] */
      "encrypt": "", /* 연동규격 Request전문 테이블의 Enc 필드의 값 [Boolean type: true, false] */
      "encoded": "", /* 연동규격 Request전문 테이블의 Url 필드의 값 [Boolean type: true, false]*/
      "description": "", /* 연동규격 Request전문 테이블의 Desc 필드의 값 */
      "length": "", /* 연동규격 Request전문 테이블의 Len 필드의 값 [number type] */
      "signingOrder": "", /* 연동규격 Request전문 테이블의 sign 필드의 값 [number type] */
    }
]
```

* 2. 연동규격 테이블 Response 전문을 JSON Array로 구성한다.
```json
[
  {
    "name": "", /* 연동규격 Response전문 테이블의 Name 필드의 값 */
    "type": "", /* 연동규격 Response전문 테이블의 Type 필드의 값 */
    "encrypt": "", /* 연동규격 Response전문 테이블의 Enc 필드의 값 [Boolean type: true, false] */
    "decoded": "", /* 연동규격 Response전문 테이블의 Url 필드의 값 [Boolean type: true, false]*/
    "description": "", /* 연동규격 Response전문 테이블의 Desc 필드의 값 */
    "length": "", /* 연동규격 Response전문 테이블의 Len 필드의 값 [number type] */
    "signingOrder": "", /* 연동규격 Response전문 테이블의 sign 필드의 값 [number type] */
  }
]
```

### Json Array 포멧으로 변환된 테이블 정보를 파일로 저장한다.
- 노션 "WPAYSTD 2.0 연동 규격".Member.* 연동규격 테이블 Json Array 포멧으로 변환 결과를 "doc/Member/*" 에 저장 한다.
- 노션 "WPAYSTD 2.0 연동 규격".Token.* 연동규격 테이블 Json Array 포멧으로 변환 결과를 "doc/Token/*" 에 저장 한다.
- 노션 "WPAYSTD 2.0 연동 규격".Payment.* 연동규격 테이블 Json Array 포멧으로 변환 결과를 "doc/Payment/*" 에 저장 한다.
- 노션 "WPAYSTD 2.0 연동 규격".AutoPay.* 연동규격 테이블 Json Array 포멧으로 변환 결과를 "doc/AutoPay/*" 에 저장 한다.
- 노션 "WPAYSTD 2.0 연동 규격".Standard UI.* 연동규격 테이블 Json Array 포멧으로 변환 결과를 "doc/StandardUI/*" 에 저장 한다.
- 노션 "WPAYSTD 2.0 연동 규격"."Basic Information" 연동규격 테이블 Json Array 포멧으로 변환 결과를 "doc/BasicInfo/BasicInfo.json" 에 저장 한다.