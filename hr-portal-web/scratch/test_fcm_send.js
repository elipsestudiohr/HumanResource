const apiKey = 'AIzaSyBcI4EGIhu_BUlnKW9QiFZg_G_GnrQ27bg';

async function testFCM() {
  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${apiKey}`
      },
      body: JSON.stringify({
        registration_ids: ['dummy_token_for_test'],
        notification: {
          title: 'Test Title',
          body: 'Test Message'
        }
      })
    });

    const text = await res.text();
    console.log('FCM API response status:', res.status, 'text:', text);
  } catch (err) {
    console.error('FCM API error:', err);
  }
}

testFCM();
