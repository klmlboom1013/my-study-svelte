---
description: IDE Startup Checklist Automation
---

This workflow executes the startup routine defined in the project's checklist.

1. **언어 설정.**
   Gemini와 대화 메시지는 기본 언어를 한국어로 세팅 한다.
   Gemini가 작성하는 task, plan, walkthrough 리뷰 내용을 한국어로 보여줄 수 있도록 언어 설정을 한국어로 한다.

2. **github 동기화.**
  "git fetch -p" 명령어를 수행하고 업데이트 사항이 있는 확인 후 "git pull" 명령어를 실행여부를 물어본다 (y/n)
  - y: origin remote repository 버전으로 동기화를 진행한다.
  - n: origin remote repository 버전으로 동기화를 진행하지 않는다.

3. **package.json 변경사항 확인.**
  package.json 파일이 변경된 경우 모듈 설치 또는 업데이트 진행 여부를 물어본다 (y/n)
  - y: 추가 또는 변경된 모듈을 설치한다.
  - n: 추가 또는 변경된 모듈을 설치하지 않는다.

4. **프로젝트 소스코드 오류 체크.**
  프로젝트 소스코드 변경사항이 있으면 "npm run check" 진행 여부를 물어본다. (y/n)
  - y: 프로젝트 소스코드 오류를 체크한다.
  - n: 프로젝트 소스코드 오류를 체크하지 않는다.
