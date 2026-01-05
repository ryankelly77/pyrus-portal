-- Pyrus Portal Database Schema
-- Single-tenant for Pyrus Digital
-- Run this in Supabase SQL Editor

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'client')),
  client_id UUID, -- For client users, links to their client record
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENTS (businesses being served)
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  avatar_url TEXT,
  growth_stage TEXT CHECK (growth_stage IN ('seed', 'sprout', 'bloom', 'harvest')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'churned', 'prospect')),
  monthly_spend DECIMAL(10,2) DEFAULT 0,
  start_date DATE,
  highlevel_id TEXT,
  basecamp_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for profiles.client_id after clients table exists
ALTER TABLE profiles
ADD CONSTRAINT fk_profiles_client
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- ============================================
-- PRODUCTS
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,
  category TEXT NOT NULL CHECK (category IN ('root', 'growth', 'cultivation')),
  monthly_price DECIMAL(10,2),
  onetime_price DECIMAL(10,2),
  stripe_product_id TEXT,
  stripe_monthly_price_id TEXT,
  stripe_onetime_price_id TEXT,
  supports_quantity BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'inactive')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCT DEPENDENCIES
-- ============================================
CREATE TABLE product_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  requires_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(product_id, requires_product_id)
);

-- ============================================
-- BUNDLES
-- ============================================
CREATE TABLE bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2),
  onetime_price DECIMAL(10,2),
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BUNDLE PRODUCTS (junction table)
-- ============================================
CREATE TABLE bundle_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(bundle_id, product_id)
);

-- ============================================
-- ADD-ONS (smaller bundles)
-- ============================================
CREATE TABLE addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADD-ON PRODUCTS (junction table)
-- ============================================
CREATE TABLE addon_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(addon_id, product_id)
);

-- ============================================
-- REWARD TIERS
-- ============================================
CREATE TABLE reward_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  monthly_threshold DECIMAL(10,2) NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  coupon_code TEXT,
  free_product_slots INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FREE PRODUCTS CONFIGURATION
-- ============================================
CREATE TABLE free_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('always_free', 'slot_eligible')),
  UNIQUE(product_id, type)
);

-- ============================================
-- RECOMMENDATIONS
-- ============================================
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined')),
  pricing_type TEXT CHECK (pricing_type IN ('monthly', 'quarterly', 'annual')),
  total_monthly DECIMAL(10,2),
  total_onetime DECIMAL(10,2),
  discount_applied DECIMAL(5,2) DEFAULT 0,
  reward_tier_id UUID REFERENCES reward_tiers(id),
  notes TEXT,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RECOMMENDATION ITEMS
-- ============================================
CREATE TABLE recommendation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  bundle_id UUID REFERENCES bundles(id),
  addon_id UUID REFERENCES addons(id),
  quantity INTEGER DEFAULT 1,
  monthly_price DECIMAL(10,2),
  onetime_price DECIMAL(10,2),
  is_free BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (product_id IS NOT NULL AND bundle_id IS NULL AND addon_id IS NULL) OR
    (product_id IS NULL AND bundle_id IS NOT NULL AND addon_id IS NULL) OR
    (product_id IS NULL AND bundle_id IS NULL AND addon_id IS NOT NULL)
  )
);

-- ============================================
-- CONTENT
-- ============================================
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('blog', 'social', 'email', 'landing_page', 'other')),
  body TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'revision_requested', 'approved', 'published', 'rejected')),
  author_id UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  due_date DATE,
  published_at TIMESTAMPTZ,
  basecamp_todo_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTENT REVISIONS
-- ============================================
CREATE TABLE content_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  revision_notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTENT COMMENTS
-- ============================================
CREATE TABLE content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')),
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS (Stripe sync)
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT CHECK (status IN ('active', 'past_due', 'canceled', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  monthly_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTION ITEMS
-- ============================================
CREATE TABLE subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  bundle_id UUID REFERENCES bundles(id),
  stripe_subscription_item_id TEXT,
  quantity INTEGER DEFAULT 1,
  unit_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REVENUE RECORDS (MRR tracking)
-- ============================================
CREATE TABLE revenue_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  mrr DECIMAL(10,2) NOT NULL,
  arr DECIMAL(10,2),
  change_type TEXT,
  change_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, month)
);

