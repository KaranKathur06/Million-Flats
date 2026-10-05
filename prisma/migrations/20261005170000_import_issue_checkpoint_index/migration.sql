CREATE INDEX "import_issues_analysis_checkpoint_idx"
ON "import_issues" ("batch_id", "record_id", "stage", "resolution_state");
