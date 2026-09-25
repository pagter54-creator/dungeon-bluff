alter role authenticator set statement_timeout = '8s';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
notify pgrst;
