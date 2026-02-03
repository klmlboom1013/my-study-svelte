# 화면 분석 및 문서화: Settings (설정 관리)

## 1. 개요 (Overview)

`Settings` 화면은 애플리케이션의 전역 설정, 인터페이스 동작, 그리고 API 호출에 필요한 파라미터 및 컨텍스트 정보를 관리하는 중앙 제어 센터입니다. 이 화면에서 설정된 데이터는 `settingsStore`를 통해 관리되며, 애플리케이션 전반(특히 Endpoint 테스트 및 API 호출)에 영향을 미칩니다.

### 1.1. 주요 기능

* **Endpoint Parameters**: API 호출 시 공통적으로 사용되는 파라미터, 옵션 목록, 그리고 가맹점 정보(MID)를 관리합니다.
* **Interface Settings**: 사이드바 메뉴 표시 여부 및 대시보드 위젯 구성을 제어합니다.
* **Application Settings**: 테스트 대상 애플리케이션(예: WPAY)을 등록하고, 해당 앱의 도메인 및 서비스 구조를 정의합니다. 또한, 서비스와 연관된 사이트(Site) 정보를 매핑합니다.

---

## 2. 화면 구조 (UI Structure)

화면 상단에는 세 가지 메인 카테고리 탭이 존재하며, 각 카테고리는 하위 탭 또는 섹션으로 구성됩니다.

| 카테고리 (Category) | 하위 탭 / 섹션 (Sub-tabs) | 설명 (Description) |
| :--- | :--- | :--- |
| **Endpoint Parameters** | Global Parameters | 전역적으로 사용되는 고정 파라미터 (예: `version`, `clientType`) 관리 |
| | Parameter Options | 파라미터 입력 시 선택 가능한 옵션 목록 (예: `payMethod` -> `CARD`, `BANK`) 정의 |
| | MID Context | 가맹점 ID(MID) 및 보안 키(HashKey, EncKey, IV) 관리 |
| **Interface** | Sidebar Menu | 좌측 사이드바의 메뉴 아이템 표시 여부 토글 |
| | Dashboard Widgets | 대시보드 화면에 표시할 위젯 선택 |
| **Application** | Application Settings | 애플리케이션 등록, 수정 및 환경별(DEV, STG, GLB 등) 도메인/서비스 구성 |
| | Site Context | 특정 서비스(Service)에 속한 사이트(Site) 목록 매핑 관리 |

---

## 3. 상세 기능 명세 (Detailed Specifications)

### 3.1. Endpoint Parameters (파라미터 관리)

API 요청 생성 시 기본값으로 주입되거나, 사용자가 선택할 수 있는 옵션들을 정의합니다.

#### 3.1.1. 상세 설정 (Global Params, Options, MID)

> [!NOTE]
> 자세한 내용은 다음 문서를 참조하십시오.
>
> * **[Global_Parameters_Detail.md](endpoint_parameters/Global_Parameters_Detail.md)**: 전역 파라미터 상세
> * **[Parameter_Options_Detail.md](endpoint_parameters/Parameter_Options_Detail.md)**: 파라미터 옵션 상세
> * **[MID_Context_Detail.md](endpoint_parameters/MID_Context_Detail.md)**: MID 컨텍스트 상세

이 섹션에서는 API 호출에 필수적인 전역 파라미터, 선택 가능한 옵션 목록, 그리고 가맹점 정보(MID) 및 보안 키를 관리합니다. 헤더의 애플리케이션 선택에 따라 데이터가 필터링되며, `settingsStore`를 통해 관리됩니다.

### 3.2. Interface Settings (인터페이스 설정)

사용자 가시성 제어를 위한 사이드바 메뉴 및 대시보드 위젯 설정입니다.

