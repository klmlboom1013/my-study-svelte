<aside>
💡

wpay 서비스에서 사용하는 주요 타입 및 상수 정의를 기술 한다.
(소스코드 기준 현행화 됨: `src/lib/constants/wpayServerType.ts`)

</aside>

## Server Type

- **SERVER_TYPES**
  - `DEV`: 개발 서버
  - `STG`: 스테이징 서버
  - `PROD`: 운영 서버

## Prod Server Domain

- **PROD_SERVER_DOMAINS**
  - `GLB`: GLB Domain
  - `KS`: KS Domain
  - `FC`: FC Domain

## Service

- **SERVICE_OPTIONS**
  - `wpaystd`
  - `wpaystd2`
  - `wpaypro`
  - `wpayplus`
  - `wpaycst`

## Site

- **SITE_OPTIONS**
  - `stdwpay`
  - `kbstar`
  - `gspay`
  - `ygypay`

## Merchant ID

- **MERCHANT_ID_OPTIONS**
  - `INIwpayT03`
  - `GSpayTS003`
  - `yogiyopay1`

## Mappings

### Service to Site Mapping (`SERVICE_SITE_MAPPING`)

서비스(`ServiceType`)에 따라 선택 가능한 사이트(`SiteType`) 목록을 정의한다.

| Service | Available Sites |
| :--- | :--- |
| `wpaystd` | `stdwpay` |
| `wpaystd2` | `stdwpay` |
| `wpaypro` | `ygypay` |
| `wpayplus` | `stdwpay`, `kbstar`, `gspay` |
| `wpaycst` | `kbstar`, `gspay` |

### Site to Merchant ID Mapping (`SITE_MERCHANT_ID_MAPPING`)

사이트(`SiteType`)에 따라 선택 가능한 가맹점 ID(`MerchantIdType`) 목록을 정의한다.

| Site | Available Merchant IDs |
| :--- | :--- |
| `stdwpay` | `INIwpayT03` |
| `gspay` | `GSpayTS003` |
| `ygypay` | `yogiyopay1` |
| `kbstar` | (없음) |
