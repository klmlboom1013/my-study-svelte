# 화면 상세 분석: Edit Endpoint Screen

이 문서는 **Edit Endpoint** 화면(`src/routes/(app)/endpoint/[id]/edit/+page.svelte`) 및 **New Endpoint** 화면(`.../new/+page.svelte`)의 UI 구성, 폼 입력 로직, 데이터 처리 방식을 상세히 기술합니다. 두 화면은 대부분의 로직을 공유합니다.

## 1. 개요 (Overview)

* **목적**: API Endpoint의 메타데이터, 통신 설정, 요청/응답 데이터 스키마를 생성하거나 수정합니다.
* **주요 기능**:
  * Endpoint 기본 정보 입력 (Application, Service, Site 등)
  * 통신 규격 설정 (Method, URI, Headers)
  * 데이터 무결성 검증 방식(Signature) 설정
  * 요청/응답 데이터 구조 정의 (Table Editor & JSON Import)

## 2. 화면 구성 (UI Structure)

화면은 여러 개의 접이식 섹션(Accordion)으로 구성되어 있어 정보의 복잡도를 관리합니다.

### 2.1. Basic Information Section

* **Application**:
  * `ProfileStore`의 `myApplications` 목록을 기반으로 선택 가능한 옵션을 제공합니다.
  * 데이터가 없을 경우 기본값 `WPAY`를 제공합니다.
* **Name**: Endpoint 식별 이름 (필수).
* **Scope (Service / Site)**:
  * Application 설정(`useServiceDistinction`)에 따라 동적으로 표시됩니다.
  * `ProfileStore`의 설정값에서 Service 및 Domain(Site) 목록을 불러옵니다.
  * **Service**: 선택 가능한 서비스 목록 제공.
  * **Site**: 선택된 Service에 따라 종속적인 도메인 옵션(`siteOptions`)을 제공합니다.
  * (`Global Lock` 상태 시 모든 입력 비활성화)
* **Description**: Endpoint에 대한 설명.

### 2.2. Request Details Section

* **Method**: `GET`, `POST`, `PATCH`, `PUT`, `DELETE` 중 선택.
* **URI**: API 경로 입력 (예: `/v1/api/...`).
* **Request Type**:
  * `REST`: 일반적인 REST API 호출.
  * `FORM`: Form Submit 방식 (WPAY 결제창 호출 등).
* **Header Options** (REST Type일 경우 활성화):
  * **Content-Type**: `application/json` 등 선택.
  * **Charset**: `UTF-8` 등 선택.
  * **Custom Headers**: Key-Value 쌍으로 헤더 추가/삭제 가능.

### 2.3. Data Integrity Verification Method Section

* **Signature Method**:
  * 데이터 위변조 방지를 위한 서명 생성 방식을 선택합니다.
  * 옵션:
    * `HMAC_SHA256_KV`: Key-Value 쌍 정렬 방식.
    * `HMAC_SHA256_V`: Value 나열 방식.

### 2.4. Data Definition Sections (Request / Response)

요청(`Request`)과 응답(`Response`) 데이터의 필드 구조를 정의합니다.

* **Table Editor (`DataDefinitionTable`)**:
  * 필드명, 타입(String, Number, List 등), 길이, 필수 여부, 암호화 여부 등을 행 단위로 편집합니다.
  * 계층 구조(List 타입의 하위 필드)를 지원합니다.
* **JSON Import (`JSON` Button)**:
  * `RequestDataJsonModal` / `ResponseDataJsonModal`을 호출합니다.
  * JSON 텍스트를 붙여넣어 복잡한 데이터 구조를 한 번에 파싱하여 테이블로 변환(Import)할 수 있습니다.

## 3. 데이터 로직 (Data Logic)

### 3.1. Initialization (`onMount`)

* **URL Parameter**: `id`를 확인하여 기존 Endpoint 데이터를 `endpointService`에서 로드합니다.
* **Default Values**:
  * 신규 생성 시 `requestType`은 `REST`, `contentType`은 `application/json`으로 초기화됩니다.
  * 수정 시 기존 데이터를 폼 로컬 State(`$state`)로 복사합니다.

### 3.2. Form Interactivity

* **Dynamic Defaults**:
  * `Request Type` 변경 시 적절한 `Content-Type`을 자동으로 설정합니다 (`REST` -> `application/json`, `FORM` -> `application/x-www-form-urlencoded`).
  * 단, 사용자가 명시적으로 변경한 경우를 고려하여 `prevRequestType` state를 통해 변경 감지 시에만 적용합니다.
* **Validation**:
  * `Save` 버튼은 필수 필드(`Application`, `Name`, `URI`)가 입력되지 않으면 비활성화(`disabled`)됩니다.

### 3.3. Persistence (`handleSave`)

* **Create**: `crypto.randomUUID()`로 새 ID 생성 후 `endpointService.saveEndpoint()` 호출.
* **Update**: 기존 ID를 유지하며 `endpointService.updateEndpoint()` 호출.
* 저장 완료 후 상세 조회 화면(`/endpoint/[id]`)으로 이동합니다.
