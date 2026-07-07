var http = require('http');

var data = JSON.stringify({ email: 'john@test.com', password: 'password' });

var options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

var req = http.request(options, function(res) {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  var body = '';
  res.on('data', function(chunk) { body += chunk; });
  res.on('end', function() {
    console.log('Body:', body);
  });
});

req.on('error', function(e) {
  console.error('Request error:', e.message);
});

req.write(data);
req.end();
