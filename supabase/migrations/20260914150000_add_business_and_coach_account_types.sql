-- Add business and coach account types for NIL brands and team coaches.
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'business';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'coach';
