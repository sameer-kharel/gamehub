const http = require('http');

const data = JSON.stringify({
    name: 'PS4-ViaHTTP'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/consoles',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

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
    console.error(error);
});

req.write(data);
req.end();
