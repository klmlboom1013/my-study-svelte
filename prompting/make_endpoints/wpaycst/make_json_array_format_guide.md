# WPAYCST Google Sheets API 연동문서 JSON Array 포멧으로 구성

문서의 각 시트는 WPAYCST API 연동 규격 정보를 담고 있으며, "Service Description", "URI", "HTTP Method", "Request", "Response"로 구성되어 있다.

- "Request"는 "Name", "Type", "LEN", "REQ", "ENC", "ULRENC", "SIGN", "Description" 로 구성되어 있다.
- "Response"는 "Name", "Type", "LEN", "ENC", "ULRENC", "SIGN", "Description" 로 구성되어 있다.
- 속성 별 Json Name 규칙.
  - Name -> name: [string type]
  - Type -> type: [string type]
  - LEN -> length: [number type, 값이 없을 경우 null]
  - REQ -> required: [Boolean type: true, false]
  - ENC -> encrypt: [Boolean type: true, false]
  - ULRENC -> encoded: [Boolean type: true, false]
  - SIGN -> signingOrder: [number type, 값이 없을 경우 null]
  - Description -> description: [string type]

## Json Array 포멧 예시

### Request Json Array 포멧 예시

```json
[
    {
      "name": "",
      "type": "",
      "required": "",
      "encrypt": "",
      "encoded": "",
      "description": "",
      "length": "",
      "signingOrder": "",
    }
]
```

### Response Json Array 포멧 예시

```json
[
  {
    "name": "",
    "type": "",
    "encrypt": "",
    "decoded": "",
    "description": "",
    "length": "",
    "signingOrder": "",
  }
]
```
