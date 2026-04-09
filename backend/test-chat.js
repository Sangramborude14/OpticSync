async function testChat() {
  const url = 'http://localhost:5001/api/chat';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'What is eyes strain?' }],
      context: { strain: 50, blinkRate: 15, status: 'Active', posture: 'Good' }
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

testChat().catch(console.error);
