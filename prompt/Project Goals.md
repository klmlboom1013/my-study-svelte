<aside>
💡

my_stydu_svelte 프로젝트의 목표와 구성 간략하게 기술 한다.

</aside>

## Development Environment

- Svelte
- TailwindCSS
- Vite
- Node.js
- npm

## Web Page Objectives

### 1. Sign-in Page

- Main Page로 이동하기위해 Sign-up 또는 Sign-in을 수행 한다.
- Sign-up 또는 Sign-in 수행을 통해 accessToken을 획득 한다.
- path: prompt/pages/signin/signin-page.md

#### 1.1. feature
- Sign-up
  - WPAY 서비스 회원가입을 수행 한다.
  - path: prompt/pages/signin/features/signup.md

- Check account availability `Sign-in STEP01`
  - WPAY 서비스 회원가입 여부를 확인 한다.
  - path: prompt/pages/signin/features/signin-step1.md

- PIN Authentication `Sign-in STEP02`
  - WPAY PIN 인증을 통해 본인여부를 증명 한다.
  - path: prompt/pages/signin/features/signin-step2.md


### 2. Main Page
- 로그인 상태 확인를 확인 한다.
  - Cookie에서 accessToken 값 확인.
  - accessToken이 없으면 로그인 페이지로 이동
  - accessToken이 있으면 유효성을 검증 한다.
    - expiresAt이 현재 시간보다 이전이면 accessToken이 유효하지 않음.
    - sgn이 유효하지 않으면 accessToken이 유효하지 않음.
- path: prompt/pages/main/page_ui_guide_main.md


## External API

- 외부 통신을 위한 API를 정의 한다.

### WPAY
- path: prompt/external/service-wpay/wpay_development_guide.md