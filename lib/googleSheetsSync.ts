import { DailyRecord, Task, TaskGroup } from '../types';
import { ScheduleBlock } from '../components/DailyPlanner';
import { getUnsyncedRecords, markRecordsSynced } from './dailyRecordDB';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID_KEY = 'debugme-sheet-id';
const TOKEN_KEY = 'debugme-google-token';

export function storeGoogleToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

async function sheetsRequest(url: string, token: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Ensure a named sheet tab exists, create if missing
async function ensureSheet(sheetId: string, token: string, sheetTitle: string) {
  try {
    const info = await sheetsRequest(`${SHEETS_API}/${sheetId}?fields=sheets.properties.title`, token);
    const exists = info.sheets?.some((s: any) => s.properties?.title === sheetTitle);
    if (exists) return;
  } catch { /* ignore, will try to create */ }

  await sheetsRequest(`${SHEETS_API}/${sheetId}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: sheetTitle } } }],
    }),
  });
}

async function getOrCreateSpreadsheet(token: string): Promise<string> {
  const storedId = localStorage.getItem(SHEET_ID_KEY);
  if (storedId) {
    try {
      await sheetsRequest(`${SHEETS_API}/${storedId}?fields=spreadsheetId`, token);
      return storedId;
    } catch {
      localStorage.removeItem(SHEET_ID_KEY);
    }
  }

  // Create new spreadsheet with all sheets
  const data = await sheetsRequest(SHEETS_API, token, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: 'Debug-Me — ข้อมูลส่วนตัว' },
      sheets: [
        { properties: { title: 'Records', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Tasks', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Schedule', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Groups', gridProperties: { frozenRowCount: 1 } } },
      ],
    }),
  });

  const sheetId = data.spreadsheetId;
  localStorage.setItem(SHEET_ID_KEY, sheetId);

  // Add header rows for all sheets
  await sheetsRequest(
    `${SHEETS_API}/${sheetId}/values:batchUpdate`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [
          { range: 'Records!A1:J1', values: [['ID', 'Date', 'Task', 'Category', 'Completed', 'Completed At', 'Time Start', 'Time End', 'Notes', 'Attachments']] },
          { range: 'Tasks!A1:I1', values: [['ID', 'Title', 'Description', 'Priority', 'Completed', 'Due Date', 'Category', 'Recurring', 'Notes']] },
          { range: 'Schedule!A1:I1', values: [['Start Hour', 'Start Min', 'End Hour', 'End Min', 'Title', 'Subtitle', 'Color', 'Icon', 'Recurring']] },
          { range: 'Groups!A1:F1', values: [['Key', 'Label', 'Emoji', 'Color', 'Icon', 'Size']] },
        ],
      }),
    },
  );

  return sheetId;
}

function recordToRow(r: DailyRecord): string[] {
  return [
    r.id, r.date, r.taskTitle, r.category,
    r.completed ? 'Yes' : 'No', r.completedAt || '',
    r.timeStart || '', r.timeEnd || '', r.notes || '',
    r.attachments?.length ? r.attachments.map(a => `[${a.type}] ${a.label}`).join('; ') : '',
  ];
}

function taskToRow(t: Task): string[] {
  return [
    t.id, t.title, t.description, t.priority,
    t.completed ? 'Yes' : 'No', t.dueDate, t.category,
    t.recurring || '', t.notes || '',
  ];
}

function scheduleToRow(b: ScheduleBlock): string[] {
  return [
    String(b.startHour), String(b.startMin), String(b.endHour), String(b.endMin),
    b.title, b.subtitle || '', b.color, b.icon, b.recurring || '',
  ];
}

function groupToRow(g: TaskGroup): string[] {
  return [g.key, g.label, g.emoji, g.color, g.icon, String(g.size)];
}

// Clear a sheet range (except header row) and overwrite with new data
async function overwriteSheet(sheetId: string, token: string, sheetTitle: string, headerRange: string, rows: string[][]) {
  await ensureSheet(sheetId, token, sheetTitle);

  // Clear existing data (keep header)
  try {
    await sheetsRequest(
      `${SHEETS_API}/${sheetId}/values/${sheetTitle}!A2:Z10000:clear`,
      token,
      { method: 'POST', body: JSON.stringify({}) },
    );
  } catch { /* sheet may be empty */ }

  if (rows.length === 0) return;

  // Write new data
  const lastCol = String.fromCharCode(64 + rows[0].length); // A=65
  await sheetsRequest(
    `${SHEETS_API}/${sheetId}/values/${sheetTitle}!A2:${lastCol}${rows.length + 1}?valueInputOption=RAW`,
    token,
    { method: 'PUT', body: JSON.stringify({ values: rows }) },
  );
}

export interface SyncAllData {
  tasks: Task[];
  schedule: ScheduleBlock[];
  groups: TaskGroup[];
}

export async function syncToGoogleSheets(
  token: string,
  allData?: SyncAllData,
): Promise<{ synced: number; sheetUrl: string }> {
  const sheetId = await getOrCreateSpreadsheet(token);
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
  let totalSynced = 0;

  // 1) Sync daily records (append new ones)
  const unsynced = await getUnsyncedRecords();
  if (unsynced.length > 0) {
    await ensureSheet(sheetId, token, 'Records');
    const rows = unsynced.map(recordToRow);
    await sheetsRequest(
      `${SHEETS_API}/${sheetId}/values/Records!A:J:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      token,
      { method: 'POST', body: JSON.stringify({ values: rows }) },
    );
    await markRecordsSynced(unsynced.map(r => r.id));
    totalSynced += unsynced.length;
  }

  // 2) Overwrite personal data sheets (Tasks, Schedule, Groups)
  if (allData) {
    await overwriteSheet(sheetId, token, 'Tasks', 'Tasks!A1:I1', allData.tasks.map(taskToRow));
    await overwriteSheet(sheetId, token, 'Schedule', 'Schedule!A1:I1', allData.schedule.map(scheduleToRow));
    await overwriteSheet(sheetId, token, 'Groups', 'Groups!A1:F1', allData.groups.map(groupToRow));
    totalSynced += 1; // count as 1 "config sync"
  }

  return { synced: totalSynced, sheetUrl };
}

export function getSheetUrl(): string | null {
  const id = localStorage.getItem(SHEET_ID_KEY);
  return id ? `https://docs.google.com/spreadsheets/d/${id}` : null;
}
