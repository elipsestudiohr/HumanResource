import handler from '../api/test-push.js';

async function test() {
  const req = {};
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('Status Code:', this.statusCode || 200);
      console.log('Response JSON:', data);
    }
  };

  await handler(req, res);
}

test();
