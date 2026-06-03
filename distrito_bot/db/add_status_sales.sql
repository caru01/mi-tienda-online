-- Agregar columna status a sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'preparando';

-- Actualizar antiguas
UPDATE sales SET status = 'entregado' WHERE status IS NULL;
