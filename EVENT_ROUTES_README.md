# Event Routes API

Frontend handoff for `csvloaderbackend/routes/eventRoutes.js`.

## Base URL

All routes are mounted under:

```txt
/api/events
```

## Event Types

Valid `type` values:

```ts
type UsageEventType =
  | "APP_START"
  | "FILE_UPLOAD"
  | "CONVERT_DASKE"
  | "APP_PRINT_START"
  | "PRINT_LABEL"
  | "PRINT_ALL_LABEL"
  | "APP_START_FLEXIJET"
  | "CONVERT_S3D_FLEXIJET"
  | "APP_START_CIX"
  | "UPLOAD_CIX";
```

## Auth

These routes require an internal API key:

- `GET /api/events/usage/by-license-name`
- `GET /api/events/usage/events/by-license-name`
- `GET /api/events/license/by-device`

Required header:

```txt
x-internal-api-key: <INTERNAL_API_KEY>
```

Do not expose this key in a public browser frontend. Use a backend/admin proxy if this UI is public.

Current CORS config does not include `x-internal-api-key` in `allowedHeaders`, so direct browser calls to protected routes may fail preflight until backend CORS is updated.

## 1. Create Event

```txt
POST /api/events/create_event
```

Auth: none.

### Request Body

```ts
{
  deviceId: string;
  type: UsageEventType;
  meta?: any;
}
```

### Success Response

Status: `201`

```ts
{
  message: "Event recorded";
  event: {
    _id: string;
    deviceId: string;
    type: UsageEventType;
    date: string;
    meta?: any;
  };
}
```

### Error Responses

```ts
400 { message: "deviceId and type are required" }
400 { message: "Invalid type. Allowed: ..." }
500 { message: "Error while creating event", error: string }
```

### Example

```ts
await fetch("/api/events/create_event", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    deviceId: machineId,
    type: "APP_START",
    meta: { appVersion: "1.0.0" },
  }),
});
```

## 2. Usage Summary By License Name

```txt
GET /api/events/usage/by-license-name
```

Auth: `x-internal-api-key` required.

### Query Params

```ts
{
  name: string;                 // required
  from?: string;                // date parseable by JS Date, preferably ISO
  to?: string;                  // date parseable by JS Date, preferably ISO
  type?: UsageEventType;
  exactName?: "true" | "false"; // default false
}
```

Behavior:

- `exactName=true` uses exact license name matching.
- Otherwise, `name` is matched as a case-insensitive partial license name.
- `appStartCount` only counts `APP_START` events.

### Success Response

Status: `200`

```ts
{
  filter: {
    name: string;
    type: UsageEventType | null;
    from: string | null;
    to: string | null;
  };
  summary: {
    totalLicenses: number;
    totalLicensesWithEvents: number;
    totalEvents: number;
    totalAppStarts: number;
  };
  data: Array<{
    licenseId: string;
    name: string;
    license: string;
    machineId: string | null;
    type_of_licence: string | null;
    active: boolean;
    licenseUsed: boolean;
    totalEvents: number;
    appStartCount: number;
    firstEventDate: string | null;
    lastEventDate: string | null;
    eventTypes: Array<{
      type: UsageEventType;
      count: number;
    }>;
  }>;
}
```

### Error Responses

```ts
400 { message: "Query param 'name' is required" }
400 { message: "Invalid from date format" }
400 { message: "Invalid to date format" }
400 { message: "Invalid type. Allowed: ..." }
401 { message: "Unauthorized" }
500 { message: "INTERNAL_API_KEY is not configured" }
500 { message: "Error while fetching usage by license name", error: string }
```

### Example

```ts
await fetch(
  "/api/events/usage/by-license-name?name=Acme&from=2026-01-01&to=2026-06-03",
  {
    headers: { "x-internal-api-key": internalApiKey },
  }
);
```

## 3. Paginated Usage Events By License Name

```txt
GET /api/events/usage/events/by-license-name
```

Auth: `x-internal-api-key` required.

### Query Params

```ts
{
  name: string;                 // required
  from?: string;
  to?: string;
  type?: UsageEventType;
  exactName?: "true" | "false";
  page?: number;                // default 1
  limit?: number;               // default 50, max 500
}
```

Results are sorted by `date` descending.

### Success Response

Status: `200`

```ts
{
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: Array<{
    eventId: string;
    deviceId: string;
    type: UsageEventType;
    date: string;
    meta?: any;
    licenses: Array<{
      licenseId: string;
      name: string;
      license: string;
      type_of_licence: string | null;
      active: boolean;
      licenseUsed: boolean;
    }>;
  }>;
}
```

### Error Responses

```ts
400 { message: "Query param 'name' is required" }
400 { message: "Invalid from date format" }
400 { message: "Invalid to date format" }
400 { message: "Invalid type. Allowed: ..." }
401 { message: "Unauthorized" }
500 { message: "INTERNAL_API_KEY is not configured" }
500 { message: "Error while fetching usage events by license name", error: string }
```

### Example

```ts
await fetch(
  "/api/events/usage/events/by-license-name?name=Acme&page=1&limit=100&type=APP_START",
  {
    headers: { "x-internal-api-key": internalApiKey },
  }
);
```

## 4. License Info By Device

```txt
GET /api/events/license/by-device
```

Auth: `x-internal-api-key` required.

### Query Params

```ts
{
  deviceId: string;         // required
  type_of_licence?: string; // optional preferred license type
}
```

If `type_of_licence` is provided, the backend first tries to find a license matching both `machineId` and `type_of_licence`. If that is not found, it falls back to the first license matching only `machineId`.

### Success Response When Found

Status: `200`

```ts
{
  found: true;
  data: {
    name: string | null;
    deviceId: string | null;
    type_of_licence: string | null;
    license: string | null;
    active: boolean;
    licenseUsed: boolean;
  };
}
```

### Success Response When Not Found

Status: `200`

```ts
{
  found: false;
  data: null;
}
```

### Error Responses

```ts
400 { message: "Query param 'deviceId' is required" }
401 { message: "Unauthorized" }
500 { message: "INTERNAL_API_KEY is not configured" }
500 { message: "Error while fetching license info by device id", error: string }
```

### Example

```ts
await fetch(
  "/api/events/license/by-device?deviceId=DEVICE123&type_of_licence=quicknest",
  {
    headers: { "x-internal-api-key": internalApiKey },
  }
);
```
