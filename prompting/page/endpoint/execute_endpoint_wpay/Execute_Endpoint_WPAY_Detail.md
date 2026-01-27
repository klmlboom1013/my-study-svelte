# WPAY Endpoint Execution & Response Logic

이 문서는 **Endpoint Execution Modal**에서 **WPAY Application**과 연동할 때의 상세 처리 로직을 기술합니다. 특히 **Request Type**(REST vs FORM)과 **HTTP Method**(GET vs POST), **Content-Type**에 따라 달라지는 **암호화**, **URL 인코딩**, **전자 서명(Signature)** 생성 순서와 실행 방식을 중점적으로 다룹니다.

## 1. 개요 (Overview)

WPAY 연동은 결제창 호출(`FORM` 방식)과 일반 API 호출(`REST` 방식)을 모두 지원합니다. 두 방식은 데이터를 전송하는 메커니즘뿐만 아니라, 보안 데이터(암호화/서명)를 구성하는 순서에서도 중요한 차이를 보입니다.

## 2. Logic Variation Matrix (로직 분기표)

실행 전, 데이터 준비 단계(`READY` State)에서 **서명(Signature)**을 생성할 때 사용되는 **원본 데이터(Source Data)**의 상태가 설정에 따라 다릅니다.

| Request Type | Method | Content-Type | Signature Source Data 상태 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **FORM** | ALL | ALL | **Encrypted + URL Encoded** | 폼 전송 특성상 인코딩된 데이터를 기준으로 서명 |
| **REST** | **POST** | `application/x-www-form-urlencoded` | **Encrypted + URL Encoded** | Body가 인코딩되므로 인코딩된 데이터 기준 |
| **REST** | **POST** | `application/json` (or other) | **Encrypted (Raw)** | JSON Body는 인코딩 전 데이터를 기준으로 서명 |
| **REST** | **GET** | ALL | **Encrypted (Raw)** | Query Param 생성 전 데이터를 기준으로 서명 |

> **공통 사항**: `Encrypt` 속성이 `true`인 필드는 모든 단계에 **선행하여** 암호화(`SEED-CBC` 등) 됩니다.

## 3. 단계별 상세 흐름 (Step-by-Step Flow)

### 3.1. Preparation Phase (데이터 준비)

사용자가 설정 탭에서 값을 입력하고 준비 상태일 때 내부적으로 수행되는 로직입니다.

1. **초기 가공 (Common Processing)**:
    * **Return URL 보정** (`FORM` Type only): 상대 경로일 경우 Absolute URL로 변환.
    * **Security Context 로드**: `requestValues['mid']` 값이 존재할 경우, `settingsStore`의 `midContexts`에서 해당 MID에 매핑된 암호화 키/서명 키(`encKey`, `signKey`)를 로드하여 `securityContext`를 구성합니다.
    * **1차 암호화 (Encryption)**: `requestValues` 중 암호화 대상 필드를 찾아 로드된 `securityContext`를 이용해 암호화합니다.
        > `processedValues = encryptData(requestValues)`

2. **분기처리 및 서명 생성 (Branching & Signing)**:

    * **Case A: FORM Type**
        1. **URL 인코딩**: 암호화된 `processedValues`를 URL 인코딩합니다. (`encodedValues`)
        2. **서명 생성**: `encodedValues`를 기준으로 서명(`generateSignature`)을 생성합니다.
        3. **데이터 병합**: 생성된 서명을 `processedValues`와 `encodedValues`의 `signature` 필드에 주입합니다.

    * **Case B: REST Type**
        1. **URL 인코딩**: `processedValues`를 URL 인코딩하여 `encodedValues`를 생성해둡니다.
        2. **서명 대상 결정 (`valForSig`)**:
            * `POST` && `x-www-form-urlencoded`인 경우: `encodedValues` 사용.
            * 그 외(GET, JSON POST 등): `processedValues` (암호화되었으나 인코딩되지 않은 값) 사용.
        3. **서명 생성**: 결정된 `valForSig`를 기준으로 서명을 생성합니다.
        4. **데이터 병합**: 생성된 서명을 `processedValues`의 `signature` 필드에 주입합니다.

### 3.2. Execution Phase (실행)

`isExecuting = true` 상태로 전환되며 실제 전송이 일어납니다.

#### 3.2.1. FORM Type Execution

