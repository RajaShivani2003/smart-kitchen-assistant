var http = require('http');

var data = 'email=john@test.com&password=password&callbackUrl=/dashboard';

var options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/signin/credentials',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': data.length
  }
};

var req = http.request(options, function(res) {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  var body = '';
  res.on('data', function(chunk) { body += chunk; });
  res.on('end', function() {
    console.log('Body length:', body.length);
    if (body.length > 200) {
      console.log('First 200 chars:', body.substring(0, 200));
    } else {
      console.log('Body:', body);
    }
  });
});

req.on('error', function(e) {
  console.error('Request error:', e.message);
});

req.write(data);
req.end();