-- ============================================
-- SETTINGS
-- ============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROLE PERMISSIONS
-- ============================================
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  UNIQUE(role, permission)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_client_id ON profiles(client_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_growth_stage ON clients(growth_stage);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_bundles_status ON bundles(status);
CREATE INDEX idx_addons_status ON addons(status);
CREATE INDEX idx_recommendations_client_id ON recommendations(client_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);
CREATE INDEX idx_content_client_id ON content(client_id);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_assigned_to ON content(assigned_to);
CREATE INDEX idx_activity_log_client_id ON activity_log(client_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX idx_revenue_records_client_id ON revenue_records(client_id);
CREATE INDEX idx_revenue_records_month ON revenue_records(month);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Profiles: Users can read their own, admins can read all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Clients: Admins can manage all, clients see their own
CREATE POLICY "Admins can manage clients"
  ON clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Clients can view own client record"
  ON clients FOR SELECT
  USING (
    id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Products: Everyone can view active, super_admin can manage
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (
    status = 'active' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Product dependencies: Same as products
CREATE POLICY "Anyone can view product dependencies"
  ON product_dependencies FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admins can manage product dependencies"
  ON product_dependencies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Bundles: Same as products
CREATE POLICY "Anyone can view active bundles"
  ON bundles FOR SELECT
  USING (
    status = 'active' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can manage bundles"
  ON bundles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Bundle products: Same as bundles
CREATE POLICY "Anyone can view bundle products"
  ON bundle_products FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admins can manage bundle products"
  ON bundle_products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Add-ons: Same as products
CREATE POLICY "Anyone can view active addons"
  ON addons FOR SELECT
  USING (
    status = 'active' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can manage addons"
  ON addons FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Add-on products: Same as addons
CREATE POLICY "Anyone can view addon products"
  ON addon_products FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admins can manage addon products"
  ON addon_products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Reward tiers: Everyone can view, super_admin can manage
CREATE POLICY "Anyone can view reward tiers"
  ON reward_tiers FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admins can manage reward tiers"
  ON reward_tiers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Free products: Same as reward tiers
CREATE POLICY "Anyone can view free products"
  ON free_products FOR SELECT
  USING (TRUE);

CREATE POLICY "Super admins can manage free products"
  ON free_products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Recommendations: Admins can manage, clients can view their own
CREATE POLICY "Admins can manage recommendations"
  ON recommendations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Clients can view own recommendations"
  ON recommendations FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Recommendation items: Same as recommendations
CREATE POLICY "Admins can manage recommendation items"
  ON recommendation_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Clients can view own recommendation items"
  ON recommendation_items FOR SELECT
  USING (
    recommendation_id IN (
      SELECT id FROM recommendations
      WHERE client_id IN (
        SELECT client_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Content: Admins can manage, clients can view/update their own
CREATE POLICY "Admins can manage content"
  ON content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Clients can view own content"
  ON content FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Clients can update own content"
  ON content FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Content revisions: Same as content
CREATE POLICY "Admins can manage content revisions"
  ON content_revisions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Clients can view own content revisions"
  ON content_revisions FOR SELECT
  USING (
    content_id IN (
      SELECT id FROM content
      WHERE client_id IN (
        SELECT client_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Content comments: Admins see all, clients see non-internal on their content
CREATE POLICY "Admins can manage content comments"
  ON content_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Clients can view non-internal comments on own content"
  ON content_comments FOR SELECT
  USING (
    is_internal = FALSE AND
    content_id IN (
      SELECT id FROM content
      WHERE client_id IN (
        SELECT client_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Clients can add comments on own content"
  ON content_comments FOR INSERT
  WITH CHECK (
    content_id IN (
      SELECT id FROM content
      WHERE client_id IN (
        SELECT client_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Activity log: Admins see all, clients see their own
CREATE POLICY "Admins can view all activity"
  ON activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can insert activity"
  ON activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Clients can view own activity"
  ON activity_log FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Notifications: Users see their own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Subscriptions: Admins can manage, clients can view their own
CREATE POLICY "Admins can manage subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Clients can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Subscription items: Same as subscriptions
CREATE POLICY "Admins can manage subscription items"
  ON subscription_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Clients can view own subscription items"
  ON subscription_items FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions
      WHERE client_id IN (
        SELECT client_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Revenue records: Admins only
CREATE POLICY "Admins can manage revenue records"
  ON revenue_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Settings: Super admins only
CREATE POLICY "Super admins can manage settings"
  ON settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Role permissions: Super admins only
CREATE POLICY "Super admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Admins can view role permissions"
  ON role_permissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addons_updated_at
  BEFORE UPDATE ON addons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_tiers_updated_at
  BEFORE UPDATE ON reward_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PROFILE CREATION TRIGGER
-- Auto-create profile when user signs up
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