* **상세 문서**: [Interface_Settings_Detail.md](file:///d:/MY_PROJECT/my_study_svelte/prompting/page/settings/interface/Interface_Settings_Detail.md)
* **주요 기능**:
  * **Sidebar**: 메뉴 항목(Report, Issue, Endpoint 등) 표시 토글.
  * **Dashboard**: 위젯(Stats, Recent Activity) 표시 토글.

### 3.3. Application Settings (애플리케이션 관리)

> [!NOTE]
> 자세한 내용은 **[Application_Settings_Detail.md](application/Application_Settings_Detail.md)** 문서를 참조하십시오.

애플리케이션의 메타데이터와 환경 정보를 정의하는 핵심 섹션입니다.

* **Application Configuration**: 새로운 애플리케이션을 등록하거나, 환경별(DEV, STG 등) 도메인 및 서비스 구조(Service Distinction)를 설정합니다.

### 3.4. Site Context (사이트 컨텍스트)

> [!NOTE]
> 자세한 내용은 **[Site_Context_Detail.md](application/Site_Context_Detail.md)** 문서를 참조하십시오.

특정 **Service** 하위에 존재하는 논리적인 단위인 **Site**를 정의하고 매핑합니다. (주로 WPAY 서비스 구조에서 활용)

---

## 4. 데이터 흐름 및 저장소 (Data Flow & Stores)

이 화면은 전적으로 **Client-Side Storage**와 **Svelte Stores**에 의존합니다.

### 4.1. Core Store: `settingsStore`

80:
81: ***역할**: 설정 데이터의 **Create, Read, Update, Delete (CRUD)**를 담당합니다.
82:* **지속성 (Persistence)**: 데이터 성격에 따라 분리된 `localStorage` 키를 사용합니다.
83: ***Storage Keys & Structure**:
84:* `settings_store`:
85:     *`endpoint_parameters`: Global Params, Options, MID Context, Site Context.
86:* `interface`: Sidebar, Dashboard, Bookmarks 설정.
87:     *`applications`: Application 및 Service 설정.
88:* `api_categories`: API 카테고리 데이터 독립 저장.
89:   * `api_collections`: API 컬렉션 데이터 독립 저장.

### 4.2. Helper Stores

* **`profileStore`**:
  * Global Parameter나 MID Context 추가 시, **대상 애플리케이션 목록**을 제공하는 용도로 사용됩니다 (`$profileStore.myApplications`). 이는 사용자가 본인의 프로필에 등록한 앱에 대해서만 설정을 관리하도록 유도합니다.
* **`appStateStore`**:
  * 헤더의 **Selected Application** 상태를 감지하여, 리스트 필터링(예: MID Context 리스트에서 특정 앱 데이터만 보기)에 활용됩니다.

### 4.3. Google Drive 백업 (Backup & Restore)

* **UI 위치**: Settings 화면 우측 상단 헤더 영역에 **Backup** 및 **Restore** 버튼이 제공됩니다.
* **기능**:
  * **Backup**: 현재 로컬의 `settingsStore` 전체 데이터를 `settings.json` 파일로 구글 드라이브에 업로드합니다.
  * **Restore**: 구글 드라이브의 `settings.json` 파일을 다운로드하여 로컬 설정을 덮어씌웁니다.
* **인증**: 구글 로그인이 되어있지 않은 경우, 버튼 클릭 시 로그인 팝업이 호출됩니다.

---

## 5. UI 개발 가이드 (Development Notes)

* **Multi-Select Component**: `MultiSelectBox.svelte` 컴포넌트가 Service 선택 등 다중 선택이 필요한 곳에 공통적으로 사용됩니다.
* **Validation**:
  * 필수 필드(App Name, Service 등) 누락 시 버튼이 `disabled` 처리됩니다.
  * Service Distinction 사용 시 최소 1개 이상의 서비스가 등록되어야 경고 메시지가 사라집니다.
* **UX/UI Themes**:
  * Tailwind CSS 기반의 Dark Mode가 완벽하게 지원됩니다. (`bg-slate-50` vs `dark:bg-background-dark` 등)
