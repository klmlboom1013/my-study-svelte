# Profile Management (`/profile`)

사용자의 프로필 정보를 조회, 수정하고 Google Drive와 연동하여 데이터를 백업/복구하는 기능을 제공합니다.

## 1. Overview

* **Path**: `/profile` (View), `/profile/edit` (Edit)
* **Key Features**:
  * 사용자 기본 정보 및 테스터 정보 관리.
  * 개인별 애플리케이션 설정 관리.
  * **Google Drive Auto-Sync**: 프로필 데이터를 사용자의 Google Drive AppData 폴더에 백업 및 복구.
  * **Data Persistence**: `localStorage`와 `profileStore`를 통한 데이터 영속성 보장.

## 2. UI Structure & Components

### 2.1. Profile View (`/profile`)

프로필 정보를 조회하고 주요 액션을 수행하는 메인 화면입니다.

#### Header Section

* **Breadcrumbs**: `Home > Profile`
* **Banner**: 그라디언트 배경의 시각적 헤더.
* **Avatar**: 사용자 프로필 이미지 (설정된 URL이 없으면 기본 아이콘 표시).
* **User Identity**: `Nickname`, `Role`, `User ID` 표시.

#### Action Buttons

* **Backup (Cloud Upload)**:
  * 현재 로컬 프로필 데이터를 Google Drive에 업로드.
  * 성공 시 `Last Backup` 타임스탬프 갱신.
  * 로그인이 안 된 경우 Google 로그인 팝업 호출.
* **Restore (Cloud Download)**:
  * Google Drive에서 최신 프로필 데이터를 다운로드하여 로컬 데이터를 덮어씀.
  * 수행 전 `AlertModal`을 통해 사용자 확인 절차 거침.
  * 성공 시 페이지 리로드.
* **Edit Profile**: `/profile/edit` 페이지로 이동.

#### Info Section

* **Timestamps**: 데이터 관리 이력을 트래킹하기 위한 시간 정보 표시.
  * `Last Saved`: 마지막 로컬 저장 시간.
  * `Last Backup`: 마지막 구글 드라이브 업로드 시간.
  * `Last Restore`: 마지막 구글 드라이브 다운로드 시간.

### 2.2. Profile Edit (`/profile/edit`)

프로필 정보를 수정하는 폼 화면입니다.

#### Basic Info

* **User ID**: 수정 불가능(Read-only). 최초 로그인 시 설정된 ID.
* **Nickname**: 화면에 표시될 이름.
* **Avatar URL**: 프로필 이미지 URL.
  * **Preview**: 입력한 URL의 이미지 미리보기 제공.
  * **Refresh Button**: DiceBear API를 사용하여 랜덤 아바타 생성 기능 제공.

#### Tester Information

테스트 환경 설정 등에 사용되는 사용자 메타데이터입니다.

* **Company / Team**: 소속 정보.
* **Position / Role**: 직무 및 역할 정보.
  * Dropdown 선택 또는 'Direct Input'을 통한 직접 입력 지원.

#### My Applications

사용자가 관리 또는 테스트하는 애플리케이션 목록을 설정합니다.

* **Add App**: `settingsStore`에 정의된 애플리케이션 목록 중 선택하여 추가.
* **App Name**: 선택 시 기본 `Description` 등이 자동 입력됨.
* **Remove**: 등록된 애플리케이션 삭제.

## 3. Data Management & Logic

### 3.1. Data Persistence

* **Local Storage**:
  * **Key**: `profile`
  * **Structure**: `ProfileData` 객체 전체 (JSON).
  * **Synchronization**: `profileStore` (`src/lib/stores/profileStore.ts`)를 통해 `localStorage`와 Svelte Store 상태가 항상 동기화됩니다.
  * **Initialization**: 앱 실행(`onMount`) 시 `localStorage`에서 데이터를 로드하여 Store를 초기화합니다.

* **Google Drive Sync**:
  * **FileName**: `profile.json`
  * **Trigger**: 사용자가 프로필 화면에서 'Backup' 또는 'Restore' 버튼 클릭 시 `driveService`를 통해 수행.
  * **Structure**: `ProfileData` 객체 전체.

