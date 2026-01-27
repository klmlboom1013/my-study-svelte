# 화면 상세 분석: Endpoint Viewer Screen

이 문서는 **Endpoint Viewer** 화면(`src/routes/(app)/endpoint/[id]/+page.svelte`)의 UI 구성 및 데이터 표시 로직을 상세히 기술합니다.

## 1. 개요 (Overview)

* **목적**: 등록된 특정 Endpoint의 상세 정보를 **읽기 전용(Read-only)** 모드로 조회합니다.
* **주요 기능**:
  * Endpoint 기본 정보 및 설정 확인
  * 요청(Request)/응답(Response) 데이터 스키마 조회
  * 수정 모드(`Edit`) 전환 및 삭제(`Delete`)

## 2. 화면 구성 (UI Structure)

### 2.1. Header Area

| 요소 | 설명 |
| :--- | :--- |
| **Breadcrumbs** | 탐색 경로 표시 (`Home` > `Test Endpoint` > `[Endpoint Name]`) |
| **Title** | Endpoint Name |
| **Description** | 설명 문구 (데이터가 없으면 default msg 표시) |
| **Actions** | **Edit**: 수정 화면(`/endpoint/[id]/edit`)으로 이동<br>**Delete**: 삭제 확인 (`confirm` 창) 후 목록으로 이동 |

### 2.2. Basic Information Section (Card)

Endpoint의 핵심 메타데이터를 표시합니다.

* **Method & URI**: HTTP Method (Badge) + URI Path (Monospace Font)
* **Request Type**: `REST` 또는 `FORM`
* **Service**: 대상 서비스 명 (Scope)
* **Site**: 대상 사이트 명 (Scope, 없으면 `-`)

### 2.3. Configuration Section

통신 설정 정보를 표시합니다.

* **Header Configuration**:
  * **Content-Type**: 예) `application/json`, `application/x-www-form-urlencoded`
  * **Charset**: 예) `UTF-8`, `EUC-KR`
  * **Custom Headers**: 사용자가 정의한 추가 헤더 목록 (Key: Value)

### 2.4. Data Integrity Verification Section (Optional)

서명(Signature) 생성 방식이 설정된 경우에만 표시됩니다.

* **Verification Method**:
  * `HMAC_SHA256_KV`: Key-Value 쌍 정렬 방식 서명 생성
  * `HMAC_SHA256_V`: Value 나열 방식 서명 생성
  * (실제 로직은 `getSignatureMethodLabel` 함수를 통해 사람이 읽기 쉬운 형태로 변환되어 표시됨)

### 2.5. Data Definition Section

요청 및 응답 데이터의 구조를 테이블 형태로 시각화합니다.

* **Request Data Definition**:
  * `DataDefinitionTable` 컴포넌트를 사용 (`isReadOnly={true}`).
  * 필드명, 데이터 타입, 필수 여부, 설명, 암호화 여부 등을 표시.
* **Response Data Definition**:
  * 응답 데이터 스키마를 표시.
* **Empty State**: 데이터가 정의되지 않은 경우 "No request/response data defined" 메시지 박스 표시.
