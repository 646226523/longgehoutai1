import fs from 'fs';

type SqlValue = number | string | Uint8Array | null;
type SqlJsDb = any;

let SQL: any = null;
let initPromise: Promise<void> | null = null;

export async function initSQL(): Promise<void> {
  if (SQL) return;
  if (!initPromise) {
    initPromise = (async () => {
      const mod: any = await import('sql.js');
      const initSqlJs = mod.default ?? mod;
      SQL = await initSqlJs();
    })();
  }
  await initPromise;
}

function ensureInit(): void {
  if (!SQL) {
    throw new Error(
      'sql.js 尚未初始化, 请先调用 initSQL() 完成数据库初始化'
    );
  }
}

function isNamedParamObj(obj: unknown): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

function processParams(
  sql: string,
  params: unknown[]
): { sql: string; params: SqlValue[] } {
  if (params.length === 1 && isNamedParamObj(params[0])) {
    const obj = params[0];
    const newParams: SqlValue[] = [];
    const newSql = sql.replace(/@(\w+)/g, (_match, key: string) => {
      const val = obj[key];
      newParams.push(val as SqlValue);
      return '?';
    });
    return { sql: newSql, params: newParams };
  }
  return { sql, params: params as SqlValue[] };
}

function rowsToObjects(columns: string[], values: SqlValue[][]): any[] {
  return values.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export class Statement {
  private _db: SqlJsDb;
  private _owner: Database;
  private _sql: string;
  private _boundParams?: unknown[];

  constructor(db: SqlJsDb, owner: Database, sql: string) {
    this._db = db;
    this._owner = owner;
    this._sql = sql;
  }

  run(...params: unknown[]): { lastInsertRowid: number; changes: number } {
    const effectiveParams =
      this._boundParams !== undefined ? this._boundParams : params;
    const { sql, params: processedParams } = processParams(
      this._sql,
      effectiveParams
    );
    this._db.run(
      sql,
      processedParams.length > 0 ? processedParams : undefined
    );
    const rowIdResult = this._db.exec('SELECT last_insert_rowid() as id');
    const lastInsertRowid =
      (rowIdResult[0]?.values?.[0]?.[0] as number) ?? 0;
    const changes = this._db.getRowsModified();
    this._owner._onWrite();
    return { lastInsertRowid, changes };
  }

  get(...params: unknown[]): any | undefined {
    const effectiveParams =
      this._boundParams !== undefined ? this._boundParams : params;
    const { sql, params: processedParams } = processParams(
      this._sql,
      effectiveParams
    );
    const result = this._db.exec(
      sql,
      processedParams.length > 0 ? processedParams : undefined
    );
    if (!result[0]?.values || result[0].values.length === 0)
      return undefined;
    return rowsToObjects(result[0].columns, [result[0].values[0]])[0];
  }

  all(...params: unknown[]): any[] {
    const effectiveParams =
      this._boundParams !== undefined ? this._boundParams : params;
    const { sql, params: processedParams } = processParams(
      this._sql,
      effectiveParams
    );
    const result = this._db.exec(
      sql,
      processedParams.length > 0 ? processedParams : undefined
    );
    if (!result[0]?.values) return [];
    return rowsToObjects(result[0].columns, result[0].values);
  }

  bind(...params: unknown[]): Statement {
    const newStmt = new Statement(this._db, this._owner, this._sql);
    newStmt._boundParams = params;
    return newStmt;
  }
}

export class Database {
  private _db: SqlJsDb;
  private _filePath: string;
  private _autoSave = true;

  constructor(filePath: string) {
    ensureInit();
    this._filePath = filePath;
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath);
      if (fileData.length > 0) {
        const uint8 = new Uint8Array(fileData);
        this._db = new SQL.Database(uint8);
      } else {
        this._db = new SQL.Database();
      }
    } else {
      this._db = new SQL.Database();
    }
  }

  pragma(sql: string): void {
    try {
      if (
        sql.toLowerCase().includes('journal_mode') &&
        sql.toLowerCase().includes('wal')
      ) {
        this._db.run('PRAGMA journal_mode = DELETE');
      } else {
        this._db.run(`PRAGMA ${sql}`);
      }
    } catch {
      // sql.js 可能不支持某些 PRAGMA, 忽略即可
    }
  }

  exec(sql: string): void {
    this._db.exec(sql);
    if (this._autoSave) {
      this._save();
    }
  }

  prepare(sql: string): Statement {
    return new Statement(this._db, this, sql);
  }

  transaction(fn: (...args: any[]) => any): (...args: any[]) => any {
    return (...args: any[]) => {
      const prevAutoSave = this._autoSave;
      this._autoSave = false;
      this._db.run('BEGIN');
      try {
        const result = fn(...args);
        this._db.run('COMMIT');
        this._autoSave = prevAutoSave;
        this._save();
        return result;
      } catch (e) {
        this._db.run('ROLLBACK');
        this._autoSave = prevAutoSave;
        throw e;
      }
    };
  }

  _onWrite(): void {
    if (this._autoSave) {
      this._save();
    }
  }

  private _save(): void {
    const data = this._db.export();
    fs.writeFileSync(this._filePath, Buffer.from(data));
  }
}