
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','student');
CREATE TYPE public.submission_status AS ENUM ('pending','approved','rejected');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  fullname TEXT NOT NULL DEFAULT 'Unnamed',
  email TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  faculty TEXT,
  major TEXT,
  semester INT,
  bio TEXT,
  avatar TEXT,
  total_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- SKILLS
CREATE TABLE public.skills (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  proof_file TEXT,
  status submission_status NOT NULL DEFAULT 'pending',
  point INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;

-- CERTIFICATES
CREATE TABLE public.certificates (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Local',
  proof_file TEXT,
  status submission_status NOT NULL DEFAULT 'pending',
  point INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

-- PORTFOLIO
CREATE TABLE public.portfolio (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_link TEXT,
  image TEXT,
  category TEXT NOT NULL DEFAULT 'Personal',
  status submission_status NOT NULL DEFAULT 'pending',
  point INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio TO authenticated;
GRANT ALL ON public.portfolio TO service_role;

-- REWARDS
CREATE TABLE public.rewards (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  required_points INT NOT NULL DEFAULT 0,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;

-- REWARD CLAIMS
CREATE TABLE public.reward_claims (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_claims TO authenticated;
GRANT ALL ON public.reward_claims TO service_role;

-- OPPORTUNITIES
CREATE TABLE public.opportunities (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT,
  description TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;

-- POINT DERIVATION TRIGGERS
CREATE OR REPLACE FUNCTION public.derive_certificate_point()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.point := CASE lower(NEW.level)
    WHEN 'local' THEN 1
    WHEN 'regional' THEN 3
    WHEN 'national' THEN 5
    WHEN 'international' THEN 10
    ELSE 1 END;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_certificate_point BEFORE INSERT OR UPDATE OF level ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.derive_certificate_point();

CREATE OR REPLACE FUNCTION public.derive_portfolio_point()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.point := CASE lower(NEW.category)
    WHEN 'personal' THEN 2
    WHEN 'freelance' THEN 5
    WHEN 'industry' THEN 8
    WHEN 'competition' THEN 10
    WHEN 'competition winner' THEN 10
    ELSE 2 END;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_portfolio_point BEFORE INSERT OR UPDATE OF category ON public.portfolio
FOR EACH ROW EXECUTE FUNCTION public.derive_portfolio_point();

-- POINT AWARD TRIGGER (shared)
CREATE OR REPLACE FUNCTION public.handle_point_award()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
      UPDATE public.profiles SET total_points = total_points + NEW.point WHERE id = NEW.user_id;
    ELSIF OLD.status = 'approved' AND NEW.status IS DISTINCT FROM 'approved' THEN
      UPDATE public.profiles SET total_points = GREATEST(0, total_points - OLD.point) WHERE id = NEW.user_id;
    END IF;
  ELSIF (TG_OP = 'INSERT') THEN
    IF NEW.status = 'approved' THEN
      UPDATE public.profiles SET total_points = total_points + NEW.point WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_skills_award AFTER INSERT OR UPDATE ON public.skills
FOR EACH ROW EXECUTE FUNCTION public.handle_point_award();
CREATE TRIGGER trg_certificates_award AFTER INSERT OR UPDATE ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.handle_point_award();
CREATE TRIGGER trg_portfolio_award AFTER INSERT OR UPDATE ON public.portfolio
FOR EACH ROW EXECUTE FUNCTION public.handle_point_award();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile or admin" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own roles or admin" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin manage roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills viewable" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own skill" ON public.skills FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own skill or admin" ON public.skills FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Delete own skill or admin" ON public.skills FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Certs viewable" ON public.certificates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own cert" ON public.certificates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own cert or admin" ON public.certificates FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Delete own cert or admin" ON public.certificates FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio viewable" ON public.portfolio FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own portfolio" ON public.portfolio FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own portfolio or admin" ON public.portfolio FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Delete own portfolio or admin" ON public.portfolio FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards viewable" ON public.rewards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage rewards ins" ON public.rewards FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage rewards upd" ON public.rewards FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage rewards del" ON public.rewards FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own claims or admin" ON public.reward_claims FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own claim" ON public.reward_claims FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin update claim" ON public.reward_claims FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Delete own claim or admin" ON public.reward_claims FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opportunities viewable" ON public.opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage opp ins" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage opp upd" ON public.opportunities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage opp del" ON public.opportunities FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