* **Popup Open**:
  * **Desktop**: 화면 중앙에 451x908 크기의 팝업 창을 엽니다.
  * **Mobile**: User Agent 감지(`Android`, `iPhone` 등) 시 새 탭으로 엽니다 (`window.open("", popupName)`).
  * `wpayExecutionService.openPopup` 함수가 이 환경별 분기 처리를 담당합니다.
* **Payload**: `urlEncodeData(encryptData(values))` (서명 포함).
* **Submit**: `<form method="POST" target="popup">` 생성 및 `submit()`.
* **Flow**: 결제창 등의 UI가 팝업 내에서 진행됩니다.

#### 3.2.2. REST Type Execution

* **Payload**: `encryptData(values)` (서명 포함).
* **Request Construction**:
  * **GET / DELETE**: Payload를 **Query String**(`?key=value&...`)으로 변환하여 URL에 추가.
  * **POST / PUT**:
    * `application/json`: `JSON.stringify(payload)`를 Body로 설정.
    * `x-www-form-urlencoded`: `URLSearchParams(payload)`를 Body로 설정.
* **Fetch**: `fetch("/api/proxy", ...)`를 통해 서버로 요청 전송.

### 3.3. Response Handling Phase (응답 처리)

응답을 수신하는 방식과 검증 로직입니다.

| 구분 | FORM Type | REST Type |
| :--- | :--- | :--- |
| **수신 방식** | `window.message` 이벤트 (Type: `WPAY_RESULT`)<br>또는 `BroadcastChannel("wpay_channel")` | `fetch` 응답 (`await response.json()`) |
| **검증 로직** | **공통**: 응답 데이터 내 `signature` 필드 존재 시, 로컬에서 재계산하여 일치 여부 검증 (`validateResponse`) | (동일) |
| **복호화** | 응답 데이터 중 `encrypt: true` 필드를 복호화하여 원문 표시 | (동일) |

## 4. 백엔드 서버 처리 (Back-end Server Processing)

클라이언트(Modal)의 요청을 지원하기 위해 SvelteKit 서버 사이드(`src/routes/...`)에서 처리되는 로직입니다.

### 4.1. REST Proxy (`/api/proxy`)

**REST Type** 실행 시 CORS(Cross-Origin Resource Sharing) 제약을 우회하거나 헤더를 제어하기 위해 자체 프록시를 경유합니다.

* **Endpoint**: `POST /api/proxy`
* **Logic**:
    1. 클라이언트로부터 타겟 `url`, `method`, `headers`, `body`를 JSON으로 수신.
    2. `host`, `origin`, `referer` 등 브라우저 종속 헤더를 제거(Sanitize).
    3. Node.js 환경의 `fetch`를 사용하여 타겟 서버로 요청 전달 (Server-to-Server).
    4. 타겟 서버의 응답(Status, Headers, Body)을 그대로 클라이언트로 반환.

### 4.2. WPAY Result Callback (`/callback/wpay/result`)

**FORM Type** 실행 완료 후, WPAY 결제/인증 결과 데이터를 수신하여 클라이언트(Opener)로 중계하는 역할을 합니다.

* **Endpoint**: `POST /callback/wpay/result` (WPAY에서 `returnUrl`로 호출)
* **Server-Side Logic** (`+page.server.ts`):
  * `request.formData()`를 통해 WPAY가 전송한 Form Data를 파싱.
  * 파싱된 데이터를 객체(`Record<string, string>`)로 변환하여 Page Component(`+page.svelte`)로 전달 (`export let form`).
* **Client-Side Logic** (`+page.svelte`):
  * 서버로부터 전달받은 `form.data`를 `BroadcastChannel` 및 `window.opener.postMessage`로 브로드캐스팅.
  * 3초 후 팝업(자신)을 자동 종료.

## 5. 코드 참조 (Code Reference)

`src/lib/components/endpoint/EndpointExecutionModal.svelte` 내 주요 로직 위치:

* **Prep Logic (REST/FORM 분기)**: Line 304 (FORM) vs Line 333 (REST/Else).
* **Signature Logic (REST)**: Line 337 ~ 342 (`valForSig` 결정 로직).
* **Execution (FORM)**: Line 383 (Popup & Submit).
* **Execution (REST)**: Line 433 (Fetch & Body Construction).
