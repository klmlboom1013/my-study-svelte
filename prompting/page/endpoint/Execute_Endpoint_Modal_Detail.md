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

* **Header Bar (Execution Settings)**:
  * **Domain Selector**: 실행할 도메인 환경 선택 (예: `DEV`, `STG`, `pGLB` 등). Endpoint의 Application/Service 설정에 따라 가능한 도메인 목록이 표시됩니다.
  * **Site Info**: 현재 Endpoint가 속한 Site 정보 표시 (Read-only).
  * **Attributes**: Request Type, Content-Type, Charset 등 실행 메타데이터 표시.
  * **Actions**: Backup/Restore (GDrive), Presets 관리.
* **Request Data Form**:
  * Endpoint에 정의된 `Request Data` 필드 목록을 입력 폼으로 렌더링합니다.
  * `List/Map` 타입 등 복합 구조에 대해 동적 추가/삭제 UI 제공.
  * **Auth/Security Fields**: `mid` 필드 등은 Global Settings의 값을 자동완성으로 제공하며, 선택된 `mid`는 보안 키(`SecurityContext`) 로드에 사용됩니다.
* **Toolbar (FAB & Buttons)**:
  * **Execute Button**: 실행 시작.
  * **FAB (Floating Action Button)**: 모바일 친화적 메뉴 (Scroll Top, GDrive Sync, Presets).

### 2.2. EXECUTE / RESULT State (실행 및 결과 단계)

* **Execution Status**:
  * **Request Param preview**: 전송된 JSON/Form Data 표시.
  * **Signature Source**: 생성된 서명 원본 문자열 표시 (디버깅용).
* **Response View**:
  * **Status Code**: 응답 HTTP 상태 코드.
  * **Response Body**: JSON Pretty Print.
  * **Decrypted/Decoded Data**: 암호화되거나 URL 인코딩된 응답 필드가 있을 경우, 복호화된 원본 데이터를 별도 카드로 표시.
* **Validation Status**:
  * **Signature Verification**: 응답 데이터의 서명(`signature`)을 로컬에서 재계산하여 검증 결과(Valid/Invalid) 표시.
  * **Comparisons**: 서버 서명값 vs 로컬 계산값, 원본 문자열 대조 제공.

## 3. 실행 로직 (Execution Logic)
  
### 3.1. 보안 전처리 (Security Pre-processing)
  
`Execute` 버튼 클릭 시 다음 과정이 수행됩니다.
  
1. **Security Context 로드**:
    * 입력 폼의 `mid` 값을 확인합니다.
    * `SettingsStore`의 `midContexts`에서 해당 MID의 보안 키(`hashKey`, `encKey`, `encIV`)를 조회하여 메모리에 로드합니다.
2. **암호화 (Encryption)**:
    * 입력된 파라미터 중 `isEncrypted=true`인 필드를 식별.
    * 로드된 `encKey`, `encIV`를 사용하여 데이터를 암호화 (`AES-256`, `SEED-CBC` 등, `security` util 사용).
3. **서명 생성 (Signature Generation)**:
    * Endpoint 설정의 `Signature Method`에 따라 서명 원본 문자열(Signature Source String)을 조합.
    * 로드된 `hashKey`를 사용하여 서명 값 생성.
    * `signature` 필드에 값 주입.
  
### 3.2. 요청 전송 (Request Dispatch)
  
Endpoint의 `Request Type`에 따라 분기됩니다.
  
#### 3.2.1. REST Type
  
* `/api/proxy`를 경유하여 HTTP 요청 전송 (CORS 회피).
* **Header 처리**: 정의된 Custom Header 및 `Content-Type` 적용.
* **Body 처리**:
  * `application/json`: JSON.stringify.
  * `application/x-www-form-urlencoded`: URLSearchParams 변환.
  
#### 3.2.2. FORM Type (WPAY Flow)
  
* **WPAY Flow (FORM Submit)**:
  * `window.open`으로 팝업 생성.
  * Form Data를 생성하여 팝업 타겟으로 POST Submit.
  * **IPC (Inter-Process Communication)**: `BroadcastChannel` 및 `message` 이벤트를 통해 팝업의 인증/결제 완료 결과를 수신.
  * 상세 내용은 **[Execute_Endpoint_WPAY_Detail.md](file:///d:/MY_PROJECT/my_study_svelte/prompting/page/endpoint/execute_endpoint_wpay/Execute_Endpoint_WPAY_Detail.md)** 문서를 참조하십시오.
  
### 3.3. 응답 처리 및 검증 (Response Handling)
  
* 수신된 응답 데이터를 파싱하여 화면에 표시.
* **Complex Data Processing**:
  * 응답 필드 설정에 따라 `URL Decode`, `Decrypt` 과정을 자동 수행하고 결과를 "Decrypted Data" 섹션에 표시.
* **Signature Verification**:
  * 응답 데이터에 서명 필드가 포함된 경우, 로컬 `SecurityContext`를 사용하여 동일 알고리즘으로 서명 재계산.
  * 결과 일치 여부 UI 표시 (Shield Icon).

## 4. 부가 기능 (Features)

### 4.1. Preset & History

* **History**: 실행 시점의 입력값과 선택된 도메인을 `localStorage`의 `execution_history` 키에 자동 저장 (Last Used).
* **Preset**: 사용자가 명시적으로 이름을 지정하여 저장한 입력값 세트.

### 4.2. Helper Utilites

* **Auto-Scroll**: 실행 및 결과 수신 시 자동으로 하단 스크롤.
* **Copy to Clipboard**: URL, 파라미터, 응답 본문, 서명 원본 등 주요 데이터에 대한 복사 버튼 제공.

## 5. 데이터 저장 및 관리 (LocalStorage Usage)

모달의 UI/UX 구성 및 사용자 편의 기능을 위해 브라우저의 `localStorage`를 적극적으로 활용합니다.

### 5.1. 실행 이력 및 프리셋 (`execution_history`)

* **Key**: `execution_history`
* **Purpose**: Endpoint별 마지막 실행 데이터 및 저장된 프리셋 관리.
* **Structure**:

   ```json
   {
     "{endpointId}": {
       "endpointId": "UUID",
       "lastUsed": {
           "domainPrefix": "https://dev-api...",
           ...requestValues
       },
       "presets": [
         {
           "id": "UUID",
           "name": "Preset Name",
           "values": { ...requestValues },
           "domainPrefix": "https://dev-api...",
           "createdAt": 1234567890
         }
       ]
     }
   }
   ```

### 5.2. 글로벌 설정 및 파라미터 옵션 (`settings_store`)

* **Key**: `settings_store`
* **Purpose**: 입력 폼(`Request Data Form`)에서 필드별 자동완성 옵션, 보안 키(MID Context), 도메인 설정을 제공합니다.
* **Major Data Used**:
  * **Global Parameters**: 자주 사용되는 필드(예: `mid`, `wpayUserKey`)의 기본값 제공 (`Global` 소스).
  * **Parameter Options**: 특정 필드에 대한 선택지(Select Options) 제공 (`Option` 소스).
  * **MID Contexts**: `mid` 값 선택 시 해당 가맹점의 보안 키(`hashKey`, `encKey`)를 동적으로 로드하여 암호화/서명에 사용.
  * **Applications**: 각 애플리케이션/서비스별 실행 도메인(DEV, STG, PROD 등) 정보.
