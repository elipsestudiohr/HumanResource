import handler from '../api/send-push.js';

async function testServerless() {
  const req = {
    method: 'POST',
    body: {
      targetUserId: 'test-uuid-12345',
      title: 'Test Title',
      message: 'Test Message'
    }
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('Serverless Handler Result:', this.statusCode, data);
    }
  };

  await handler(req, res);
}

testServerless();
