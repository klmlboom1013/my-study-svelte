<aside>
💡

프로젝트 웹페이지 UI 공통 STYLE을 정의 한다.
(소스코드 기준 현행화 됨)

</aside>

## Theme Colors (src/app.css)

- **Brand Primary**: `oklch(0.36 0.11 265.06)` (사용처: 주요 테두리, 텍스트, 활성 버튼 배경 등)
- **Brand Hover**: `oklch(0.49 0.23 262.62)` (사용처: 호버 시 배경/텍스트)
- **UI Inactive**: `oklch(0.83 0 0)` (사용처: 비활성 상태 배경/테두리, 오류 메시지 등)
- **UI Hint**: `oklch(0.75 0.04 262.99)` (사용처: Placeholder)
- **Text Message**: `oklch(44.6% 0.03 256.802)` (사용처: 모달 본문 등 일반 텍스트)
- **Text White**: `oklch(1 0 0)` (사용처: 활성 버튼 텍스트, 모달 헤더 텍스트)

---

#### Button (`Button.svelte`)

- **공통**:
  - 패딩: `px-4 py-2` (약 1rem width, 0.5rem height padding)
  - 둥글기: `rounded-md` (0.375rem)
  - 폰트: `font-medium` (500)
  - 테두리 두께: `border-2`
  - 트랜지션: `transition-colors`

- **상태: 활성 (Active)**
  - 배경: Brand Primary
  - 텍스트: Text White
  - 테두리 색상: Brand Primary
  - **Hover / Active**: 배경 Brand Hover

- **상태: 비활성 (Disabled)**
  - 배경: UI Inactive
  - 텍스트: Text White
  - 테두리 색상: UI Inactive
  - 커서: `cursor-not-allowed`

#### Dropdown Input (`DropdownInput.svelte`)

- **컨테이너 (Input)**
  - 너비: `w-full`
  - 테두리: `border-2`
    - 기본: Brand Primary
    - 에러: `border-red-500`
  - 둥글기: `rounded-md`
  - 패딩: `py-2 pl-3 pr-10`
  - 텍스트: `text-base font-medium`
    - 색상: Brand Primary
  - Placeholder: UI Hint
  - Focus: `ring-2 ring-brand-primary/20`
  - 아이콘 (Chevron): 오른쪽 정렬, Brand Primary (Hover: Brand Hover)

- **드롭다운 메뉴 (List)**
  - 배경: `bg-white`
  - 테두리: `border-2 border-brand-primary`
  - 둥글기: `rounded-md`
  - 그림자: `shadow-lg`
  - **아이템**:
    - 패딩: `px-3 py-2`
    - 텍스트: Brand Primary, `font-medium`
    - Hover: `bg-brand-primary/10`

#### Input Box (`Input.svelte`)

- **공통**:
  - 패딩: `px-3 py-2`
  - 테두리: `border-2`
    - 색상: Brand Primary
  - 둥글기: `rounded-md`
  - 텍스트: Brand Primary
  - Placeholder: UI Hint

- **Focus**:
  - `ring-2 ring-brand-primary`

- **Disabled**:
  - 배경: UI Inactive
  - 텍스트: Text White
  - 테두리: UI Inactive

#### Modal (`Modal.svelte`)

- **오버레이 (Backdrop)**
  - 배경: `bg-black/50`
  - 정렬: 중앙 정렬 (`flex items-center justify-center`)

- **컨테이너**
  - 배경: `bg-white`
  - 둥글기: `rounded-xl`
  - 그림자: `shadow-2xl`
  - 너비: 기본 `max-w-md` (설정 가능)

- **헤더**
  - 배경: Brand Primary
  - 패딩: `px-6 py-4`
  - 텍스트: Text White
  - 타이틀: `text-xl font-bold`
  - 닫기 버튼: 아이콘 White, Hover시 `bg-white/10`

- **본문 (Body)**
  - 패딩: `p-6`
  - 텍스트: Text Message, `text-base font-medium`

#### Radio Button (`RadioGroup.svelte`)

- **Variant: Default (원형)**
  - 정렬: `flex gap-4` (가로/세로 설정 가능)
  - **Input (Circle)**:
    - 크기: `w-5 h-5`
    - 테두리: `border-2 border-brand-primary`
    - 둥글기: `rounded-full`
    - Checked: 배경 Brand Primary, 내부 Dot White
    - Error: `border-red-500` (Checked: `bg-red-500`)
  - **Label**:
    - 텍스트: Brand Primary (Hover: Brand Hover), `font-medium text-base`
    - Error: `text-red-500`

- **Variant: Box (네모 버튼형)**
  - 너비: `w-full` (항목별 `flex-1`)
  - **Container**:
    - 패딩: `px-4 py-2`
    - 테두리: `border-2`
    - 둥글기: `rounded-lg`
    - 텍스트: `text-sm font-medium`
    - 정렬: 중앙 정렬 (`flex items-center justify-center`)
  - **상태**:
    - **기본**: 테두리 Brand Primary, 텍스트 `text-gray-700`
    - **Hover**: `hover:bg-gray-50`
    - **Checked**: 배경 Brand Primary, 텍스트 White, 테두리 Brand Primary
      - Checked Hover: `bg-brand-hover`
    - **Error**: 테두리/텍스트 `red-500`
