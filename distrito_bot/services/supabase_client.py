"""
services/supabase_client.py
Adaptador a Neon DB. Reemplaza el cliente de Supabase por un query builder de psycopg2
para mantener compatibilidad sin reescribir consultas.
"""
import psycopg2
import psycopg2.extras
import json
import os
from config.settings import settings

class APIResponse:
    def __init__(self, data):
        self.data = data

class QueryBuilder:
    def __init__(self, table_name, conn):
        self.table_name = table_name
        self.conn = conn
        self._action = "select"
        self._columns = "*"
        self._where = []
        self._params = []
        self._limit = None
        self._order = None
        self._insert_data = None
        self._update_data = None
        self._delete = False
        self._single = False
        
    def select(self, columns="*"):
        self._action = "select"
        self._columns = columns
        return self
        
    def insert(self, data):
        self._action = "insert"
        self._insert_data = data
        return self
        
    def update(self, data):
        self._action = "update"
        self._update_data = data
        return self
        
    def delete(self):
        self._action = "delete"
        self._delete = True
        return self
        
    def upsert(self, data, on_conflict="id"):
        self._action = "upsert"
        self._insert_data = data
        self._on_conflict = on_conflict
        return self
        
    def eq(self, column, value):
        self._where.append(f'"{column}" = %s')
        self._params.append(value)
        return self

    def gte(self, column, value):
        self._where.append(f'"{column}" >= %s')
        self._params.append(value)
        return self

    def lte(self, column, value):
        self._where.append(f'"{column}" <= %s')
        self._params.append(value)
        return self
        
    def in_(self, column, values):
        if not values:
            self._where.append('1 = 0')
        else:
            placeholders = ", ".join(["%s"] * len(values))
            self._where.append(f'"{column}" IN ({placeholders})')
            self._params.extend(values)
        return self
        
    def limit(self, count):
        self._limit = count
        return self
        
    def order(self, column, desc=False):
        dir = "DESC" if desc else "ASC"
        self._order = f'"{column}" {dir}'
        return self
        
    def single(self):
        self._single = True
        return self
        
    def execute(self):
        cursor = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        result_data = []
        
        try:
            if self._action == "select":
                query = f'SELECT {self._columns} FROM public."{self.table_name}"'
                if self._where:
                    query += " WHERE " + " AND ".join(self._where)
                if self._order:
                    query += f" ORDER BY {self._order}"
                if self._limit:
                    query += f" LIMIT {self._limit}"
                
                cursor.execute(query, tuple(self._params))
                result_data = cursor.fetchall()
                result_data = [dict(r) for r in result_data]
                
            elif self._action == "insert":
                if isinstance(self._insert_data, list):
                    items = self._insert_data
                else:
                    items = [self._insert_data]
                    
                if not items:
                    return APIResponse([])
                    
                cols = list(items[0].keys())
                col_names = ", ".join([f'"{c}"' for c in cols])
                placeholders = ", ".join(["%s"] * len(cols))
                
                query = f'INSERT INTO public."{self.table_name}" ({col_names}) VALUES ({placeholders}) RETURNING *'
                
                for item in items:
                    vals = [json.dumps(item[c]) if isinstance(item[c], (dict, list)) else item[c] for c in cols]
                    cursor.execute(query, tuple(vals))
                    res = cursor.fetchone()
                    if res:
                        result_data.append(dict(res))
                self.conn.commit()
                
            elif self._action == "update":
                cols = list(self._update_data.keys())
                set_clause = ", ".join([f'"{c}" = %s' for c in cols])
                vals = [json.dumps(self._update_data[c]) if isinstance(self._update_data[c], (dict, list)) else self._update_data[c] for c in cols]
                
                query = f'UPDATE public."{self.table_name}" SET {set_clause}'
                if self._where:
                    query += " WHERE " + " AND ".join(self._where)
                query += " RETURNING *"
                
                cursor.execute(query, tuple(vals + self._params))
                result_data = cursor.fetchall()
                result_data = [dict(r) for r in result_data]
                self.conn.commit()
                
            elif self._action == "delete":
                query = f'DELETE FROM public."{self.table_name}"'
                if self._where:
                    query += " WHERE " + " AND ".join(self._where)
                query += " RETURNING *"
                
                cursor.execute(query, tuple(self._params))
                result_data = cursor.fetchall()
                result_data = [dict(r) for r in result_data]
                self.conn.commit()
                
            elif self._action == "upsert":
                if isinstance(self._insert_data, list):
                    items = self._insert_data
                else:
                    items = [self._insert_data]
                    
                if not items:
                    return APIResponse([])
                    
                cols = list(items[0].keys())
                col_names = ", ".join([f'"{c}"' for c in cols])
                placeholders = ", ".join(["%s"] * len(cols))
                
                update_set = ", ".join([f'"{c}" = EXCLUDED."{c}"' for c in cols if c != self._on_conflict])
                
                query = f'INSERT INTO public."{self.table_name}" ({col_names}) VALUES ({placeholders})'
                if self._on_conflict and update_set:
                    query += f' ON CONFLICT ("{self._on_conflict}") DO UPDATE SET {update_set}'
                else:
                    query += ' ON CONFLICT DO NOTHING'
                    
                query += " RETURNING *"
                
                for item in items:
                    vals = [json.dumps(item[c]) if isinstance(item[c], (dict, list)) else item[c] for c in cols]
                    cursor.execute(query, tuple(vals))
                    res = cursor.fetchone()
                    if res:
                        result_data.append(dict(res))
                self.conn.commit()

        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
            
        if self._single:
            if not result_data:
                return APIResponse(None)
            return APIResponse(result_data[0])
            
        return APIResponse(result_data)


class FakeSupabaseClient:
    def __init__(self, neon_url):
        self.conn = psycopg2.connect(neon_url)
        self.conn.autocommit = True
        
    def table(self, table_name):
        return QueryBuilder(table_name, self.conn)

_client = None

def get_supabase():
    global _client
    if _client is None:
        neon_url = os.environ.get("DATABASE_URL", "postgresql://neondb_owner:npg_pClfKMJxI0a7@ep-round-lake-at22joot-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require")
        _client = FakeSupabaseClient(neon_url)
    return _client
