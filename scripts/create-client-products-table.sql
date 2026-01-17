-- Create client_products table for manual product assignments
CREATE TABLE IF NOT EXISTS client_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  monthly_price DECIMAL, -- Override price (null = use product default)
  notes TEXT,
  assigned_by UUID, -- Profile ID of admin who assigned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, product_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_products_client_id ON client_products(client_id);

-- Add monthly_price column if table already exists but column doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_products' AND column_name = 'monthly_price'
  ) THEN
    ALTER TABLE client_products ADD COLUMN monthly_price DECIMAL;
  END IF;
END $$;
