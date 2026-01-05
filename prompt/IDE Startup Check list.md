## IDE Startup Check list

<aside>
💡

Antigravity가 실행되고 my-study-svelte 프로젝트가 load 되면 Gemini AI Agent가 수행해야하는 일정한 일련의 작업을 기술한다.

1번부터 순서대로 처리 한다.

</aside>

### 1. 언어 설정

- Gemini Agent가 사용할 언어를 한국어로 설정한다.
- Gemini Agent가 작성한 Task, Plan, Walkthrough 언어를 한국어로 설정한다.

### 2. 프로젝트 동기화

- git origin remote repository와 local repository의 버전을 확인한다.
- git origin remote repository가 local repository보다 최신 버전이라면,
  - origin remote repository 버전으로 동기화 진행 여부를 물어본다. (y/n)
    - y: origin remote repository 버전으로 동기화를 진행한다.
    - n: origin remote repository 버전으로 동기화를 진행하지 않는다.

### 3. package.json 파일이 업데이트 확인

- package.json 파일 변경 이력이 있다면 추가 또는 변경된 모듈 설치 진행 여부를 물어본다 (y/n)
  - y: 추가 또는 변경된 모듈을 설치한다.
  - n: 추가 또는 변경된 모듈을 설치하지 않는다.

### 4. 프로젝트 소스코드 오류 체크

- 프로젝트 소스코드 오류 체크 진행 여부를 물어본다. (y/n)
  - y: 프로젝트 소스코드 오류를 체크한다.
  - n: 프로젝트 소스코드 오류를 체크하지 않는다.
