const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get Supabase connection details from local config
const getSupabaseDetails = () => {
  try {
    const output = execSync('supabase status --output json').toString();
    const status = JSON.parse(output);
    return {
      host: status.project.db_host,
      port: status.project.db_port,
      user: status.project.db_user,
      password: status.project.db_password,
      database: status.project.db_name
    };
  } catch (error) {
    console.error('Failed to get Supabase details:', error.message);
    process.exit(1);
  }
};

// Run the SQL file against Supabase
const runSqlFile = (filePath, connectionDetails) => {
  try {
    console.log(`Running SQL file: ${filePath}`);
    
    // Use the PGPASSWORD environment variable to avoid password prompt
    const env = { ...process.env, PGPASSWORD: connectionDetails.password };
    
    // Build the psql command
    const command = `psql -h ${connectionDetails.host} -p ${connectionDetails.port} -U ${connectionDetails.user} -d ${connectionDetails.database} -f "${filePath}"`;
    
    console.log('Executing command...');
    execSync(command, { env, stdio: 'inherit' });
    
    console.log('SQL file executed successfully.');
  } catch (error) {
    console.error('Failed to run SQL file:', error.message);
    process.exit(1);
  }
};

// Main function
const main = () => {
  const sqlFilePath = path.join(__dirname, 'fix_supabase_migrations.sql');
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`SQL file not found: ${sqlFilePath}`);
    process.exit(1);
  }
  
  const connectionDetails = getSupabaseDetails();
  runSqlFile(sqlFilePath, connectionDetails);
};

main(); 