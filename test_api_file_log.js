const http = require('http');
const fs = require('fs');

function log(msg) {
    fs.appendFileSync('server_test_log.txt', msg + '\n');
}

log('Script started at ' + new Date().toISOString());

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

log('Sending request...');
const req = http.request(options, (res) => {
    log(`Status: ${res.statusCode}`);
    let body = '';
    res.on('data', (d) => {
        body += d;
    });
    res.on('end', () => {
        log('Body: ' + body);
    });
});

req.on('error', (error) => {
    log('Request Error: ' + error.message);
});

req.write(data);
req.end();
log('Request sent.');
