const http = require('http');

console.log('Script started...');

const data = JSON.stringify({
    name: 'PS4-ViaHTTP-IPv4'
});

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/consoles',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Sending request...');
const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let body = '';
    res.on('data', (d) => {
        body += d;
    });
    res.on('end', () => {
        console.log('Body:', body);
    });
});

req.on('error', (error) => {
    console.error('Request Error:', error);
});

req.write(data);
req.end();
console.log('Request sent.');
