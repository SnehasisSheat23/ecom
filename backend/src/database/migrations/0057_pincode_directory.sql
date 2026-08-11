-- Create pincode_directory table for all 19,000+ Indian pincodes
CREATE TABLE IF NOT EXISTS pincode_directory (
  pincode VARCHAR(10) PRIMARY KEY,
  district VARCHAR(255) NOT NULL,
  state_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS pincode_dir_district_idx ON pincode_directory(district);
CREATE INDEX IF NOT EXISTS pincode_dir_state_idx ON pincode_directory(state_name);
