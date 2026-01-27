# 화면 상세 분석: Endpoint Parameters (설정 관리) - Global Parameters

이 문서는 `Settings` 화면의 **Endpoint Parameters > Global Parameters** 탭에서 제공하는 기능, 데이터 구조, 그리고 UI 상호작용 로직을 상세히 기술합니다.

## 1. 개요 (Overview)

**Global Parameters**는 API 호출 시 공통적으로 삽입되어야 하는 키-값 쌍(Key-Value Pair)을 정의합니다.

---

## 2. 기능 명세 (Detailed Specifications)

### 2.1. 주요 기능 (Global Params)

* **파라미터 등록/수정**: 애플리케이션 및 서비스 단위로 적용될 파라미터를 생성합니다.
* **리스트 필터링**: 헤더의 'Select Application' 값에 따라 리스트가 자동으로 필터링됩니다.
* **서비스 다중 선택**: 하나의 파라미터가 여러 서비스(예: `wpaystd`, `wpaymembership`)에 공통으로 적용될 수 있도록 Multi-Select를 지원합니다.

### 2.2. 데이터 필드 (Schema)

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| **Application** | String | Y | 파라미터가 속한 애플리케이션 (예: `WPAY`, `KCP`) |
| **Service** | `Array<String>` | N | 적용될 서비스 목록. (Source: `Settings > Applications` Service 목록 / WPAY Default: `wpaystd2`) |
| **Key** | String | Y | 파라미터 키 (예: `_lang`, `version`) |
| **Value** | String | Y | 파라미터 값 (예: `ko`, `1.0`) |

### 2.3. 유효성 검사 (Validation Rules)

* **Key Uniqueness**: 동일한 Application 스코프 내에서 `Parameter Key`는 중복될 수 없습니다.
* **Format**: Key와 Value는 문자열(String) 형태여야 합니다.

### 2.4. 데이터 영속성 (Data Persistence)

* **Local Storage Key**: `settings_store`
  * 데이터는 `localStorage`의 `settings_store` 키에 JSON 문자열로 저장됩니다.
* **JSON Data Path**:
  * `root.endpoint_parameters.globalParameters` (Array of GlobalParameter objects)
* **Google Drive Sync**:
  * FileName: `settings.json`
  * Structure: `settingsStore` 객체 전체가 그대로 JSON 파일로 저장됩니다.

### 2.5. UI/UX 로직 (Global Params)

* **동적 UI 노출**: 'Application' 선택 값에 따라 입력 폼이 동적으로 변경됩니다.
  * `WPAY` 선택 시: **Service** 선택 박스가 추가로 노출되며, 다중 선택이 가능합니다.
  * 그 외 선택 시: **Service** 선택 박스가 숨겨집니다.
* **필드 검증**: `Application`, `Key`, `Value`는 필수입니다. 단, `Application`이 'WPAY'인 경우 `Service` 선택도 강제됩니다(Valid Service Check).
* **연속 입력 편의성**: 'Add Parameter' 버튼 클릭 후 성공적으로 추가되면, `Application`과 `Service` 선택 상태는 유지되고 `Key`와 `Value` 필드만 초기화되어 연속적인 입력을 돕습니다.
* **수정 모드 UX (Edit Interaction)**:
  * **Auto Scroll**: 리스트에서 수정 아이콘 클릭 시, 최상단의 입력 폼으로 화면이 부드럽게 스크롤(Smooth Scroll) 됩니다.
  * **WPAY Data Fallback**: `WPAY` 애플리케이션 데이터 중 `Service` 정보가 없는(Legacy) 데이터를 수정할 경우, 자동으로 '모든 서비스'가 선택된 상태로 폼에 로드됩니다.
* **삭제 프로세스 (Deletion)**: 삭제 버튼 클릭 시 즉시 삭제되지 않고, `AlertModal`을 통해 사용자 확인(Confirm) 과정을 거칩니다.
