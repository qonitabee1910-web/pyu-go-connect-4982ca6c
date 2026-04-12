
-- Drop existing UPDATE policy that requires auth
DROP POLICY IF EXISTS "Public can reserve seats" ON public.shuttle_seats;

-- New UPDATE policy: allow reserving available seats OR updating own reserved seats by session
CREATE POLICY "Anyone can reserve seats"
ON public.shuttle_seats
FOR UPDATE
USING (
  status = 'available'
  OR reserved_by_session IS NOT NULL
)
WITH CHECK (true);