### 3.2. Google Integration Logic

`src/routes/(app)/profile/+page.svelte` 내 `executeWithRetry` 함수를 통해 처리됩니다.

1. **Token Check**: `authStore`의 Access Token 확인.
2. **Auto Login**: 토큰이 없거나 만료(401 Error)된 경우, 자동으로 `loginWithGoogle`을 호출하여 새 토큰을 발급받고 작업을 재시도합니다.
3. **Operations**:
    * **Backup**: `driveService.saveProfile(token, data)`
    * **Restore**: `driveService.loadProfile(token)`

### 3.3. Data Schema (`ProfileData`)

```typescript
interface ProfileData {
    id: string;
    saveDateTime?: string;   // 로컬 저장 시간
    backupDateTime?: string; // 클라우드 백업 시간
    restoreDateTime?: string;// 클라우드 복구 시간
    
    basicInfo: {
        userId: string;
        nickname: string;
        avatarUrl: string;
    };
    
    testerInformation: {
        company: string;
        team: string;
        position: string; // e.g., Manager, Leader
        role: string;     // e.g., Developer, PM
    };
    
    myApplications: {
        id: string;
        appName: string;
        description: string;
        useServiceDistinction?: boolean;
        // ... domains & services settings
    }[];
}
```

### 3.4. Application Management Logic ("Add App")

"My Applications"에 앱을 추가할 때의 데이터 흐름과 로직입니다.

1. **Data Source**: `settingsStore` (`src/lib/stores/settingsStore.ts`)
    * 전역 애플리케이션 설정은 `localStorage`의 `settings_store` 키에 저장되어 관리됩니다.
    * `Profile Edit` 페이지는 `$settingsStore.applications`를 구독하여 "App Name" 선택 옵션(Dropdown)을 구성합니다.

2. **Add & Copy Process**:
    * 사용자가 "Add App"을 클릭하면 빈 항목이 추가됩니다.
    * Dropdown에서 특정 **App Name**을 선택하면, `updateApplication` 함수가 실행됩니다.
    * 선택된 앱의 원본 설정(`settingsStore`)에서 다음 필드들을 **복사(Snapshot)**하여 프로필 데이터로 가져옵니다:
        * `description`: 앱 설명.
        * `useServiceDistinction`: 서비스 분리 여부 설정.
        * `domains`: 환경별 도메인 정보 (Dev, Stg, Prod 등).
        * `services`: 하위 서비스 목록 및 각 서비스별 도메인 정보.
    * **Reasoning**: "My Application"은 사용자가 해당 시점에 설정한 앱의 구성을 '가져와서' 사용하는 개념이므로, 참조(Reference)가 아닌 복사(Copy) 방식을 사용합니다. 이후 원본 설정이 바뀌더라도 사용자의 프로필 설정은 유지될 수 있습니다 (구현 의도 추정).

### 3.5. Legacy Data Migration

기존 로그인 방식(`sign-in-page`)에서 새로운 프로필 체계(`profile`)로 전환하기 위한 로직을 포함합니다.

* **Initialization Flow**:
    1. 앱 시작 시 `localStorage`의 `profile` 키를 확인합니다.
    2. 데이터가 없으면 `sign-in-page` 키(Legacy)를 확인합니다.
    3. `sign-in-page` 데이터가 존재하면, 이를 파싱하여 `userId` 등을 추출하고 **메모리 상의 Store 상태만 초기화**합니다.
    4. 사용자가 프로필 편집 화면에서 **'Save Profile'을 클릭하는 시점**에 `profile` 키로 새로운 데이터 구조가 영구 저장됩니다.

### 3.6. External Services

* **Avatar Generation**: [DiceBear API](https://www.dicebear.com) (Avataaars)
  * **Endpoint**: `https://api.dicebear.com/9.x/avataaars/svg?seed={random_string}`
  * **Usage**: 사용자가 'Refresh' 버튼 클릭 시 난수를 생성하여 위 URL을 호출, 새로운 아바타 이미지를 받아옵니다.
