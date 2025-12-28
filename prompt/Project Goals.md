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

### 2. Main Page
- JWT accessToken을 확인 한다.
  - accessToken 유효성 검증 실패 시 sign-in 페이지로 이동 한다.
  - accessToken이 유효하다면 Main Page 유지.
- path: prompt/pages/main/main-page.md
- sign-out 시 sign-in 페이지로 이동 한다.
  - JWT accessToken을 삭제 한다.

## External API

- 외부 통신을 위한 API를 정의 한다.

### WPAY
- path: prompt/external/service-wpay/wpay_development_guide.md