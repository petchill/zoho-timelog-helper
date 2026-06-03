const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com";
const ZOHO_API_BASE = "https://projectsapi.zoho.com/restapi";
const ZOHO_API_V3 = "https://projects.zoho.com/api/v3";

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    scope:
      "ZohoProjects.timesheets.ALL,ZohoProjects.projects.READ,ZohoProjects.tasks.READ",
    client_id: process.env.ZOHO_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.ZOHO_REDIRECT_URI!,
    access_type: "offline",
  });
  return `${ZOHO_ACCOUNTS_URL}/oauth/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      redirect_uri: process.env.ZOHO_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

export async function getAccessToken(): Promise<string> {
  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Failed to refresh access token: " + JSON.stringify(data));
  }
  return data.access_token;
}

async function zohoFetch(path: string, options?: RequestInit) {
  const token = await getAccessToken();
  const portalId = process.env.ZOHO_PORTAL_ID!;
  const res = await fetch(`${ZOHO_API_BASE}/portal/${portalId}${path}`, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  return res.json();
}

async function zohoV3Fetch(path: string, options?: RequestInit, portalId?: string) {
  const token = await getAccessToken();
  const pid = portalId ?? process.env.ZOHO_PORTAL_ID!;
  const url = `${ZOHO_API_V3}/portal/${pid}${path}`;
  console.log("[zohoV3Fetch]", options?.method ?? "GET", url);
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  return res.json();
}

export async function getProjects() {
  return zohoFetch("/projects/");
}

export async function getTasksForProject(projectId: string) {
  const userId = process.env.ZOHO_USER_ZPUID ?? "";
  return zohoV3Fetch(
    `/projects/${projectId}/timesheet/tasks?search_offset=0&type=All&search_term=&user_id=${userId}`,
  );
}

export interface TimelogEntry {
  projectId: string;
  taskId: string;
  date: string; // YYYY-MM-DD
  hours: number;
  minutes: number;
  notes: string;
  billable: boolean;
}

export async function addTimelog(entry: TimelogEntry) {
  const { projectId, taskId, date, hours, minutes, notes, billable } = entry;
  const decimalHours =
    (hours + minutes / 60).toFixed(2).replace(/\.?0+$/, "") || "0";
  return zohoV3Fetch(
    `/projects/${projectId}/log`,
    {
      method: "POST",
      body: JSON.stringify({
        owner_zpuid: process.env.ZOHO_USER_ZPUID ?? "",
        date,
        frompage: "mytimesheetlist",
        module: { id: taskId, type: "task" },
        bill_status: billable ? "Billable" : "Non Billable",
        notes: notes ? `<div>${notes}</div>` : "<div><br></div>",
        hours: decimalHours,
        for_timer: false,
      }),
    },
    process.env.ZOHO_LOG_PORTAL_ID,
  );
}

export async function getTimelogs(
  projectId: string,
  fromDate: string,
  toDate: string,
) {
  return zohoFetch(
    `/projects/${projectId}/logs/?date=${fromDate}&date_end=${toDate}&component_type=task`,
  );
}
