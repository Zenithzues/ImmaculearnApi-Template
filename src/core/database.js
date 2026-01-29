import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
});

export { connection }


// import mysql from 'mysql2/promise';

// const connection = mysql.createPool({
//   host: process.env.MYSQLHOST,
//   user: process.env.MYSQLUSER,
//   password: process.env.MYSQLPASSWORD,
//   database: process.env.MYSQLDATABASE,
//   port: process.env.MYSQLPORT || 3306,
  
//   // Pool configuration (optional - adjust based on your needs)
//   // waitForConnections: true,
//   // connectionLimit: 10,           // Maximum number of connections in pool
//   // queueLimit: 0,        
//   // idleTimeout: 60000,         // Maximum number of connection requests the pool will queue
//   // // acquireTimeout: 60000,         // Timeout for acquiring a connection (ms)
//   // // timeout: 60000,                // Timeout for connections (ms)
// });

// export { connection };