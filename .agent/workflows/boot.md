---
description: Project Server Run
---

// turbo-all

This workflow executes Project Server Run.

1. **5137 port가 현재 사용 중인지 확인**
   5137 포트가 사용 중인 경우 PID를 찾아서 KILL 한다.

2. **Server Run**
   "npm run dev --open" 명령어를 수행 한다.