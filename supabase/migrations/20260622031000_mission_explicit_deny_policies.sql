-- Document RPC-only mission content with explicit deny policies.
CREATE POLICY learning_missions_rpc_only ON public.learning_missions FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY mission_steps_rpc_only ON public.mission_steps FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY mission_options_rpc_only ON public.mission_options FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
