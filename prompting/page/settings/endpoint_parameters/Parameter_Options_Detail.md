# 화면 상세 분석: Endpoint Parameters (설정 관리) - Parameter Options

이 문서는 `Settings` 화면의 **Endpoint Parameters > Parameter Options** 탭에서 제공하는 기능, 데이터 구조, 그리고 UI 상호작용 로직을 상세히 기술합니다.

## 1. 개요 (Overview)

**Parameter Options**는 Endpoint Editor에서 사용자에게 '자유 입력' 대신 '선택지(Select Box)'를 제공하고 싶을 때 사용하는 데이터 셋입니다.

---

## 2. 기능 명세 (Detailed Specifications)

### 2.1. 주요 기능 (Options)

* **옵션 그룹 정의**: 특정 파라미터(예: `payMethod`)에 대해 선택 가능한 값들의 집합을 정의합니다.
* **Key-Value 관리**: 내부적인 코드값(`Code`)과 사용자에게 보여질 라벨(`Value`)을 쌍으로 관리합니다.

### 2.2. 데이터 필드 (Schema)

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| **Application** | String | Y | 옵션 그룹이 속한 애플리케이션 |
| **Service** | `Array<String>` | N | 적용될 서비스 목록 |
| **Parameter Name** | String | Y | 옵션 그룹 식별자 (API 파라미터 키와 일치해야 함, 예: `cardCode`) |
| **Options** | `Array<Object>` | Y | `{ code: "01", value: "신한카드" }` 형태의 객체 배열 |

### 2.3. 상세 로직 및 상호작용 (Detailed Logic & Interaction)

* **Filtering Logic**:
  * **Application Filter**: Parameter Options 리스트는 현재 헤더에서 선택된 Application이 'All'인 경우 전체 목록을, 특정 앱인 경우 해당 앱의 옵션만 필터링하여 보여줍니다.
* **Dynamic UI**:
  * **Service Multi-Select**: Parameter Option 추가/편집 시, Application이 'WPAY'일 때만 서비스 선택 필드(MultiSelectBox)가 노출됩니다.
* **Validation**:
  * **Mandatory Fields**: Application, Parameter Name, 적어도 하나 이상의 Option Value는 필수입니다.
  * **WPAY Service Check**: Application이 'WPAY'인 경우, 서비스 선택이 필수입니다.
* **Sub-Form Logic**:
  * **Option Management**: 옵션 값(Code/Value)을 추가하면 리스트에 임시 저장되며, 최종 'Add/Update Parameter' 버튼을 눌러야 반영됩니다.

### 2.4. 데이터 영속성 (Data Persistence)

* **Local Storage Key**: `settings_store`
  * 데이터는 `localStorage`의 `settings_store` 키에 JSON 문자열로 저장됩니다.
* **JSON Data Path**:
  * `root.endpoint_parameters.parameterOptions` (Array of ParameterOption objects)
* **Google Drive Sync**:
  * FileName: `settings.json`
  * Structure: `settingsStore` 객체 전체가 그대로 JSON 파일로 저장됩니다.

* **수정 모드 UX (Edit Interaction)**
  * **Sub-form Interaction**: 메인 폼 내부에 옵션 값(Code/Value)을 추가하는 별도의 인풋 영역이 존재하며, 리스트에 추가된 항목은 개별적으로 수정(`Edit` 버튼 없이 클릭 시 폼 로드)하거나 삭제(`x` 버튼)할 수 있습니다.
  * **WPAY Data Fallback**: `Service` 정보가 없는(Legacy) WPAY 데이터를 수정 모드로 열 경우, 사용자 편의를 위해 **모든 서비스**가 자동으로 선택된 상태로 로드됩니다.
