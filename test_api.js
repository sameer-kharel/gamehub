// using native fetch

async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/consoles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'PS4-TestScript' })
        });
        const contentType = res.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = await res.text();
        }
        console.log('Status:', res.status);
        console.log('Body:', data);
    } catch (e) {
        console.error(e);
    }
}

test();
