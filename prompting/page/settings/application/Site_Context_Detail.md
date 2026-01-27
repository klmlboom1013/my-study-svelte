# 화면 상세 분석: Endpoint Parameters (설정 관리) - Site Context

이 문서는 `Settings` 화면의 **Application** 탭 내 **Site Context** 기능, 데이터 구조, 그리고 UI 상호작용 로직을 상세히 기술합니다.

## 1. 개요 (Overview)

**Site Context**는 특정 **Service** 하위에 존재하는 논리적인 단위인 **Site**를 정의하는 기능입니다. 주로 WPAY 서비스 구조에서 `mobile`, `pc`, `app` 등과 같이 동일한 서비스 내에서 채널이나 환경을 구분할 때 사용됩니다.

---

## 2. 기능 명세 (Detailed Specifications)

### 2.1. Site Context (사이트 컨텍스트)

* **Site 매핑**: 특정 **Service** 하위에 존재하는 논리적인 단위인 **Site**를 정의합니다.
* **다중 사이트 관리**: 하나의 서비스 컨텍스트에 여러 개의 Site(예: `mobile`, `pc`, `app`)를 등록하여 관리할 수 있습니다.

#### 2.1.1. 데이터 필드 (Schema: Site Context)

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| **Application** | String | Y | 대상 애플리케이션 (현재 `WPAY` 고정) |
| **Service** | String | Y | 대상 서비스 (예: `wpaystd`) |
| **Sites** | `Array<String>` | Y | 사이트 목록 (예: `["site_a", "site_b"]`) |

### 2.2. 상세 로직 및 상호작용 (Detailed Logic & Interaction)

#### 2.2.1. Site Context 관리 로직

* **데이터 의존성 (Data Dependency)**:
  * **Service List Source**: Site Context 추가 시 선택 가능한 `Service` 목록은, **Application Settings** 탭에서 구성된 `WPAY` 애플리케이션의 하위 서비스 목록을 동적으로 참조합니다.
  * **Pre-condition**: 따라서, Site Context를 설정하기 전에 반드시 **Application Settings**에서 `WPAY` 앱을 등록하고 하위 서비스를 정의해야만 Site Context를 정상적으로 추가할 수 있습니다.
* **UI 상호작용 (UX Flow)**:
  * **Add Site (Inline)**: 생성된 Context 카드 하단의 `Add Site` 버튼 클릭 시, 인라인 입력 폼이 활성화됩니다.
  * **Single Entry**: `Enter` 키를 누르거나 `Add` 버튼을 클릭하면 Site가 추가되고 입력 폼이 즉시 닫힙니다. (연속 입력 미지원)
  * **Deletion**: Context 전체 삭제 및 개별 Site 삭제 시 모두 **AlertModal**을 통한 확인창이 호출됩니다.
  * **Fixed Application**: 현재 구현상 Site Context의 대상 Application은 `WPAY`로 고정되어 있습니다. (Select Box Disabled 처리)

### 2.3. 유효성 검사 및 제약 사항 (Validation & Constraints)

* **No Duplicate Check**: 동일한 Context 내에 같은 이름의 Site(예: `mobile`, `mobile`)를 중복해서 등록하는 것이 허용됩니다. 별도의 중복 검사 로직이 존재하지 않습니다.
* **ID Generation**: Site Context 생성 시 `crypto.randomUUID()`를 사용하여 고유 ID가 자동 생성됩니다.

### 2.4. 데이터 영속성 (Data Persistence)

* **Local Storage Key**: `settings_store`
  * 데이터는 `localStorage`의 `settings_store` 키에 JSON 문자열로 저장됩니다.
* **JSON Data Path**:
  * Site Context 목록: `root.endpoint_parameters.siteContexts`
* **Google Drive Sync**:
  * FileName: `settings.json`
  * Structure: `settingsStore` 객체 전체가 그대로 JSON 파일로 저장됩니다.
