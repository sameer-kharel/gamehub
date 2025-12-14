const http = require('http');

// 1. Create a console first to get an ID
const createData = JSON.stringify({ name: 'APITestDeleteMe' });
const createOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/consoles',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': createData.length
    }
};

const createReq = http.request(createOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Create Status:', res.statusCode);
        const responseProxy = JSON.parse(data);
        console.log('Create Response:', responseProxy);

        if (responseProxy.success) {
            const consoleId = responseProxy.data._id;
            console.log('Created Console ID:', consoleId);

            // 2. Now Delete it
            const deleteOptions = {
                hostname: 'localhost',
                port: 3000,
                path: `/api/consoles/${consoleId}`,
                method: 'DELETE'
            };

            const deleteReq = http.request(deleteOptions, (delRes) => {
                let delData = '';
                delRes.on('data', (chunk) => delData += chunk);
                delRes.on('end', () => {
                    console.log('Delete Status:', delRes.statusCode);
                    console.log('Delete Response:', delData);
                });
            });
            deleteReq.on('error', (e) => console.error('Delete Request Error:', e));
            deleteReq.end();
        }
    });
});

createReq.on('error', (error) => {
    console.error('Create Request Error:', error);
});

createReq.write(createData);
createReq.end();
