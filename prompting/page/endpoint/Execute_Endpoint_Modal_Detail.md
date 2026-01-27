# 화면 상세 분석: Execute Endpoint Modal

이 문서는 **Execute Endpoint Modal**(`src/lib/components/endpoint/EndpointExecutionModal.svelte`)의 UI 구성, 실행 로직, 보안 처리 및 부가 기능을 상세히 기술합니다.

## 1. 개요 (Overview)

* **목적**: 정의된 Endpoint를 실제 환경에서 즉시 실행하고 결과를 확인하는 테스트 도구입니다.
* **주요 기능**:
  * 동적 요청 파라미터 입력 폼 생성
  * 보안 처리 자동화 (파라미터 암호화, 전자 서명 생성)
  * API 호출 실행 (REST 방식 및 FORM Submit 방식)
  * 응답 결과 확인 및 서명 검증
  * 실행 이력(History) 및 프리셋(Preset) 관리

## 2. 화면 구성 및 상태 (UI Structure & States)

모달은 실행 단계에 따라 UI가 전환됩니다.

### 2.1. READY State (준비 단계)

* **Settings Panel (Accordion)**:
  * **Profile**: 실행할 환경(Profile) 선택 (예: `Local`, `Dev`, `Prod`).
  * **Site**: Profile에 연결된 Site 선택 (암호화 키/서명 키 결정).
  * **Timestamp**: 요청 타임스탬프 (자동 생성되나 수정 가능).
* **Request Data Form**:
  * Endpoint에 정의된 `Request Data` 필드 목록을 입력 폼으로 렌더링합니다.
  * `Encrypted` 속성이 있는 필드는 입력 시 평문으로 보이지만 전송 시 자동 암호화됩니다.
  * `List/Map` 타입 등 복합 구조 지원.
* **Toolbar**:
  * **Reset**: 입력값 초기화.
  * **Load Preset**: 저장된 프리셋 불러오기.

### 2.2. EXECUTE / RESULT State (실행 및 결과 단계)

* **Console Output**:
  * 실행 로그 (암호화 과정, 평문/암호문 대조, 서명 원본 등) 표시.
  * Request Body / Form Data 미리보기.
  * Response Body (JSON Pretty Print).
* **Validation Status**:
  * 응답 데이터의 서명 검증 결과 표시 (Success/Fail).

## 3. 실행 로직 (Execution Logic)

### 3.1. 보안 전처리 (Security Pre-processing)

`Execute` 버튼 클릭 시 다음 과정이 수행됩니다.

1. **암호화 (Encryption)**:
    * 입력된 파라미터 중 `isEncrypted=true`인 필드를 식별.
    * 현재 선택된 `Site`의 `encryptionKey`를 사용하여 데이터를 암호화 (`AES-256` 등, `security` util 사용).
2. **서명 생성 (Signature Generation)**:
    * Endpoint 설정의 `Signature Method`에 따라 서명 원본 문자열(Signature Source String)을 조합.
    * 선택된 `Site`의 `signKey`를 사용하여 서명 값 생성.
    * `signature` 필드에 값 주입.

### 3.2. 요청 전송 (Request Dispatch)

Endpoint의 `Request Type`에 따라 분기됩니다.

#### 3.2.1. REST Type

* `fetch` API를 사용하여 직접 HTTP 요청 전송.
* `Content-Type` 헤더에 맞춰 Body 직렬화 (`JSON.stringify` 등).
* CORS 문제 회피를 위해 필요 시 Proxy Endpoint (`/api/proxy`) 경유.

#### 3.2.2. FORM Type (WPAY Flow)

* **WPAY Flow (FORM Submit)**:
  * WPAY Application에 특화된 팝업 실행 및 폼 전송 로직, 비동기 응답 처리 메커니즘을 사용합니다.
  * 상세 내용은 **[Execute_Endpoint_WPAY_Detail.md](file:///d:/MY_PROJECT/my_study_svelte/prompting/page/endpoint/execute_endpoint_wpay/Execute_Endpoint_WPAY_Detail.md)** 문서를 참조하십시오.

### 3.3. 응답 처리 및 검증 (Response Handling)

* 수신된 응답 데이터를 파싱하여 화면에 표시.
* **Signature Verification**:
  * 응답 데이터에 서명 필드가 포함된 경우, 로컬에서 동일한 로직으로 서명을 재생성하여 일치 여부를 검증.
  * 일치 시 "Verified", 불일치 시 "Verification Failed" 경고 표시.

## 4. 부가 기능 (Features)

### 4.1. Preset & History

* **History**: 실행 성공 시 입력 파라미터 세트를 로컬 스토리지(`executionService`)에 자동 저장. 최근 실행 내역 조회 가능.
* **Preset**: 자주 사용하는 테스트 케이스를 이름 붙여 저장하고 불러오는 기능.

### 4.2. Floating Action Button (FAB)

* 모바일 환경 등에서 접근성을 높이기 위해 우측 하단에 FAB 제공.
* **Short Click**: 실행(`Execute`).
91: ***Long Press**: 메뉴 확장 (Scroll Top/Bottom, Save Preset 등).
92:
93: ## 5. 데이터 저장 및 관리 (LocalStorage Usage)
94:
95: 모달의 UI/UX 구성 및 사용자 편의 기능을 위해 브라우저의 `localStorage`를 적극적으로 활용합니다.
96:
97: ### 5.1. 실행 이력 및 프리셋 (`execution_history`)
98:
99:* **Key**: `execution_history`
100: ***Purpose**: Endpoint별 마지막 실행 데이터와 사용자가 저장한 프리셋을 관리하여 반복 테스트의 편의성을 제공합니다.
101:* **Structure**:
102:   ```json
103:   {
104:     "{endpointId}": {
105:       "endpointId": "UUID",
106:       "lastUsed": { ...requestValues }, // 마지막 성공 실행 값 (자동 저장)
107:       "presets": [
108:         {
109:           "id": "UUID",
110:           "name": "Preset Name",
111:           "values": { ...requestValues },
112:           "domainPrefix": "stg", // 선택했던 환경 (DEV/STG 등)
113:           "createdAt": 1234567890
114:         }
115:       ]
116:     }
117:   }
118:```
119:
120: ### 5.2. 글로벌 설정 및 파라미터 옵션 (`settings_store`)
121:
122: ***Key**: `settings_store`
123:* **Purpose**: 입력 폼(`Request Data Form`)에서 필드별 자동완성 옵션, 보안 키(MID Context), 도메인 설정을 제공합니다.
124: ***Major Data Used**:
125:* **Global Parameters**: 자주 사용되는 필드(예: `mid`, `wpayUserKey`)의 기본값 제공 (`Global` 소스).
126:   ***Parameter Options**: 특정 필드에 대한 선택지(Select Options) 제공 (`Option` 소스).
127:* **MID Contexts**: `mid` 값 선택 시 해당 가맹점의 보안 키(`hashKey`, `encKey`)를 동적으로 로드하여 암호화/서명에 사용.
128:   * **Applications**: 각 애플리케이션/서비스별 실행 도메인(DEV, STG, PROD 등) 정보.
