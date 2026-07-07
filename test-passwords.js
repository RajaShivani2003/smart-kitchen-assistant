var bcrypt = require('bcryptjs');
var mysql = require('mysql2/promise');

var pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'smart_kitchen',
});

pool.getConnection().then(function(conn) {
  return conn.query('SELECT id, email, password FROM users');
}).then(function(rows) {
  var users = rows[0];
  console.log('Found ' + users.length + ' users:');
  users.forEach(function(u) {
    console.log('\nEmail: ' + u.email);
    console.log('Hash: ' + u.password);
    
    // Test common passwords
    var candidates = ['password123', 'admin123', 'password', '123456', 'test123', 'abc123', 'Hello@123', 'Hemanth@123', 'Test@12345'];
    candidates.forEach(function(pw) {
      if (bcrypt.compareSync(pw, u.password)) {
        console.log('MATCH FOUND: password = "' + pw + '"');
      }
    });
  });
  conn.release();
  pool.end();
}).catch(function(e) {
  console.error(e.message);
  pool.end();
});
