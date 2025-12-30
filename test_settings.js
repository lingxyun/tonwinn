
async function checkSettings() {
    try {
        const res = await fetch('http://localhost:3001/api/settings');
        console.log('Status:', res.status);
        if (res.ok) {
            const data = await res.json();
            console.log('Data:', data);
        } else {
            console.log('Error:', await res.text());
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}
checkSettings();
